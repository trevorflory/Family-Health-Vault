import { logStructured } from '@family-health-vault/shared';
import type { LtcMemoryDb } from '../../db';
import { ingestEnvelopes } from '../normalizer';

/** Webhook receiver — accepts read-only vendor payloads; never triggers staff UI. */
export function receiveEhrWebhook(
  db: LtcMemoryDb,
  body: unknown,
): { accepted: boolean; ingested: number } {
  const started = Date.now();
  try {
    if (Array.isArray(body)) {
      const { ingested } = ingestEnvelopes(db, body);
      logStructured('ehr_webhook', 'ok', {
        execution_time_ms: Date.now() - started,
        count: ingested,
      });
      return { accepted: true, ingested };
    }
    const { ingested } = ingestEnvelopes(db, [body]);
    logStructured('ehr_webhook', 'ok', {
      execution_time_ms: Date.now() - started,
      count: ingested,
    });
    return { accepted: true, ingested };
  } catch {
    logStructured('ehr_webhook', 'error', {
      execution_time_ms: Date.now() - started,
    });
    throw new Error('ehr_webhook_failed');
  }
}
