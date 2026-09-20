/**
 * Device consent registry — explicit opt-in before sync / telemetry / portal import.
 */

import type { ConsentKind, ConsentRecord } from '@family-health-vault/shared';
import { assertConsentGranted } from '@family-health-vault/shared';

const records: ConsentRecord[] = [];

export function listConsents(): readonly ConsentRecord[] {
  return records;
}

export function grantConsent(kind: ConsentKind, atISO = new Date().toISOString()): ConsentRecord {
  const existing = records.findIndex((r) => r.kind === kind);
  const row: ConsentRecord = { kind, granted: true, atISO };
  if (existing >= 0) records[existing] = row;
  else records.push(row);
  return row;
}

export function revokeConsent(kind: ConsentKind, atISO = new Date().toISOString()): ConsentRecord {
  const existing = records.findIndex((r) => r.kind === kind);
  const row: ConsentRecord = { kind, granted: false, atISO };
  if (existing >= 0) records[existing] = row;
  else records.push(row);
  return row;
}

export function resetConsents(): void {
  records.length = 0;
}

export function requireConsent(kind: ConsentKind): void {
  assertConsentGranted(records, kind);
}
