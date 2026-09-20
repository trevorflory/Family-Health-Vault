/**
 * Thin client helpers for LTC EHR fixture sync (device-side).
 */

import {
  createEmptyLtcMemoryDb,
  getLtcMemoryDb,
  resetLtcMemoryDb,
  type LtcMemoryDb,
} from '../../server/src/db';
import { createPointClickCareConnector } from '../../server/src/ingestion/connectors/pointClickCare';
import { pollEhrFacility } from '../../server/src/ingestion/workers/pollScheduler';
import { getFamilyFeed } from '../../server/src/routes/familyFeed';
import { onboardFacilityEhr } from '../../server/src/routes/facilityOnboarding';
import { enableSandboxWalletProRoute } from '../../server/src/routes/entitlements';

export {
  getLtcMemoryDb,
  resetLtcMemoryDb,
  createEmptyLtcMemoryDb,
  getFamilyFeed,
  onboardFacilityEhr,
  enableSandboxWalletProRoute,
};

export async function runPccFixtureSync(
  externalFacilityId = 'pcc-facility-demo-01',
  options?: { patientId?: string },
): Promise<{ ingested: number; db: LtcMemoryDb; residentId: string | null }> {
  const db = getLtcMemoryDb();
  if (db.facilities.length === 0) {
    await onboardFacilityEhr(db, {
      facilityName: 'Demo LTC Residence',
      jurisdiction: 'ON',
      vendor: 'POINTCLICKCARE',
      externalFacilityId,
    });
  } else {
    const connector = createPointClickCareConnector();
    await pollEhrFacility(db, connector, externalFacilityId);
  }
  if (options?.patientId && db.residents[0]) {
    db.residents[0].patient_id = options.patientId;
  }
  return {
    ingested: db.resident_timeline_events.length,
    db,
    residentId: db.residents[0]?.id ?? null,
  };
}
