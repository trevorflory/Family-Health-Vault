import {
  DomainError,
  DEMO_WALLET_PRO_ENTITLEMENT,
} from '@family-health-vault/shared';
import { EHR_PLAYBOOKS } from '../data/ehrPlaybooks';
import {
  createEmptyLtcMemoryDb,
  resetLtcMemoryDb,
  getLtcMemoryDb,
} from '../server/src/db';
import { createPointClickCareConnector } from '../server/src/ingestion/connectors/pointClickCare';
import { createMeditechExpanseConnector } from '../server/src/ingestion/connectors/meditechExpanse';
import { ingestEnvelopes } from '../server/src/ingestion/normalizer';
import { pollEhrFacility } from '../server/src/ingestion/workers/pollScheduler';
import { receiveEhrWebhook } from '../server/src/ingestion/workers/webhookReceiver';
import { getFamilyFeed } from '../server/src/routes/familyFeed';
import { onboardFacilityEhr } from '../server/src/routes/facilityOnboarding';
import { tlsOnlyMiddleware } from '../server/src/middleware/tlsOnly';
import { residencyGuardMiddleware } from '../server/src/middleware/residencyGuard';
import {
  mapEhrContactToAccess,
  applyEhrConsentFlags,
} from '../services/ehr/poaScopeMap';
import {
  grantConsent,
  resetConsents,
  requireConsent,
} from '../db/consentRegistry';
import {
  buildEncryptedSyncEnvelope,
  pushEncryptedIfConsented,
} from '../services/ehr/encryptSync';
import {
  enableSandboxWalletPro,
  resetDeviceWalletPlan,
  guardPaidFeature,
} from '../services/walletEntitlements';
import { decidePaywall } from '../services/walletPaywall';

const PRIMARY = '11111111-1111-4111-8111-111111111111';
const SECONDARY = '22222222-2222-4222-8222-222222222222';

describe('LTC EHR ingestion + POA + paid wallet', () => {
  beforeEach(() => {
    resetLtcMemoryDb();
    resetConsents();
    resetDeviceWalletPlan();
  });

  it('documents honest EHR playbooks (no fake live marketplace)', () => {
    expect(EHR_PLAYBOOKS.find((p) => p.vendor === 'POINTCLICKCARE')?.writeBack).toBe(
      false,
    );
    expect(
      EHR_PLAYBOOKS.find((p) => p.vendor === 'MEDITECH_EXPANSE')?.readiness,
    ).toBe('NOT_LIVE');
  });

  it('runs PCC fixture poll into memory db (read-only)', async () => {
    const db = getLtcMemoryDb();
    const result = await onboardFacilityEhr(db, {
      facilityName: 'Demo LTC',
      jurisdiction: 'ON',
      vendor: 'POINTCLICKCARE',
      externalFacilityId: 'pcc-facility-demo-01',
    });
    expect(result.ingested).toBeGreaterThan(0);
    expect(db.medication_records.length).toBeGreaterThan(0);
    expect(db.poa_scopes.length).toBe(2);
    const connector = createPointClickCareConnector();
    expect(() => connector.writeBack()).toThrow(DomainError);
  });

  it('rejects write-back and keeps MEDITECH not live', async () => {
    const meditech = createMeditechExpanseConnector();
    const auth = await meditech.authenticateFacility('x');
    expect(auth.ok).toBe(false);
    expect(() => meditech.writeBack()).toThrow(/read-only/i);
  });

  it('maps EHR contacts to PRIMARY_POA vs secondary schedule-only', async () => {
    const db = createEmptyLtcMemoryDb();
    const connector = createPointClickCareConnector();
    await pollEhrFacility(db, connector, 'pcc-facility-demo-01');
    const primary = db.poa_scopes.find((s) => s.is_legal_poa)!;
    const secondary = db.poa_scopes.find((s) => !s.is_legal_poa)!;
    expect(mapEhrContactToAccess(primary).proxyRole).toBe('PRIMARY_POA');
    expect(mapEhrContactToAccess(secondary).clinicalAccess).toBe(false);

    const revoked = applyEhrConsentFlags(primary, { unsubscribed: true });
    expect(revoked.delivery_enabled).toBe(false);
    const idx = db.poa_scopes.findIndex((s) => s.id === primary.id);
    db.poa_scopes[idx] = revoked;

    const residentId = primary.resident_id;
    expect(() => getFamilyFeed(db, PRIMARY, residentId)).toThrow(DomainError);

    // restore delivery for secondary schedule test
    db.poa_scopes[idx] = { ...primary, delivery_enabled: true };
    const feedPrimary = getFamilyFeed(db, PRIMARY, residentId);
    expect(feedPrimary.accessLevel).toBe('CLINICAL');
    expect(feedPrimary.medications.length).toBeGreaterThan(0);

    const feedSecondary = getFamilyFeed(db, SECONDARY, residentId);
    expect(feedSecondary.accessLevel).toBe('SCHEDULE_ONLY');
    expect(feedSecondary.medications.length).toBe(0);
    expect(feedSecondary.appointments.length).toBeGreaterThan(0);
    expect(db.access_audit.some((a) => a.action === 'READ_FAMILY_FEED')).toBe(
      true,
    );
  });

  it('accepts webhook ingest arrays', () => {
    const db = getLtcMemoryDb();
    const connector = createPointClickCareConnector();
    return connector.pullResources('pcc-facility-demo-01').then((pull) => {
      const { ingested } = receiveEhrWebhook(db, pull.envelopes);
      expect(ingested).toBe(pull.envelopes.length);
    });
  });

  it('gates sync behind consent + Montreal + AES envelope', async () => {
    residencyGuardMiddleware('northamerica-northeast1');
    expect(() => residencyGuardMiddleware('ca-central-1')).toThrow(DomainError);
    tlsOnlyMiddleware({
      protocol: 'https:',
      tlsVersion: 'TLSv1.3',
      host: 'api.example.com',
    });
    expect(() =>
      tlsOnlyMiddleware({ protocol: 'http:', host: 'api.example.com' }),
    ).toThrow(DomainError);

    expect(() => requireConsent('CARE_HOME_SYNC')).toThrow(DomainError);
    grantConsent('CARE_HOME_SYNC');
    grantConsent('EHR_LTC_INGEST_DELIVERY');
    const envelope = await buildEncryptedSyncEnvelope({
      plaintextJson: JSON.stringify({ kind: 'timeline', n: 1 }),
      keyId: 'device-key-1',
    });
    expect(envelope.region).toBe('northamerica-northeast1');
    expect(envelope.ciphertextBase64.length).toBeGreaterThan(10);
    const push = await pushEncryptedIfConsented(envelope);
    expect(push.accepted).toBe(false);
    expect(push.reason).toMatch(/not implemented|local-first/i);
  });

  it('sandbox WALLET_PRO unlocks FOI paywall', () => {
    expect(decidePaywall('FOI').allowed).toBe(false);
    enableSandboxWalletPro();
    expect(DEMO_WALLET_PRO_ENTITLEMENT.platforms).toContain('desktop');
    expect(() => guardPaidFeature('FOI')).not.toThrow();
    expect(decidePaywall('FOI').allowed).toBe(true);
  });

  it('normalizer validates envelopes', () => {
    const db = createEmptyLtcMemoryDb();
    expect(() => ingestEnvelopes(db, [{ bad: true }])).toThrow(DomainError);
  });
});
