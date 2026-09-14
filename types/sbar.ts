/**
 * 1-page physician-ready SBAR summarizer types.
 * Health Canada SaMD safeguard: Educational Context Summarizer only —
 * Assessment is caregiver observations, never a clinical verdict.
 */

export interface SBARInput {
  /** Why the caregiver is bringing this note to the visit. */
  visitReason: string;
  /** Free-text post-visit / voice-memo debrief (Whisper stand-in). */
  caregiverNotes?: string;
  /** Optional household appointment id (e.g. appt-dad-gp). */
  appointmentId?: string;
  /**
   * When true (default), pull CONFIRMED/PENDING_REVIEW MedicalEvents
   * (VISIT_DEBRIEF, LAB_RESULT, PRESCRIPTION) into the SBAR.
   */
  includeMedicalEvents?: boolean;
}

export interface SBARAppointmentContext {
  appointmentId: string;
  title: string;
  startsAt: string;
  location: string;
}

export interface SBARSections {
  situation: string;
  background: string;
  /** Caregiver observations / concerns — not a clinical assessment. */
  assessment: string;
  /** Talking points and documents to bring — not treatment plans. */
  recommendation: string;
}

export interface SBARDocument {
  patientId: string;
  patientDisplayName: string;
  compiledAt: string;
  appointment: SBARAppointmentContext | null;
  sections: SBARSections;
  documentsToBring: string[];
  /** MedicalEvents ids that contributed context. */
  sourceEventIds: string[];
  /** Short human labels for UI (e.g. "CONFIRMED lab: eGFR 55"). */
  sourceEventSummaries: string[];
  regulatoryNotice: string;
}
