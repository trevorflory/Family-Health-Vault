jest.mock('../db/medicalEvents', () => ({
  listMedicalEventsForPatient: jest.fn(async () => []),
  saveMedicalEvent: jest.fn(),
  getMedicalEventById: jest.fn(async () => null),
  findMedicalEventByExternalId: jest.fn(async () => null),
}));

import { compileBiomarkerTrends } from '../services/biomarkerTrends';
import { resolveLabCode } from '../services/labCodes';
import {
  flattenFhirBundle,
  mapFhirObservationToSaveInput,
  mapFhirResourcesToSaveInputs,
} from '../services/interop/fhirMapper';
import { buildAskVaultContext } from '../services/askVault';
import {
  decryptVaultField,
  encryptVaultField,
} from '../services/vaultCrypto';
import { getFacilityById } from '../data/healthAuthorities';
import { summarizeMedicalEvents } from '../services/sbarEngine';
import { resolveOverdueTasks } from '../services/digestOverdue';
import type { MedicalEventRecord } from '../types/db';
import type { FhirImportResource, FhirObservation } from '../types/interop';

const stamp = '2026-09-14T12:00:00.000Z';

const SHA_SAMPLE: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'sha-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    valueQuantity: { value: 54, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'sha-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    valueQuantity: { value: 7.1, unit: '%' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'sha-metformin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Metformin' },
    dosageInstruction: [{ text: '500 mg twice daily' }],
    requester: { display: 'Dr. A. Singh' },
  },
];

function portalLabEvent(): MedicalEventRecord {
  return {
    id: 'me_portal_1',
    patientId: 'pt-7801',
    kind: 'PORTAL_SCREENSHOT',
    sourceUri: null,
    rawText: 'Portal Screenshot\neGFR 55',
    parsedJson: JSON.stringify({
      documentHint: 'portal',
      labs: [
        {
          testName: 'eGFR',
          value: '55',
          units: 'mL/min/1.73m2',
          code: 'EGFR',
          loinc: '33914-3',
        },
        {
          testName: 'HbA1c',
          value: '7.2',
          units: '%',
          code: 'HBA1C',
          loinc: '4548-4',
        },
      ],
      prescriptions: [],
      parserNotes: [],
    }),
    status: 'CONFIRMED',
    sourceType: 'OCR',
    sourceAuthorityId: 'sk-sha',
    externalId: null,
    lastSyncedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

describe('digital front door Phase A/B/C helpers', () => {
  it('resolves LOINC aliases for common Canadian labs', () => {
    expect(resolveLabCode('eGFR')).toMatchObject({
      code: 'EGFR',
      loinc: '33914-3',
    });
    expect(resolveLabCode('HbA1c')?.loinc).toBe('4548-4');
  });

  it('compiles biomarker trends from portal lab events', () => {
    const series = compileBiomarkerTrends([portalLabEvent()]);
    const egfr = series.find((s) => s.code === 'EGFR');
    expect(egfr?.points[0]?.value).toBe(55);
    expect(egfr?.loinc).toBe('33914-3');
  });

  it('folds PORTAL_SCREENSHOT labs into SBAR background', () => {
    const summarized = summarizeMedicalEvents([portalLabEvent()]);
    expect(summarized.backgroundExtras.join(' ')).toMatch(/Portal screenshot/i);
    expect(summarized.backgroundExtras.join(' ')).toMatch(/eGFR/);
  });

  it('clears MISSING_LAB_UPLOAD when portal screenshot has labs', () => {
    const tasks = resolveOverdueTasks({
      fixtureTasks: [
        {
          taskId: 'missing-lab',
          kind: 'MISSING_LAB_UPLOAD',
          label: 'Missing lab',
          ageDays: 10,
        },
      ],
      foiRecords: [],
      medicalEvents: [portalLabEvent()],
      now: new Date(stamp),
    });
    expect(tasks.some((t) => t.kind === 'MISSING_LAB_UPLOAD')).toBe(false);
  });

  it('maps SHA pilot FHIR Observations into save inputs with LOINC', () => {
    const { inputs } = mapFhirResourcesToSaveInputs(SHA_SAMPLE, {
      patientId: 'pt-7801',
      authorityId: 'sk-sha',
      syncedAt: stamp,
    });
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    const egfr = inputs.find((i) => {
      if (!('labs' in i.parsed)) return false;
      return i.parsed.labs.some(
        (l: { testName?: string; code?: string }) =>
          l.testName === 'eGFR' || l.code === 'EGFR',
      );
    });
    expect(egfr?.sourceType).toBe('FHIR');
    expect(egfr?.externalId).toBe('Observation/sha-egfr-1');
    expect(flattenFhirBundle({ resourceType: 'Bundle', entry: [] })).toEqual(
      [],
    );
    const obs = SHA_SAMPLE[0] as FhirObservation;
    const single = mapFhirObservationToSaveInput(obs, {
      patientId: 'pt-7801',
      authorityId: 'sk-sha',
    });
    expect(single?.kind).toBe('LAB_RESULT');
  });

  it('exposes SHA interop metadata for the Phase B pilot', () => {
    const sha = getFacilityById('sk-sha');
    expect(sha?.interop?.syncMode).toBe('FILE_IMPORT');
    expect(sha?.interop?.portalLabel).toMatch(/MySask/i);
  });

  it('builds ask-my-vault citations from confirmed events', () => {
    const { citations, context } = buildAskVaultContext([portalLabEvent()]);
    expect(citations[0]?.eventId).toBe('me_portal_1');
    expect(context).toContain('me_portal_1');
  });

  it('round-trips vault field encryption', async () => {
    const token = await encryptVaultField('PHN-SECRET-123');
    expect(token.startsWith('EPv1.')).toBe(true);
    await expect(decryptVaultField(token)).resolves.toBe('PHN-SECRET-123');
  });
});
