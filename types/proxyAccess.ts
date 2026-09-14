/**
 * Multi-generational granular proxy access.
 * Tiered household permissions + immutable access logging + age-out hand-off.
 */

export type ProxyRole =
  | 'PRIMARY_POA'
  | 'SIBLING_COORDINATOR'
  | 'EMERGENCY_PASS';

export type ProxyPermission =
  | 'READ_VAULT'
  | 'EXPORT_SBAR'
  | 'MANAGE_FOI'
  | 'MANAGE_PROXIES'
  | 'RECORD_DEBRIEF'
  | 'ISSUE_EMERGENCY_PASS';

export type ProxyGrantStatus = 'ACTIVE' | 'REVOKED' | 'AGED_OUT' | 'EXPIRED';

export interface ProxyGrant {
  grantId: string;
  patientId: string;
  granteeId: string;
  granteeDisplayName: string;
  role: ProxyRole;
  permissions: ProxyPermission[];
  status: ProxyGrantStatus;
  /** ISO-8601; required for EMERGENCY_PASS / time-limited grants. */
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}

export interface AccessLogEntry {
  logId: string;
  grantId: string;
  patientId: string;
  actorId: string;
  actorDisplayName: string;
  action: string;
  permitted: boolean;
  detail?: string;
  at: string;
}

export interface AgeOutEvaluation {
  patientId: string;
  patientDisplayName: string;
  ageYears: number;
  consentAgeYears: number;
  due: boolean;
  message: string;
}

export interface AgeOutHandOffResult {
  patientId: string;
  revokedGrantIds: string[];
  accessLogIds: string[];
  handOffNote: string;
  evaluatedAt: string;
}

/** Default Canadian demo consent age for pediatric age-out hand-off. */
export const DEFAULT_CONSENT_AGE_YEARS = 16;

export const ROLE_PERMISSIONS: Record<ProxyRole, ProxyPermission[]> = {
  PRIMARY_POA: [
    'READ_VAULT',
    'EXPORT_SBAR',
    'MANAGE_FOI',
    'MANAGE_PROXIES',
    'RECORD_DEBRIEF',
    'ISSUE_EMERGENCY_PASS',
  ],
  SIBLING_COORDINATOR: [
    'READ_VAULT',
    'EXPORT_SBAR',
    'MANAGE_FOI',
    'RECORD_DEBRIEF',
  ],
  EMERGENCY_PASS: ['READ_VAULT'],
};
