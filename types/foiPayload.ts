/**
 * FOI / Access to Information request payload types.
 * Source of truth for PDF generation and local persistence.
 */

/** All Canadian provinces and territories (ISO 3166-2:CA subdivision codes). */
export type CanadianJurisdiction =
  | 'AB'
  | 'BC'
  | 'MB'
  | 'NB'
  | 'NL'
  | 'NS'
  | 'NT'
  | 'NU'
  | 'ON'
  | 'PE'
  | 'QC'
  | 'SK'
  | 'YT';

export const ALL_CANADIAN_JURISDICTIONS: readonly CanadianJurisdiction[] = [
  'AB',
  'BC',
  'MB',
  'NB',
  'NL',
  'NS',
  'NT',
  'NU',
  'ON',
  'PE',
  'QC',
  'SK',
  'YT',
] as const;

export type FOIRequestStatus = 'DRAFT' | 'DISPATCHED';

export type FOIScopeItem =
  | 'FULL_CHART'
  | 'DICOM_CDS'
  | 'LAB_HISTORY'
  | 'SPECIALIST_NOTES';

export interface HealthAuthorityContact {
  id: string;
  name: string;
  jurisdiction: CanadianJurisdiction;
  departmentName: string;
  addressLines: string[];
  phone?: string;
  fax?: string;
  email?: string;
}

export interface PatientIdentity {
  patientId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  /** Masked / encrypted health number for display & PDF (never log raw). */
  encryptedPhn: string;
}

export interface ApplicantDetails {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  mailingAddress: string;
  /** True when applicant holds Power of Attorney / substitute decision-maker authority. */
  hasPowerOfAttorney: boolean;
}

export interface AuthorityAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  kind: 'POA' | 'DRIVERS_LICENSE' | 'OTHER_ID';
}

export interface FeeWaiverJustification {
  requested: boolean;
  reason?: string;
}

export interface FOIRequestPayload {
  jurisdiction: CanadianJurisdiction;
  facility: HealthAuthorityContact;
  patient: PatientIdentity;
  scope: FOIScopeItem[];
  applicant: ApplicantDetails;
  attachments: AuthorityAttachment[];
  feeWaiver: FeeWaiverJustification;
  requestedAt: string; // ISO-8601
}

export interface FOIRequestRecord {
  id: string;
  patientId: string;
  jurisdiction: CanadianJurisdiction;
  facilityId: string;
  payloadJson: string;
  pdfUri: string | null;
  status: FOIRequestStatus;
  createdAt: string;
  updatedAt: string;
}
