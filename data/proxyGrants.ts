import { DEMO_CAREGIVER_ID } from './caregiverHousehold';
import type { ProxyGrant } from '../types/proxyAccess';
import { ROLE_PERMISSIONS } from '../types/proxyAccess';

/** Sibling demo actor — Care Coordinator for Dad (not for Leo). */
export const DEMO_SIBLING_ID = 'cg-sibling-jordan';
export const DEMO_SIBLING_NAME = 'Jordan Ellis';

export const DEMO_PRIMARY_NAME = 'Alex Ellis';

function isoHoursFromNow(hours: number, now: Date): string {
  const d = new Date(now);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

/** Seed grants for the Sandwich Generation household. */
export function buildDemoProxyGrants(now: Date = new Date()): ProxyGrant[] {
  const createdAt = now.toISOString();
  return [
    {
      grantId: 'grant-alex-dad-poa',
      patientId: 'pt-7801',
      granteeId: DEMO_CAREGIVER_ID,
      granteeDisplayName: DEMO_PRIMARY_NAME,
      role: 'PRIMARY_POA',
      permissions: [...ROLE_PERMISSIONS.PRIMARY_POA],
      status: 'ACTIVE',
      expiresAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: DEMO_CAREGIVER_ID,
      notes: 'Primary POA / substitute decision-maker for Dad',
    },
    {
      grantId: 'grant-alex-leo-parent',
      patientId: 'pt-leo-04',
      granteeId: DEMO_CAREGIVER_ID,
      granteeDisplayName: DEMO_PRIMARY_NAME,
      role: 'PRIMARY_POA',
      permissions: [...ROLE_PERMISSIONS.PRIMARY_POA],
      status: 'ACTIVE',
      expiresAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: DEMO_CAREGIVER_ID,
      notes: 'Parental proxy until Leo reaches consent age',
    },
    {
      grantId: 'grant-jordan-dad-sibling',
      patientId: 'pt-7801',
      granteeId: DEMO_SIBLING_ID,
      granteeDisplayName: DEMO_SIBLING_NAME,
      role: 'SIBLING_COORDINATOR',
      permissions: [...ROLE_PERMISSIONS.SIBLING_COORDINATOR],
      status: 'ACTIVE',
      expiresAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: DEMO_CAREGIVER_ID,
      notes: 'Sibling care coordinator — shared FOI/SBAR for Dad',
    },
    {
      grantId: 'grant-er-dad-temp',
      patientId: 'pt-7801',
      granteeId: 'er-temp-pass',
      granteeDisplayName: 'ER Temporary Pass',
      role: 'EMERGENCY_PASS',
      permissions: [...ROLE_PERMISSIONS.EMERGENCY_PASS],
      status: 'ACTIVE',
      expiresAt: isoHoursFromNow(4, now),
      createdAt,
      updatedAt: createdAt,
      createdBy: DEMO_CAREGIVER_ID,
      notes: 'Time-limited emergency QR / web pass',
    },
  ];
}
