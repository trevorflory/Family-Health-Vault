/**
 * Nova Scotia YourHealthNS interop catalog (data only).
 * Public path is YourHealthNS Records (labs from Jan 2023+) via My NS Account —
 * view/share Patient Summary or print/OCR. No public third-party SMART launch.
 */

import type { HealthAuthorityInterop } from '../types/interop';

export const NS_NSHA_AUTHORITY_ID = 'ns-nsha';

export const NS_YOURHEALTH_PORTAL = {
  label: 'YourHealthNS',
  url: 'https://yourhealthns.ca/',
  infoUrl: 'https://www.nshealth.ca/yourhealthns-feedback',
} as const;

export const NS_YOURHEALTH_EXPORT_PLAYBOOK = [
  {
    id: 'login',
    title: 'Sign in to YourHealthNS with My NS Account',
    detail: `Open ${NS_YOURHEALTH_PORTAL.url} (or the YourHealthNS app). Create/verify a My NS Account with 2-step verification and health card number.`,
  },
  {
    id: 'records',
    title: 'Open Records → lab results',
    detail:
      'Blood, urine, and general lab results from January 2023 onward appear ~24 hours after validation. Diagnostic imaging, immunizations, and meds may also be listed.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'Use Patient Summary share/print or OCR/paste of lab screens, or import FHIR JSON if a partner/sandbox export is available. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'Access request when YourHealthNS is incomplete',
    detail:
      'Use the FOI wizard against Nova Scotia Health (Personal Health Information Act) for charts or older labs the portal does not show.',
  },
] as const;

export const NS_SMART_READINESS = {
  availability: 'NOT_PUBLIC' as const,
  message:
    'YourHealthNS does not publish a patient-facing SMART on FHIR launch for third-party apps. Provincial FHIR is used internally; live OAuth sync needs an NS Health partnership.',
  requiredForLiveSync: [
    'Registered SMART client with Nova Scotia Health',
    'Authorized FHIR R4 base URL and patient/*.read scopes',
    'Expo auth redirect URI',
    'Data-sharing agreement as required',
  ],
};

export const NS_YOURHEALTH_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: NS_YOURHEALTH_PORTAL.label,
  patientPortalUrl: NS_YOURHEALTH_PORTAL.url,
  notes:
    'Primary path: YourHealthNS Records / Patient Summary → print/OCR or text import. Optional FHIR JSON for partner/sandbox. FOI to NS Health when incomplete. No public SMART.',
};
