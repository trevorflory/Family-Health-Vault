jest.mock('../db/medicalEvents', () => ({
  saveMedicalEvent: jest.fn(),
}));

jest.mock('../db/client', () => ({
  getHealthcareDb: jest.fn(),
}));

import { syncLtcDbToVaultMedicalEvents } from '../services/ehr/vaultBridge';
import { createEmptyLtcMemoryDb } from '../server/src/db';
import { createPointClickCareConnector } from '../server/src/ingestion/connectors/pointClickCare';
import { pollEhrFacility } from '../server/src/ingestion/workers/pollScheduler';

const SEED_DAD_ID = 'pt-7801';

describe('LTC EHR → MedicalEvents vault bridge', () => {
  it('writes PRESCRIPTION / LAB_RESULT / schedule docs with EHR_LTC provenance', async () => {
    const db = createEmptyLtcMemoryDb();
    const connector = createPointClickCareConnector();
    await pollEhrFacility(db, connector, 'pcc-facility-demo-01');
    db.residents[0]!.patient_id = SEED_DAD_ID;

    const saved: Array<Record<string, unknown>> = [];
    const result = await syncLtcDbToVaultMedicalEvents(db, {
      patientId: SEED_DAD_ID,
      saveMedicalEvent: async (input) => {
        saved.push(input as unknown as Record<string, unknown>);
        return {
          id: String(input.id),
          patientId: input.patientId,
          kind: input.kind,
          sourceUri: null,
          rawText: input.rawText,
          parsedJson: '{}',
          status: input.status,
          sourceType: input.sourceType ?? 'EHR_LTC',
          sourceAuthorityId: input.sourceAuthorityId ?? null,
          externalId: input.externalId ?? null,
          lastSyncedAt: input.lastSyncedAt ?? null,
          createdAt: '2026-09-19T00:00:00.000Z',
          updatedAt: '2026-09-19T00:00:00.000Z',
        };
      },
    });

    expect(result.patientId).toBe(SEED_DAD_ID);
    expect(result.medicationCount).toBeGreaterThan(0);
    expect(result.savedIds.length).toBeGreaterThan(0);
    expect(saved.some((s) => s.kind === 'PRESCRIPTION')).toBe(true);
    expect(saved.some((s) => s.sourceType === 'EHR_LTC')).toBe(true);
    expect(saved.some((s) => s.kind === 'LAB_RESULT')).toBe(true);
    expect(saved.some((s) => s.kind === 'UNSTRUCTURED_DOC')).toBe(true);
  });
});
