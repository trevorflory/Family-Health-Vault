/**
 * Ontario patient-portal interop catalog (data only).
 * Ontario is fragmented (hospital MyChart instances + OLIS). Public path is
 * PDF/download from the caregiver’s MyChart or OLIS view — not a single SMART API.
 */

import type { HealthAuthorityInterop } from '../types/interop';

/** Provincial sync id for MyChart / OLIS FILE_IMPORT (FOI still uses UHN / OH / Sunnybrook). */
export const ON_PATIENT_PORTALS_AUTHORITY_ID = 'on-patient-portals';

export const ON_PATIENT_PORTALS = {
  label: 'Ontario MyChart / OLIS',
  /** Representative entry point — caregivers use their hospital’s MyChart URL. */
  url: 'https://www.ontariohealth.ca/',
  olisNote:
    'Many MyChart sites expose Ontario Laboratories Information System (OLIS) results via an Ontario Lab Results tab.',
} as const;

export const ON_EXPORT_PLAYBOOK = [
  {
    id: 'login',
    title: 'Sign in to your hospital MyChart (or myUHN / equivalent)',
    detail:
      'Ontario has no single provincial portal like Health Gateway. Use the MyChart issued by your care organization.',
  },
  {
    id: 'test-results',
    title: 'Open Test Results',
    detail:
      'Select a lab result, then Compare / View Trends when available. Download PDF of results where the site offers it.',
  },
  {
    id: 'olis',
    title: 'Check Ontario Lab Results (OLIS) if shown',
    detail: ON_PATIENT_PORTALS.olisNote,
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste lab PDF text, or import a FHIR JSON bundle if a partner/sandbox export is available. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI / access request when portals lack records',
    detail:
      'Use the FOI wizard against UHN, Sunnybrook, Ontario Health, or the treating facility under PHIPA.',
  },
] as const;

export const ON_SMART_READINESS = {
  availability: 'NOT_PUBLIC' as const,
  message:
    'Ontario does not offer a unified patient-facing SMART on FHIR launch for third-party apps. Hospital MyChart instances and OLIS are not a single OAuth target for this vault.',
  requiredForLiveSync: [
    'Per-hospital or Ontario Health SMART client registration',
    'Authorized FHIR R4 base URL(s) and patient/*.read scopes',
    'Expo auth redirect URI',
    'Data-sharing agreement(s) as required',
  ],
};

export const ON_PATIENT_PORTALS_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: ON_PATIENT_PORTALS.label,
  patientPortalUrl: ON_PATIENT_PORTALS.url,
  notes:
    'Fragmented FILE_IMPORT: hospital MyChart Test Results PDF + OLIS views. Optional FHIR JSON for partner/sandbox bundles. FOI (PHIPA) when portals incomplete. No public provincial SMART endpoint.',
};
