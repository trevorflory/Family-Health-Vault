/**
 * 811 Call Assistant types.
 * Health Canada SaMD safeguard: this module is a Contextual Summarizer /
 * Caregiver Script Assistant only — never a diagnostic or prescribing engine.
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

export interface Triage811Output {
  /** ~30-second verbatim script for the caregiver to read to the 811 nurse. */
  spokenIntroScript: string;
  /** Relevant historical context markers (not diagnoses). */
  historicalRedFlags: string[];
  /** Exactly 3 concrete questions for the caregiver to ask the 811 nurse. */
  questionsToAskNurse: [string, string, string];
  /** Explicit non-diagnostic disclaimer for UI surfaces. */
  regulatoryNotice: string;
}
