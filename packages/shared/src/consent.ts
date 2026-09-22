import { z } from 'zod';
import { DomainError } from './DomainError';

export const ConsentKindSchema = z.enum([
  'EHR_LTC_INGEST_DELIVERY',
  'PORTAL_IMPORT',
  'TELEMETRY',
  'CARE_HOME_SYNC',
]);

export type ConsentKind = z.infer<typeof ConsentKindSchema>;

export interface ConsentRecord {
  kind: ConsentKind;
  granted: boolean;
  atISO: string;
}

export function assertConsentGranted(
  records: readonly ConsentRecord[],
  kind: ConsentKind,
): void {
  const hit = records.find((r) => r.kind === kind && r.granted);
  if (!hit) {
    throw new DomainError(
      'CONSENT',
      `Explicit opt-in required for ${kind}`,
      { kind },
    );
  }
}
