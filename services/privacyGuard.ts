/**
 * Least-privilege boundary for aide / care-home delegates.
 * Family ProxyGrant permissions are never implied here.
 */

import type { DelegateScope } from '../types/careObservation';

/** Actions that always require family POA — never allowed for delegates. */
export type ProtectedVaultAction =
  | 'READ_FOI'
  | 'MANAGE_FOI'
  | 'READ_POA_DOCS'
  | 'READ_FULL_CHART'
  | 'EXPORT_SBAR'
  | 'DECRYPT_EMERGENCY_PASS'
  | 'MANAGE_FAMILY_PROXIES';

export const DELEGATE_DENIED_ACTIONS: readonly ProtectedVaultAction[] = [
  'READ_FOI',
  'MANAGE_FOI',
  'READ_POA_DOCS',
  'READ_FULL_CHART',
  'EXPORT_SBAR',
  'DECRYPT_EMERGENCY_PASS',
  'MANAGE_FAMILY_PROXIES',
] as const;

const SCOPE_ACTIONS: Record<DelegateScope, string[]> = {
  LOG_HANDOVER: ['SUBMIT_HANDOVER', 'LOG_VITALS', 'LOG_MEALS', 'LOG_MEDS'],
  LOG_VITALS: ['LOG_VITALS'],
  LOG_MEALS: ['LOG_MEALS'],
  READ_TODAY_SCHEDULE: ['READ_TODAY_SCHEDULE'],
};

export function isProtectedVaultAction(
  action: string,
): action is ProtectedVaultAction {
  return (DELEGATE_DENIED_ACTIONS as readonly string[]).includes(action);
}

/** Hard deny for FOI / POA / full chart / SBAR / emergency decrypt. */
export function assertDelegateNotProtected(action: string): void {
  if (isProtectedVaultAction(action)) {
    throw new Error(
      `Delegate access denied: ${action} requires family proxy permissions`,
    );
  }
}

export function scopesAllow(
  scopes: readonly DelegateScope[],
  action: string,
): boolean {
  if (isProtectedVaultAction(action)) return false;
  for (const scope of scopes) {
    const allowed = SCOPE_ACTIONS[scope] ?? [];
    if (allowed.includes(action) || scope === action) return true;
  }
  // LOG_HANDOVER implies the checklist writes
  if (
    scopes.includes('LOG_HANDOVER') &&
    ['SUBMIT_HANDOVER', 'LOG_VITALS', 'LOG_MEALS', 'LOG_MEDS'].includes(action)
  ) {
    return true;
  }
  return false;
}

export function canDelegatePerform(
  scopes: readonly DelegateScope[],
  action: string,
): boolean {
  return scopesAllow(scopes, action);
}
