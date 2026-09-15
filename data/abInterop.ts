/**
 * Alberta MyHealth Records interop catalog (data only).
 * Public path is PDF/Print Reports export — not a third-party SMART FHIR API.
 */

import type { HealthAuthorityInterop } from '../types/interop';

export const AB_AHS_AUTHORITY_ID = 'ab-ahs';

export const MYHEALTH_AB_PORTAL = {
  label: 'Alberta MyHealth Records',
  url: 'https://myhealth.alberta.ca/',
  supportPhone: '1-800-315-6028',
} as const;

/** Caregiver export steps — Print Reports / Print Lab Results PDF flow. */
export const MYHEALTH_AB_EXPORT_PLAYBOOK = [
  {
    id: 'login',
    title: 'Sign in to MyHealth Records',
    detail: `Open ${MYHEALTH_AB_PORTAL.url} with a verified Alberta.ca Account.`,
  },
  {
    id: 'print-lab',
    title: 'Open Print Lab Results or Print Reports',
    detail:
      'Choose Lab Results (and optional other sections), set a date range, then Export as PDF.',
  },
  {
    id: 'download',
    title: 'Download when status leaves pending',
    detail: 'Save the PDF on-device once generation completes.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste lab PDF text, or import a FHIR JSON bundle if a partner/sandbox export is available. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI / access request when the portal lacks records',
    detail:
      'Use the FOI wizard against Alberta Health Services (ab-ahs) under HIA when MyHealth is incomplete.',
  },
] as const;

export const AB_SMART_READINESS = {
  availability: 'NOT_PUBLIC' as const,
  message:
    'Alberta MyHealth Records does not publish a patient-facing SMART on FHIR launch for third-party apps. Live OAuth sync requires an AHS / Alberta Health partnership.',
  requiredForLiveSync: [
    'Registered SMART client with Alberta Health / AHS',
    'Authorized FHIR R4 base URL and patient/*.read scopes',
    'Expo auth redirect URI',
    'Data-sharing agreement as required',
  ],
};

export const AB_AHS_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: MYHEALTH_AB_PORTAL.label,
  patientPortalUrl: MYHEALTH_AB_PORTAL.url,
  notes:
    'Primary path: MyHealth Print Lab Results / Print Reports PDF → OCR or text import. Optional FHIR JSON for partner/sandbox bundles. FOI (HIA) when portal incomplete. No public SMART endpoint.',
};
