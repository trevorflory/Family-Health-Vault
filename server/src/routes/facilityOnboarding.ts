import type { LtcMemoryDb } from '../db';
import type { EhrVendor } from '../schema/tables';
import { createPointClickCareConnector } from '../ingestion/connectors/pointClickCare';
import { createMeditechExpanseConnector } from '../ingestion/connectors/meditechExpanse';
import { createYardiLtcConnector } from '../ingestion/connectors/yardiLtc';
import { pollEhrFacility } from '../ingestion/workers/pollScheduler';

/** Enterprise facility onboarding — marketplace token, not staff daily login. */
export async function onboardFacilityEhr(
  db: LtcMemoryDb,
  input: {
    facilityName: string;
    jurisdiction: string;
    vendor: EhrVendor;
    externalFacilityId: string;
  },
): Promise<{ facilityId: string; connectionId: string; ingested: number }> {
  const connector =
    input.vendor === 'POINTCLICKCARE'
      ? createPointClickCareConnector()
      : input.vendor === 'MEDITECH_EXPANSE'
        ? createMeditechExpanseConnector()
        : createYardiLtcConnector();

  const facility = {
    id: `fac-${db.facilities.length + 1}`,
    tenant_id: `tenant-${db.facilities.length + 1}`,
    name: input.facilityName,
    jurisdiction: input.jurisdiction,
    created_at: new Date().toISOString(),
  };
  db.facilities.push(facility);

  const auth = await connector.authenticateFacility(input.externalFacilityId);
  const connection = {
    id: `ehr-${db.ehr_connections.length + 1}`,
    facility_id: facility.id,
    vendor: input.vendor,
    status: auth.ok ? ('ACTIVE' as const) : ('ERROR' as const),
    token_ciphertext: auth.tokenCiphertext ?? null,
    external_facility_id: input.externalFacilityId,
    last_sync_at: null as string | null,
  };
  db.ehr_connections.push(connection);

  if (!auth.ok) {
    return {
      facilityId: facility.id,
      connectionId: connection.id,
      ingested: 0,
    };
  }

  const poll = await pollEhrFacility(
    db,
    connector,
    input.externalFacilityId,
  );
  return {
    facilityId: facility.id,
    connectionId: connection.id,
    ingested: poll.ingested,
  };
}
