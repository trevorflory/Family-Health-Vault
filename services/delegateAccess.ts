/**
 * Scoped aide / care-home delegate grants (orthogonal to family ProxyGrant).
 */

import {
  getDelegateGrant,
  insertDelegateAccessLog,
  saveDelegateGrant,
} from '../db/careObservations';
import type {
  DelegateGrant,
  DelegateScope,
} from '../types/careObservation';
import {
  assertDelegateNotProtected,
  canDelegatePerform,
} from './privacyGuard';

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface IssueDelegateGrantInput {
  patientId: string;
  recipientName: string;
  grantedScopes: DelegateScope[];
  issuedBy: string;
  /** Default 48h. */
  ttlMs?: number;
  now?: Date;
}

export async function issueDelegateGrant(
  input: IssueDelegateGrantInput,
): Promise<DelegateGrant> {
  const now = input.now ?? new Date();
  const scopes =
    input.grantedScopes.length > 0
      ? input.grantedScopes
      : (['LOG_HANDOVER'] as DelegateScope[]);
  const grant: DelegateGrant = {
    tokenId: newId('dlg'),
    patientId: input.patientId,
    recipientName: input.recipientName.trim() || 'Care aide',
    grantedScopes: scopes,
    expiresAtISO: new Date(
      now.getTime() + (input.ttlMs ?? DEFAULT_TTL_MS),
    ).toISOString(),
    isActive: true,
    issuedBy: input.issuedBy,
    createdAtISO: now.toISOString(),
  };
  return saveDelegateGrant(grant);
}

export async function revokeDelegateGrant(
  tokenId: string,
  now: Date = new Date(),
): Promise<DelegateGrant | null> {
  const existing = await getDelegateGrant(tokenId);
  if (!existing) return null;
  const next: DelegateGrant = {
    ...existing,
    isActive: false,
    expiresAtISO: now.toISOString(),
  };
  return saveDelegateGrant(next);
}

export function isDelegateGrantUsable(
  grant: DelegateGrant,
  now: Date = new Date(),
): boolean {
  if (!grant.isActive) return false;
  return new Date(grant.expiresAtISO).getTime() > now.getTime();
}

export async function assertDelegateScope(
  tokenId: string,
  action: string,
  now: Date = new Date(),
): Promise<DelegateGrant> {
  assertDelegateNotProtected(action);

  const grant = await getDelegateGrant(tokenId);
  if (!grant) {
    await insertDelegateAccessLog({
      logId: newId('dal'),
      tokenId,
      patientId: 'unknown',
      action,
      permitted: false,
      detail: 'Grant not found',
      atISO: now.toISOString(),
    });
    throw new Error('Delegate grant not found');
  }

  const usable = isDelegateGrantUsable(grant, now);
  const permitted = usable && canDelegatePerform(grant.grantedScopes, action);

  await insertDelegateAccessLog({
    logId: newId('dal'),
    tokenId: grant.tokenId,
    patientId: grant.patientId,
    action,
    permitted,
    detail: usable
      ? permitted
        ? undefined
        : 'Scope denied'
      : 'Grant inactive or expired',
    atISO: now.toISOString(),
  });

  if (!usable) {
    throw new Error('Delegate grant inactive or expired');
  }
  if (!permitted) {
    throw new Error(`Delegate scope denied for action: ${action}`);
  }
  return grant;
}

export { getDelegateGrant, canDelegatePerform };
