/**
 * 811 Call Assistant types.
 * Health Canada SaMD safeguard: this module is a Contextual Summarizer /
 * Caregiver Script Assistant only — never a diagnostic or prescribing engine.
 *
 * Product framing: provincial 811 nurses follow a structured dispatcher script
 * and ask the caller questions. This module pre-fills vault-backed answers so
 * a flustered caregiver can respond — it does not triage or decide disposition.
 */

export type BiologicalSex = 'female' | 'male' | 'intersex' | 'unspecified';

export interface MedicationRecord {
  name: string;
  dose?: string | null;
  frequency?: string | null;
}

export interface PatientVaultProfile {
  patientId: string;
  fullName: string;
  preferredName?: string;
  /** Age in years; derived from DOB at runtime when omitted. */
  ageYears: number;
  sex: BiologicalSex;
  relationshipLabel: string; // e.g. "father", "mother", "spouse", "child"
  chronicConditions: string[];
  /** Active medications; entries may omit dose/frequency. */
  activeMedications: Array<MedicationRecord | null | undefined>;
  recentEvents?: string[];
  historicalMarkers?: string[];
}

/** One expected 811 dispatcher prompt + a vault-backed ready answer. */
export interface DispatcherCue {
  /** What the triage nurse / dispatcher is likely to ask. */
  dispatcherAsks: string;
  /** Concise answer the caregiver can read from the vault + selected symptoms. */
  readyAnswer: string;
}

export interface Triage811Output {
  /** ~30-second verbatim opening when the nurse asks why you are calling. */
  spokenIntroScript: string;
  /**
   * Exactly 4 protocol-aligned cues mirroring a typical 811 dispatcher script
   * (who / what’s happening / history+meds / recent context).
   */
  dispatcherCueSheet: [DispatcherCue, DispatcherCue, DispatcherCue, DispatcherCue];
  /** Relevant historical context markers (not diagnoses). */
  historicalRedFlags: string[];
  /**
   * Exactly 3 clarifying questions the caregiver may ask after answering the
   * nurse’s script — solicit clinical judgment; never assert acuity.
   */
  questionsToAskNurse: [string, string, string];
  /** Explicit non-diagnostic disclaimer for UI surfaces. */
  regulatoryNotice: string;
}
