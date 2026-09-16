/**
 * Sandwich-generation caregiver digest payloads.
 * Daily = morning actionable scan; Weekly = 7-day trend overview.
 */

import type { DigestShiftHandoverSummary } from './careObservation';

export type DependantRole = 'aging_parent' | 'child' | 'self';

export interface DigestDependantRef {
  patientId: string;
  displayName: string; // e.g. "Dad (78) - Saskatoon"
  /** Caregiver-facing short label: Dad, Leo, Myself */
  nickname: string;
  role: DependantRole;
  ageYears: number;
  city: string;
}

export interface DigestMedicationDue {
  medicationId: string;
  name: string;
  dose?: string | null;
  scheduledTime: string; // HH:mm local
  given: boolean;
}

export interface DigestAppointment {
  appointmentId: string;
  title: string;
  startsAt: string; // ISO-8601
  location: string;
  preparationAlert: string;
}

export type OverdueTaskKind = 'FOI_PENDING' | 'MISSING_LAB_UPLOAD' | 'OTHER';

export interface DigestOverdueTask {
  taskId: string;
  kind: OverdueTaskKind;
  label: string;
  ageDays: number;
  /** Optional FOI request / MedicalEvent id when vault-backed. */
  relatedId?: string;
}

export interface DailyDependantSection {
  dependant: DigestDependantRef;
  medsToday: DigestMedicationDue[];
  appointmentsWithin72h: DigestAppointment[];
  overdueTasks: DigestOverdueTask[];
  /** Overnight / last ~36h aide shift handovers. */
  recentHandovers?: DigestShiftHandoverSummary[];
}

export interface DailyDigestPayload {
  caregiverId: string;
  compiledAt: string;
  headline: string;
  sections: DailyDependantSection[];
  totalMedsDue: number;
  totalAppointments: number;
  totalOverdue: number;
}

export interface VitalTrendPoint {
  date: string; // YYYY-MM-DD
  label: string;
  value: number;
  unit: string;
}

export interface MedicationAdherenceSummary {
  patientId: string;
  displayName: string;
  dosesScheduled: number;
  dosesTaken: number;
  adherenceRate: number; // 0–1
}

export interface WeeklyScheduleItem {
  patientId: string;
  displayName: string;
  title: string;
  startsAt: string;
}

/** Caregiver action items (book visits, refills) — not clinical tasks. */
export interface CaregiverTodo {
  todoId: string;
  label: string;
  patientId?: string;
  /** YYYY-MM-DD when known */
  dueDateKey?: string;
}

export interface WeeklyDigestPayload {
  caregiverId: string;
  compiledAt: string;
  weekOf: string; // YYYY-MM-DD (Monday)
  /** Inclusive start of the rolling next-7-days window (today). */
  windowStart: string;
  /** Inclusive end of the rolling next-7-days window. */
  windowEnd: string;
  headline: string;
  vitalTrends: VitalTrendPoint[];
  adherence: MedicationAdherenceSummary[];
  upcomingWeek: WeeklyScheduleItem[];
  caregiverTodos: CaregiverTodo[];
  narrativeSummary: string;
}

export type DigestNotificationKind = 'daily' | 'weekly';

export interface DigestNotificationDeepLink {
  kind: DigestNotificationKind;
  pathname: '/digest/daily' | '/digest/weekly';
  caregiverId: string;
}
