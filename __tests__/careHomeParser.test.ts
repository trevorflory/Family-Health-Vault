import { __resetCareObservationsDbForTests } from '../db/careObservations';
import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import { parseCareHomeLog, ingestCareHomeLogText } from '../services/careHomeLogParser';
import {
  assertDelegateScope,
  issueDelegateGrant,
  revokeDelegateGrant,
} from '../services/delegateAccess';
import {
  compileCareImpactSummary,
  recordCareImpactEvent,
} from '../services/careImpact';
import { compileDailyDigest } from '../services/digestEngine';
import { buildCareObservationBundle, exportToFHIRBundle } from '../services/interop/fhirExport';
import { flattenFhirBundle } from '../services/interop/fhirMapper';
import { assertDelegateNotProtected } from '../services/privacyGuard';
import { submitShiftHandover } from '../services/shiftHandover';
import { createVaultSyncStub } from '../services/sync/vaultSyncContract';

const SAMPLE_CARE_HOME_LOG = `
Care Home Daily Summary
Date: 2026-09-15
Resident: Dad

Weight: 78.5 kg
Ate 75% of lunch
Fluids: 400 mL
Blood pressure: 128/82
Medications given: yes
Mood: Mild confusion in the evening, otherwise calm
`;

const NOW = new Date('2026-09-15T07:00:00');

describe('care observations foundation', () => {
  beforeEach(() => {
    __resetCareObservationsDbForTests();
  });

  describe('careHomeLogParser', () => {
    it('extracts weight, meal %, BP pair, meds, and mood with LOINC', () => {
      const obs = parseCareHomeLog(SAMPLE_CARE_HOME_LOG, 'pt-7801', {
        now: NOW,
        caretakerId: 'facility-parser',
      });

      const weight = obs.find((o) => o.loincCode === '29463-7');
      expect(weight?.numericValue).toBe(78.5);
      expect(weight?.unit).toBe('kg');

      const meal = obs.find((o) => o.loincCode === '67520-5');
      expect(meal?.numericValue).toBe(75);

      const sys = obs.find((o) => o.loincCode === '8480-6');
      const dia = obs.find((o) => o.loincCode === '8462-4');
      expect(sys?.numericValue).toBe(128);
      expect(dia?.numericValue).toBe(82);

      expect(obs.some((o) => o.loincCode === '99595-7')).toBe(true);
      expect(obs.some((o) => o.category === 'BEHAVIOR')).toBe(true);
      expect(obs.every((o) => o.dataResidency === 'DEVICE')).toBe(true);
    });

    it('ingestCareHomeLogText attaches MedicalEvents provenance id', async () => {
      const result = await ingestCareHomeLogText(
        SAMPLE_CARE_HOME_LOG,
        'pt-7801',
        {
          now: NOW,
          saveMedicalEvent: async () => ({ id: 'me_care_fixture' }),
          saveObservations: async () => undefined,
        },
      );
      expect(result.sourceEventId).toBe('me_care_fixture');
      expect(result.observations.every((o) => o.sourceEventId === 'me_care_fixture')).toBe(
        true,
      );
    });
  });

  describe('delegate scopes & privacy', () => {
    it('allows handover and denies FOI / full chart', async () => {
      const grant = await issueDelegateGrant({
        patientId: 'pt-7801',
        recipientName: 'Jane Doe (Night Aide)',
        grantedScopes: ['LOG_HANDOVER'],
        issuedBy: DEMO_CAREGIVER_ID,
        now: NOW,
      });

      await expect(
        assertDelegateScope(grant.tokenId, 'SUBMIT_HANDOVER', NOW),
      ).resolves.toMatchObject({ tokenId: grant.tokenId });

      expect(() => assertDelegateNotProtected('READ_FOI')).toThrow(/family proxy/i);
      await expect(
        assertDelegateScope(grant.tokenId, 'READ_FOI', NOW),
      ).rejects.toThrow(/family proxy/i);
      await expect(
        assertDelegateScope(grant.tokenId, 'READ_FULL_CHART', NOW),
      ).rejects.toThrow(/family proxy/i);
    });

    it('rejects expired grants', async () => {
      const grant = await issueDelegateGrant({
        patientId: 'pt-7801',
        recipientName: 'Expired Aide',
        grantedScopes: ['LOG_HANDOVER'],
        issuedBy: DEMO_CAREGIVER_ID,
        ttlMs: 1000,
        now: NOW,
      });
      await revokeDelegateGrant(grant.tokenId, NOW);
      await expect(
        assertDelegateScope(grant.tokenId, 'SUBMIT_HANDOVER', NOW),
      ).rejects.toThrow(/inactive or expired/i);
    });
  });

  describe('shift handover → digest', () => {
    it('surfaces recent handover on daily digest', async () => {
      const grant = await issueDelegateGrant({
        patientId: 'pt-7801',
        recipientName: 'Night Aide',
        grantedScopes: ['LOG_HANDOVER'],
        issuedBy: DEMO_CAREGIVER_ID,
        now: NOW,
      });

      await submitShiftHandover(
        {
          tokenId: grant.tokenId,
          medsVerified: true,
          intakeSummary: 'Ate 80% dinner; 350 mL fluids',
          moodBehaviorSummary: 'Settled after supper',
          tellTheFamily: 'Ask about hearing aid batteries',
          mealPercent: 80,
          now: NOW,
        },
        { caregiverId: DEMO_CAREGIVER_ID },
      );

      const digest = await compileDailyDigest(DEMO_CAREGIVER_ID, NOW, {
        listRecentHandoversForPatient: async (patientId) => {
          if (patientId !== 'pt-7801') return [];
          const { listRecentHandoverSummaries } = await import(
            '../services/shiftHandover'
          );
          return listRecentHandoverSummaries(patientId, NOW);
        },
      });

      const dad = digest.sections.find((s) => s.dependant.patientId === 'pt-7801')!;
      expect(dad.recentHandovers?.length).toBeGreaterThanOrEqual(1);
      expect(dad.recentHandovers?.[0]?.performerLabel).toBe('Night Aide');
      expect(dad.recentHandovers?.[0]?.medsVerified).toBe(true);
    });
  });

  describe('FHIR export', () => {
    it('builds Bundle with Observation LOINC and round-trips flatten', () => {
      const obs = parseCareHomeLog(SAMPLE_CARE_HOME_LOG, 'pt-7801', {
        now: NOW,
        status: 'CONFIRMED',
      });
      const bundle = buildCareObservationBundle({
        patientId: 'pt-7801',
        observations: obs,
        now: NOW,
      });
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      const resources = flattenFhirBundle(bundle);
      const observations = resources.filter((r) => r.resourceType === 'Observation');
      expect(observations.length).toBeGreaterThanOrEqual(4);
      const weight = observations.find(
        (r) =>
          r.resourceType === 'Observation' &&
          r.code?.coding?.some((c) => c.code === '29463-7'),
      );
      expect(weight).toBeTruthy();
      if (weight && weight.resourceType === 'Observation') {
        expect(weight.valueQuantity?.value).toBe(78.5);
      }
    });

    it('exportToFHIRBundle loads persisted observations', async () => {
      const grant = await issueDelegateGrant({
        patientId: 'pt-7801',
        recipientName: 'Aide',
        grantedScopes: ['LOG_HANDOVER'],
        issuedBy: DEMO_CAREGIVER_ID,
        now: NOW,
      });
      await submitShiftHandover({
        tokenId: grant.tokenId,
        medsVerified: true,
        intakeSummary: 'OK intake',
        moodBehaviorSummary: 'Calm',
        weightKg: 77,
        now: NOW,
      });
      const bundle = await exportToFHIRBundle('pt-7801', { now: NOW });
      expect(bundle.entry?.length).toBeGreaterThan(0);
    });
  });

  describe('care impact', () => {
    it('increments SaMD-safe coordination counters', async () => {
      await recordCareImpactEvent({
        type: 'SBAR_EXPORTED',
        caregiverId: DEMO_CAREGIVER_ID,
        patientId: 'pt-7801',
        at: NOW,
      });
      await recordCareImpactEvent({
        type: 'SHIFT_HANDOVER_RECORDED',
        caregiverId: DEMO_CAREGIVER_ID,
        patientId: 'pt-7801',
        at: NOW,
      });
      const summary = await compileCareImpactSummary({
        caregiverId: DEMO_CAREGIVER_ID,
        now: NOW,
      });
      expect(summary.counts.some((c) => c.type === 'SBAR_EXPORTED' && c.count === 1)).toBe(
        true,
      );
      expect(summary.headline).toMatch(/coordination/i);
      expect(summary.counts.every((c) => !/blood panel|tax dollar|diagnos/i.test(c.copy))).toBe(
        true,
      );
    });
  });

  describe('vault sync stub', () => {
    it('refuses plaintext push (local-first)', async () => {
      const sync = createVaultSyncStub();
      const result = await sync.pushEncrypted({
        ciphertextBase64: 'deadbeef',
        region: 'northamerica-northeast1',
        payloadKind: 'E2EE_JSON',
        keyId: 'device-key-1',
        createdAtISO: NOW.toISOString(),
      });
      expect(result.accepted).toBe(false);
    });
  });
});
