import {
  MedicationRecordSchema,
  AppointmentRecordSchema,
  VitalRecordSchema,
  POAScopeSchema,
  assertMontrealResidency,
  MONTREAL_REGION,
  stripPhi,
  hashUserId,
  assertWalletFeature,
  assertPlatform,
  DEMO_WALLET_PRO_ENTITLEMENT,
  assertConsentGranted,
  DomainError,
  logStructured,
  resetPhiSafeLogSink,
  getPhiSafeLogBuffer,
} from '@family-health-vault/shared';
import { guardSyncRegion } from '../services/sync/residencyGuard';

describe('packages/shared guardrails', () => {
  it('parses MedicationRecord via Zod', () => {
    const row = MedicationRecordSchema.parse({
      id: 'm1',
      resident_id: 'r1',
      medication_name: 'Metformin',
      dosage: '500 mg',
      schedule: 'BID',
      last_administered_at: '2026-09-19T12:00:00.000Z',
    });
    expect(row.medication_name).toBe('Metformin');
  });

  it('parses AppointmentRecord, VitalRecord, POAScope', () => {
    expect(
      AppointmentRecordSchema.parse({
        id: 'a1',
        resident_id: 'r1',
        title: 'Physio',
        start_time: '2026-09-20T15:00:00.000Z',
      }).title,
    ).toBe('Physio');
    expect(
      VitalRecordSchema.parse({
        id: 'v1',
        resident_id: 'r1',
        type: 'BP_SYS',
        value: '128',
        unit: 'mm[Hg]',
        recorded_at: '2026-09-19T08:00:00.000Z',
      }).type,
    ).toBe('BP_SYS');
    expect(
      POAScopeSchema.parse({
        contact_id: 'c1',
        resident_id: 'r1',
        is_legal_poa: true,
        clinical_access_granted: true,
        delivery_enabled: true,
      }).is_legal_poa,
    ).toBe(true);
  });

  it('enforces Montreal residency', () => {
    expect(() => assertMontrealResidency(MONTREAL_REGION)).not.toThrow();
    expect(() => assertMontrealResidency('ca-central-1')).toThrow(DomainError);
    expect(guardSyncRegion(MONTREAL_REGION)).toBe(MONTREAL_REGION);
  });

  it('strips PHI and hashes user ids in structured logs', () => {
    resetPhiSafeLogSink();
    const redacted = stripPhi({
      event: 'sync',
      name: 'Jane Doe',
      phn: '123',
      ok: true,
    });
    expect(redacted.name).toBe('[REDACTED]');
    expect(redacted.phn).toBe('[REDACTED]');
    expect(redacted.ok).toBe(true);
    expect(hashUserId('acct-1')).toMatch(/^u_[0-9a-f]{8}$/);
    logStructured('test_event', 'ok', {
      userId: 'acct-1',
      name: 'Secret',
      execution_time_ms: 12,
    });
    const buf = getPhiSafeLogBuffer();
    expect(buf[0].user_id_hash).toBeDefined();
    expect(buf[0].name).toBe('[REDACTED]');
  });

  it('gates WALLET_PRO features and platforms', () => {
    expect(() => assertWalletFeature('FREE_FEED', 'FOI')).toThrow(DomainError);
    expect(() => assertWalletFeature('WALLET_PRO', 'FOI')).not.toThrow();
    expect(() => assertPlatform('FREE_FEED', 'desktop')).toThrow(DomainError);
    expect(() => assertPlatform('WALLET_PRO', 'desktop')).not.toThrow();
    expect(DEMO_WALLET_PRO_ENTITLEMENT.platforms).toEqual([
      'mobile',
      'web',
      'desktop',
    ]);
  });

  it('requires consent opt-in', () => {
    expect(() =>
      assertConsentGranted([], 'EHR_LTC_INGEST_DELIVERY'),
    ).toThrow(DomainError);
    expect(() =>
      assertConsentGranted(
        [
          {
            kind: 'EHR_LTC_INGEST_DELIVERY',
            granted: true,
            atISO: '2026-09-19T00:00:00.000Z',
          },
        ],
        'EHR_LTC_INGEST_DELIVERY',
      ),
    ).not.toThrow();
  });
});
