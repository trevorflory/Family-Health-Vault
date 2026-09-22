import { logStructured } from '@family-health-vault/shared';
import type { LtcMemoryDb } from '../../db';
import { ingestEnvelopes } from '../normalizer';
import type { ReadOnlyEhrConnector } from '../connectors/types';

/** Hourly / daily poll fallback when webhooks are unavailable. */
export async function pollEhrFacility(
  db: LtcMemoryDb,
  connector: ReadOnlyEhrConnector,
  externalFacilityId: string,
): Promise<{ ingested: number; authOk: boolean }> {
  const started = Date.now();
  const auth = await connector.authenticateFacility(externalFacilityId);
  if (!auth.ok) {
    logStructured('ehr_poll', 'denied', {
      execution_time_ms: Date.now() - started,
      vendor: connector.vendor,
    });
    return { ingested: 0, authOk: false };
  }
  const pull = await connector.pullResources(externalFacilityId);
  const { ingested } = ingestEnvelopes(db, pull.envelopes);
  const conn = db.ehr_connections.find(
    (c) =>
      c.vendor === connector.vendor &&
      c.external_facility_id === externalFacilityId,
  );
  if (conn) {
    conn.last_sync_at = new Date().toISOString();
    conn.token_ciphertext = auth.tokenCiphertext ?? conn.token_ciphertext;
  }
  logStructured('ehr_poll', 'ok', {
    execution_time_ms: Date.now() - started,
    vendor: connector.vendor,
    count: ingested,
  });
  return { ingested, authOk: true };
}
