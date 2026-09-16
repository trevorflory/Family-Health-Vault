/**
 * FHIR-aligned care observations, shift handovers, delegate grants, and impact proxies.
 * Local-first / Canadian sovereignty-ready — device is system of record.
 */

export type CareObservationCategory =
  | 'NUTRITION'
  | 'WEIGHT'
  | 'MEDICATION'
  | 'VITALS'
  | 'BEHAVIOR';

export type CareObservationSource =
  | 'DELEGATE_HANDOVER'
  | 'CARE_HOME_LOG_PARSE'
  | 'MANUAL';

export type CareObservationStatus = 'PENDING_REVIEW' | 'CONFIRMED';

/** Data residency marker — device until E2EE sync lands. */
export type CareDataResidency = 'DEVICE';

/**
 * Blood pressure is stored as two Observations (systolic + diastolic LOINC),
 * never a single slash string, so FHIR export stays R4-clean.
 */
export interface CareObservation {
  id: string;
  patientId: string;
  /** Aide / staff / parser performer id. */
  performerId: string;
  effectiveDateTimeISO: string;
  category: CareObservationCategory;
  /** LOINC code when known (http://loinc.org). */
  loincCode?: string;
  display: string;
  numericValue?: number;
  /** UCUM-ish unit (kg, mm[Hg], %, mL). */
  unit?: string;
  textValue?: string;
  source: CareObservationSource;
  /** MedicalEvents.id for chain-of-custody when parsed from a care-home log. */
  sourceEventId?: string;
  handoverId?: string;
  status: CareObservationStatus;
  /** ISO 3166-2:CA subdivision when known. */
  jurisdiction?: string;
  dataResidency: CareDataResidency;
  createdAt: number;
}

export type DelegateScope =
  | 'LOG_HANDOVER'
  | 'LOG_VITALS'
  | 'LOG_MEALS'
  | 'READ_TODAY_SCHEDULE';

export interface DelegateGrant {
  tokenId: string;
  patientId: string;
  recipientName: string;
  grantedScopes: DelegateScope[];
  expiresAtISO: string;
  isActive: boolean;
  issuedBy: string;
  createdAtISO: string;
}

export interface DelegateAccessLogEntry {
  logId: string;
  tokenId: string;
  patientId: string;
  action: string;
  permitted: boolean;
  detail?: string;
  atISO: string;
}

/** 30-second shift-change handover from home-care / facility aides. */
export interface ShiftHandoverLog {
  id: string;
  patientId: string;
  delegateGrantId: string;
  performerLabel: string;
  shiftEndedAtISO: string;
  medsVerified: boolean;
  medsNote?: string;
  /** e.g. "Ate 75% lunch; 400 mL fluids" */
  intakeSummary: string;
  /** e.g. "Mild evening confusion, otherwise calm" */
  moodBehaviorSummary: string;
  /** Free-text for the family caregiver. */
  tellTheFamily?: string;
  observationIds: string[];
  /** MedicalEvents.id when provenance row saved. */
  sourceEventId?: string;
  createdAt: number;
}

/** Compact digest card for overnight / last shift handover. */
export interface DigestShiftHandoverSummary {
  handoverId: string;
  patientId: string;
  performerLabel: string;
  shiftEndedAtISO: string;
  medsVerified: boolean;
  intakeSummary: string;
  moodBehaviorSummary: string;
  tellTheFamily?: string;
}

export type CareImpactEventType =
  | 'SBAR_EXPORTED'
  | 'EMERGENCY_PASS_ISSUED'
  | 'SHIFT_HANDOVER_RECORDED'
  | 'FOI_DISPATCHED'
  | 'PORTAL_IMPORT_COMPLETED';

export interface CareImpactEvent {
  id: string;
  /** Household caregiver id when known; else patient-scoped. */
  caregiverId?: string;
  patientId?: string;
  type: CareImpactEventType;
  atISO: string;
  /** Non-PHI label for UI (never PHN / free clinical narrative). */
  label: string;
}

export interface CareImpactCount {
  type: CareImpactEventType;
  count: number;
  /** SaMD-safe caregiver-facing sentence. */
  copy: string;
}

export interface CareImpactSummary {
  caregiverId?: string;
  compiledAtISO: string;
  year: number;
  counts: CareImpactCount[];
  headline: string;
}

export interface SubmitShiftHandoverInput {
  tokenId: string;
  medsVerified: boolean;
  medsNote?: string;
  intakeSummary: string;
  moodBehaviorSummary: string;
  tellTheFamily?: string;
  /** Optional numeric vitals from the same form. */
  weightKg?: number;
  systolicMmHg?: number;
  diastolicMmHg?: number;
  mealPercent?: number;
  shiftEndedAtISO?: string;
  now?: Date;
}
