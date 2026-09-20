/**
 * Health-authority / provincial-portal interoperability types (Phase B).
 * Read/import only — never write back to custodian systems.
 */

export type InteropSyncMode = 'SMART_FHIR' | 'FILE_IMPORT' | 'MANUAL_ONLY';

export interface HealthAuthorityInterop {
  /** How this custodian can feed the local vault today. */
  syncMode: InteropSyncMode;
  /** Patient-facing portal URL when known. */
  patientPortalUrl?: string;
  /** FHIR R4 base URL when a SMART/partner endpoint exists. */
  fhirBaseUrl?: string;
  /** Human portal / vendor label (e.g. MySaskHealthRecord). */
  portalLabel?: string;
  /** Caregiver-facing note when sync is manual or FOI-only. */
  notes?: string;
}

export type MedicalEventSourceType =
  | 'OCR'
  | 'FHIR'
  | 'CCD'
  | 'FILE_IMPORT'
  | 'EHR_LTC'
  | 'MANUAL';

export interface InteropPullResult {
  authorityId: string;
  /** ISO 3166-2:CA code — kept as string to avoid types cycle with foiPayload. */
  jurisdiction: string;
  importedCount: number;
  skippedCount: number;
  syncedAt: string;
  notes: string[];
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

/** Minimal FHIR R4 Observation subset for vault import / care export. */
export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  status?: string;
  code?: FhirCodeableConcept;
  effectiveDateTime?: string;
  subject?: { reference?: string };
  performer?: Array<{ display?: string }>;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  component?: Array<{
    code?: FhirCodeableConcept;
    valueQuantity?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
  }>;
  referenceRange?: Array<{
    text?: string;
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
  }>;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  dosageInstruction?: Array<{
    text?: string;
    timing?: { code?: FhirCodeableConcept };
  }>;
  requester?: { display?: string };
}

export interface FhirImmunization {
  resourceType: 'Immunization';
  id?: string;
  status?: string;
  vaccineCode?: FhirCodeableConcept;
  occurrenceDateTime?: string;
}

/** Thin MedicationAdministration stub for med-verify exports. */
export interface FhirMedicationAdministration {
  resourceType: 'MedicationAdministration';
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  effectiveDateTime?: string;
  subject?: { reference?: string };
  note?: Array<{ text?: string }>;
}

/** Thin DocumentReference stub for care-home log provenance. */
export interface FhirDocumentReference {
  resourceType: 'DocumentReference';
  id?: string;
  status?: string;
  type?: FhirCodeableConcept;
  subject?: { reference?: string };
  date?: string;
  description?: string;
}

export type FhirImportResource =
  | FhirObservation
  | FhirMedicationRequest
  | FhirImmunization
  | FhirMedicationAdministration
  | FhirDocumentReference;

export interface FhirBundle {
  resourceType?: 'Bundle';
  type?: string;
  timestamp?: string;
  entry?: Array<{ resource?: FhirImportResource }>;
}
