/**
 * Map EHR contact flags → wallet proxy roles / clinical visibility.
 */

import type { ProxyRole } from '../../types/proxyAccess';
import { ROLE_PERMISSIONS } from '../../types/proxyAccess';
import type { PoaScopeRow } from '../../server/src/schema/tables';

export type EhrDerivedAccess = {
  proxyRole: ProxyRole | 'SECONDARY_FAMILY';
  clinicalAccess: boolean;
  deliveryEnabled: boolean;
  permissions: readonly string[];
};

/** Secondary family contacts are schedule-only (stricter than SIBLING_COORDINATOR clinical bits). */
export function mapEhrContactToAccess(scope: {
  is_legal_poa: boolean;
  clinical_access_granted: boolean;
  delivery_enabled: boolean;
}): EhrDerivedAccess {
  if (!scope.delivery_enabled) {
    return {
      proxyRole: 'SECONDARY_FAMILY',
      clinicalAccess: false,
      deliveryEnabled: false,
      permissions: [],
    };
  }
  if (scope.is_legal_poa && scope.clinical_access_granted) {
    return {
      proxyRole: 'PRIMARY_POA',
      clinicalAccess: true,
      deliveryEnabled: true,
      permissions: ROLE_PERMISSIONS.PRIMARY_POA,
    };
  }
  return {
    proxyRole: 'SECONDARY_FAMILY',
    clinicalAccess: false,
    deliveryEnabled: true,
    permissions: ['READ_SCHEDULE', 'READ_APPOINTMENTS'],
  };
}

/** EHR unsubscribe / channel preference → delivery_enabled false. */
export function applyEhrConsentFlags(
  scope: PoaScopeRow,
  flags: { unsubscribed?: boolean; channelBlocked?: boolean },
): PoaScopeRow {
  const delivery_enabled = !(
    flags.unsubscribed === true || flags.channelBlocked === true
  );
  return { ...scope, delivery_enabled, synced_at: new Date().toISOString() };
}
