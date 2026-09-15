/**
 * Saskatchewan digital front-door interop catalog (data only).
 * MySaskHealthRecord today exposes PDF/report exports — not a public SMART FHIR API.
 * Connector code should prefer file/text import + FOI fallback until a partner endpoint exists.
 */

import type { HealthAuthorityInterop } from '../types/interop';

export const SK_SHA_AUTHORITY_ID = 'sk-sha';

export const MYSASK_PORTAL = {
  label: 'MySaskHealthRecord',
  url: 'https://services.ehealthsask.ca/MySaskHealthRecord',
  operator: 'eHealth Saskatchewan',
  supportPhone: '1-844-767-8259',
  supportEmail: 'MySaskHealthRecord@ehealthsask.ca',
} as const;

/** Structured caregiver export steps — mirrors eHealth “Files and Reports” PDF flow. */
export const MYSASK_EXPORT_PLAYBOOK = [
  {
    id: 'login',
    title: 'Sign in to MySaskHealthRecord',
    detail: `Open ${MYSASK_PORTAL.url} (or the official app) and authenticate.`,
  },
  {
    id: 'files-reports',
    title: 'Open Account → Files and Reports',
    detail:
      'Use Report Generator / Export information (not a FHIR download in the public portal today).',
  },
  {
    id: 'lab-pdf',
    title: 'Generate a Lab Results PDF',
    detail:
      'Select Lab Results (and date range as needed), generate the PDF, then save it on-device.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'Prefer: paste/OCR the PDF text via Upload Document, or import a FHIR JSON export if a partner/sandbox bundle is available. Confirm PENDING_REVIEW events before relying on digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI / access request when the portal lacks records',
    detail:
      'Use the FOI wizard against Saskatchewan Health Authority (sk-sha) or eHealth Privacy Service for eHR Viewer extracts under HIPA.',
  },
] as const;

export type SkSmartAvailability =
  | 'NOT_PUBLIC'
  | 'PARTNER_PENDING'
  | 'FILE_IMPORT_ONLY';

export interface SkSmartReadiness {
  availability: SkSmartAvailability;
  message: string;
  requiredForLiveSync: string[];
}

/**
 * Honest SMART readiness — do not claim a live MySask OAuth/FHIR endpoint.
 */
export const SK_SMART_READINESS: SkSmartReadiness = {
  availability: 'NOT_PUBLIC',
  message:
    'MySaskHealthRecord does not publish a patient-facing SMART on FHIR launch for third-party apps. Live OAuth sync requires an eHealth/SHA partnership.',
  requiredForLiveSync: [
    'Registered SMART client (client_id) with eHealth Saskatchewan / SHA',
    'Authorized FHIR R4 base URL and scopes (patient/*.read)',
    'Redirect URI for Expo auth session',
    'Business Associate / data-sharing agreement as required',
  ],
};

/** Canonical interop metadata for sk-sha (also mirrored on HealthAuthorityContact). */
export const SK_SHA_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: MYSASK_PORTAL.label,
  patientPortalUrl: MYSASK_PORTAL.url,
  notes:
    'Primary path: MySask PDF/lab export → OCR or text import. Optional FHIR JSON import for partner/sandbox bundles. FOI (HIPA) when portal incomplete. No public SMART endpoint.',
};

export const EHEALTH_PRIVACY_FALLBACK = {
  name: 'eHealth Saskatchewan — Privacy Service',
  phone: '1-844-767-8259',
  notes:
    'Request eHR Viewer extracts via the access-to-personal-health-information form when MySask lacks the record.',
} as const;
