/**
 * Local SQLite schema types for the Healthcare App.
 * Source of truth for table shapes used by repositories under `db/`.
 */

export type MedicalEventKind =
  | 'LAB_RESULT'
  | 'PRESCRIPTION'
  | 'PORTAL_SCREENSHOT'
  | 'UNSTRUCTURED_DOC'
  | 'VISIT_DEBRIEF';

export type MedicalEventStatus = 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED';

export interface LabResultParsed {
  testName: string;
  value: string;
  units: string;
  referenceRange?: string;
}

export interface PrescriptionParsed {
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string;
}

export interface OcrParsedPayload {
  documentHint: 'lab' | 'prescription' | 'unknown';
  labs: LabResultParsed[];
  prescriptions: PrescriptionParsed[];
  /** Confidence-oriented notes for the verification UI (not clinical advice). */
  parserNotes: string[];
}

export interface VisitDebriefDosageChange {
  medicationName: string;
  changeDescription: string;
}

export interface VisitDebriefParsed {
  eventType: 'VISIT_DEBRIEF';
  discussionSummary: string;
  dosageChanges: VisitDebriefDosageChange[];
  actionItems: string[];
}

export type MedicalEventParsedPayload = OcrParsedPayload | VisitDebriefParsed;

/** Row shape for the `MedicalEvents` SQLite table. */
export interface MedicalEventRecord {
  id: string;
  patientId: string;
  kind: MedicalEventKind;
  sourceUri: string | null;
  rawText: string;
  /** Serialized `MedicalEventParsedPayload`. */
  parsedJson: string;
  status: MedicalEventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMedicalEventInput {
  id?: string;
  patientId: string;
  kind: MedicalEventKind;
  sourceUri?: string | null;
  rawText: string;
  parsed: MedicalEventParsedPayload;
  status: MedicalEventStatus;
}

/** Canonical local database filename. */
export const HEALTHCARE_DB_NAME = 'healthcare.db';

export const MEDICAL_EVENTS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS MedicalEvents (
  id TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('LAB_RESULT', 'PRESCRIPTION', 'PORTAL_SCREENSHOT', 'UNSTRUCTURED_DOC', 'VISIT_DEBRIEF')),
  sourceUri TEXT,
  rawText TEXT NOT NULL,
  parsedJson TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING_REVIEW', 'CONFIRMED', 'REJECTED')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_medical_events_patient ON MedicalEvents(patientId);
CREATE INDEX IF NOT EXISTS idx_medical_events_status ON MedicalEvents(status);
`;
