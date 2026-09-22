import { DomainError } from '@family-health-vault/shared';
import type { LtcMemoryDb } from '../db';
import type { PoaScopeRow } from '../schema/tables';

export type FamilyAccessLevel = 'NONE' | 'SCHEDULE_ONLY' | 'CLINICAL';

export function resolveFamilyAccessLevel(
  scopes: readonly PoaScopeRow[],
  familyAccountId: string,
  residentId: string,
): FamilyAccessLevel {
  const hit = scopes.find(
    (s) =>
      s.family_account_id === familyAccountId &&
      s.resident_id === residentId &&
      s.delivery_enabled,
  );
  if (!hit) return 'NONE';
  if (hit.is_legal_poa && hit.clinical_access_granted) return 'CLINICAL';
  return 'SCHEDULE_ONLY';
}

export function assertFamilyCanReadClinical(
  db: LtcMemoryDb,
  familyAccountId: string,
  residentId: string,
): void {
  const level = resolveFamilyAccessLevel(
    db.poa_scopes,
    familyAccountId,
    residentId,
  );
  if (level !== 'CLINICAL') {
    throw new DomainError(
      'POA_SCOPE',
      'Clinical data requires primary legal POA with clinical_access_granted and delivery_enabled',
      { familyAccountId, residentId, level },
    );
  }
}

export function assertFamilyCanReadSchedule(
  db: LtcMemoryDb,
  familyAccountId: string,
  residentId: string,
): void {
  const level = resolveFamilyAccessLevel(
    db.poa_scopes,
    familyAccountId,
    residentId,
  );
  if (level === 'NONE') {
    throw new DomainError(
      'POA_SCOPE',
      'No active EHR-derived POA scope for this resident',
      { familyAccountId, residentId },
    );
  }
}

export function appendAccessAudit(
  db: LtcMemoryDb,
  input: {
    family_account_id: string;
    resident_id: string;
    action: string;
    permitted: boolean;
  },
): void {
  db.access_audit.push({
    id: `audit-${db.access_audit.length + 1}`,
    family_account_id: input.family_account_id,
    resident_id: input.resident_id,
    action: input.action,
    permitted: input.permitted,
    at: new Date().toISOString(),
  });
}
