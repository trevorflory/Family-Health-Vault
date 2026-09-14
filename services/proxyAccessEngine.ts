import { getPatientVaultProfile } from '../data/patientVault';
import {
  buildDemoProxyGrants,
  DEMO_PRIMARY_NAME,
  DEMO_SIBLING_ID,
  DEMO_SIBLING_NAME,
} from '../data/proxyGrants';
import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import type {
  AccessLogEntry,
  AgeOutEvaluation,
  AgeOutHandOffResult,
  ProxyGrant,
  ProxyGrantStatus,
  ProxyPermission,
  ProxyRole,
} from '../types/proxyAccess';
import {
  DEFAULT_CONSENT_AGE_YEARS,
  ROLE_PERMISSIONS,
} from '../types/proxyAccess';

let grants: ProxyGrant[] = buildDemoProxyGrants();
let accessLog: AccessLogEntry[] = [];

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isExpired(grant: ProxyGrant, now: Date): boolean {
  if (!grant.expiresAt) return false;
  return new Date(grant.expiresAt).getTime() <= now.getTime();
}

function effectiveStatus(grant: ProxyGrant, now: Date): ProxyGrantStatus {
  if (grant.status !== 'ACTIVE') return grant.status;
  if (isExpired(grant, now)) return 'EXPIRED';
  return 'ACTIVE';
}

export function resetProxyAccessStore(now: Date = new Date()): void {
  grants = buildDemoProxyGrants(now);
  accessLog = [];
}

export function listProxyGrants(patientId?: string): ProxyGrant[] {
  const rows = patientId
    ? grants.filter((g) => g.patientId === patientId)
    : [...grants];
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listAccessLog(patientId?: string): AccessLogEntry[] {
  const rows = patientId
    ? accessLog.filter((e) => e.patientId === patientId)
    : [...accessLog];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

export function grantProxyAccess(input: {
  patientId: string;
  granteeId: string;
  granteeDisplayName: string;
  role: ProxyRole;
  createdBy: string;
  expiresAt?: string | null;
  notes?: string;
  now?: Date;
}): ProxyGrant {
  const now = input.now ?? new Date();
  if (input.role === 'EMERGENCY_PASS' && !input.expiresAt) {
    throw new Error('EMERGENCY_PASS grants require expiresAt');
  }
  const grant: ProxyGrant = {
    grantId: newId('grant'),
    patientId: input.patientId,
    granteeId: input.granteeId,
    granteeDisplayName: input.granteeDisplayName,
    role: input.role,
    permissions: [...ROLE_PERMISSIONS[input.role]],
    status: 'ACTIVE',
    expiresAt: input.expiresAt ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: input.createdBy,
    notes: input.notes,
  };
  grants.push(grant);
  appendAccessLog({
    grantId: grant.grantId,
    patientId: grant.patientId,
    actorId: input.createdBy,
    actorDisplayName: resolveActorName(input.createdBy),
    action: `GRANT_${input.role}`,
    permitted: true,
    detail: input.notes,
    now,
  });
  return grant;
}

export function revokeProxyGrant(
  grantId: string,
  actorId: string,
  now: Date = new Date(),
): ProxyGrant {
  const grant = grants.find((g) => g.grantId === grantId);
  if (!grant) throw new Error(`Unknown grantId: ${grantId}`);
  grant.status = 'REVOKED';
  grant.updatedAt = now.toISOString();
  appendAccessLog({
    grantId,
    patientId: grant.patientId,
    actorId,
    actorDisplayName: resolveActorName(actorId),
    action: 'REVOKE_GRANT',
    permitted: true,
    now,
  });
  return { ...grant };
}

/**
 * Immutable append-only access log. Never deletes or mutates prior rows.
 */
export function appendAccessLog(input: {
  grantId: string;
  patientId: string;
  actorId: string;
  actorDisplayName: string;
  action: string;
  permitted: boolean;
  detail?: string;
  now?: Date;
}): AccessLogEntry {
  const entry: AccessLogEntry = {
    logId: newId('log'),
    grantId: input.grantId,
    patientId: input.patientId,
    actorId: input.actorId,
    actorDisplayName: input.actorDisplayName,
    action: input.action,
    permitted: input.permitted,
    detail: input.detail,
    at: (input.now ?? new Date()).toISOString(),
  };
  accessLog.push(entry);
  return entry;
}

export function checkPermission(
  actorId: string,
  patientId: string,
  permission: ProxyPermission,
  now: Date = new Date(),
): { permitted: boolean; grant: ProxyGrant | null; log: AccessLogEntry } {
  const active = grants.find(
    (g) =>
      g.granteeId === actorId &&
      g.patientId === patientId &&
      effectiveStatus(g, now) === 'ACTIVE' &&
      g.permissions.includes(permission),
  );
  const permitted = Boolean(active);
  const log = appendAccessLog({
    grantId: active?.grantId ?? 'none',
    patientId,
    actorId,
    actorDisplayName: resolveActorName(actorId),
    action: `CHECK_${permission}`,
    permitted,
    detail: active ? `role=${active.role}` : 'no matching active grant',
    now,
  });
  return { permitted, grant: active ? { ...active } : null, log };
}

export function evaluateAgeOut(
  patientId: string,
  consentAgeYears: number = DEFAULT_CONSENT_AGE_YEARS,
): AgeOutEvaluation {
  const profile = getPatientVaultProfile(patientId);
  if (!profile) {
    throw new Error(`Unknown patientId: ${patientId}`);
  }
  const due = profile.ageYears >= consentAgeYears;
  return {
    patientId,
    patientDisplayName: profile.preferredName ?? profile.fullName,
    ageYears: profile.ageYears,
    consentAgeYears,
    due,
    message: due
      ? `${profile.preferredName ?? profile.fullName} has reached consent age (${consentAgeYears}). Parental proxy grants should be handed off.`
      : `${profile.preferredName ?? profile.fullName} is ${profile.ageYears}; consent age hand-off at ${consentAgeYears}.`,
  };
}

/**
 * Age-out hand-off: mark PRIMARY_POA parental grants AGED_OUT and append
 * immutable log entries. Does not delete prior access history.
 * Pass `force: true` only for demo simulation when age < consent threshold.
 */
export function executeAgeOutHandOff(
  patientId: string,
  actorId: string,
  consentAgeYears: number = DEFAULT_CONSENT_AGE_YEARS,
  now: Date = new Date(),
  options: { force?: boolean } = {},
): AgeOutHandOffResult {
  const evaluation = evaluateAgeOut(patientId, consentAgeYears);
  if (!evaluation.due && !options.force) {
    throw new Error(
      `Age-out not due for ${patientId} (age ${evaluation.ageYears} < ${consentAgeYears})`,
    );
  }

  const revokedGrantIds: string[] = [];
  const accessLogIds: string[] = [];
  const note = options.force
    ? `Demo force hand-off: ${evaluation.message}`
    : evaluation.message;

  for (const grant of grants) {
    if (
      grant.patientId === patientId &&
      grant.role === 'PRIMARY_POA' &&
      grant.status === 'ACTIVE'
    ) {
      grant.status = 'AGED_OUT';
      grant.updatedAt = now.toISOString();
      revokedGrantIds.push(grant.grantId);
      const log = appendAccessLog({
        grantId: grant.grantId,
        patientId,
        actorId,
        actorDisplayName: resolveActorName(actorId),
        action: 'AGE_OUT_HAND_OFF',
        permitted: true,
        detail: note,
        now,
      });
      accessLogIds.push(log.logId);
    }
  }

  return {
    patientId,
    revokedGrantIds,
    accessLogIds,
    handOffNote: note,
    evaluatedAt: now.toISOString(),
  };
}

function resolveActorName(actorId: string): string {
  if (actorId === DEMO_CAREGIVER_ID) return DEMO_PRIMARY_NAME;
  if (actorId === DEMO_SIBLING_ID) return DEMO_SIBLING_NAME;
  const profile = getPatientVaultProfile(actorId);
  if (profile) return profile.preferredName ?? profile.fullName;
  return actorId;
}

export function roleLabel(role: ProxyRole): string {
  switch (role) {
    case 'PRIMARY_POA':
      return 'Primary POA / Delegate';
    case 'SIBLING_COORDINATOR':
      return 'Sibling Care Coordinator';
    case 'EMERGENCY_PASS':
      return 'Time-Limited Emergency Pass';
    default:
      return role;
  }
}
