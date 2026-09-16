/**
 * BC Health Gateway interop catalog (data only).
 * Public path is Download records (PDF/CSV/XLSX) — not a third-party SMART FHIR API.
 */

import type { HealthAuthorityInterop } from '../types/interop';

/** Provincial portal sync id (FOI for facility charts still uses Fraser/VCH/Island templates). */
export const BC_HEALTH_GATEWAY_AUTHORITY_ID = 'bc-health-gateway';

export const BC_HEALTH_GATEWAY_PORTAL = {
  label: 'BC Health Gateway',
  url: 'https://healthgateway.gov.bc.ca/',
  supportEmail: 'HealthGateway@gov.bc.ca',
  guideUrl:
    'https://www2.gov.bc.ca/gov/content/health/managing-your-health/health-gateway/guide/export',
} as const;

/** Caregiver export steps — Download records / lab report PDF flow (desktop browser). */
export const BC_HEALTH_GATEWAY_EXPORT_PLAYBOOK = [
  {
    id: 'login',
    title: 'Sign in to Health Gateway',
    detail: `Open ${BC_HEALTH_GATEWAY_PORTAL.url} on a desktop browser (download is not in the mobile app).`,
  },
  {
    id: 'download-records',
    title: 'Open Download records',
    detail:
      'Choose Lab results (one record type at a time). Use Advanced filters for a date range if needed.',
  },
  {
    id: 'format',
    title: 'Download as PDF or CSV/XLSX',
    detail:
      'Prefer PDF for OCR into the vault. CSV/XLSX columns like Test Name, Result, Units, Reference Range, Collection Date import via `importBcHealthGatewayCsv` without OCR.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste lab PDF text, import CSV via the Health Gateway CSV path, or import a FHIR JSON bundle for partner/sandbox. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI when Health Gateway lacks records',
    detail:
      'Use the FOI wizard against the treating health authority (Fraser, VCH, Island, etc.) under FIPPA/PIPA as applicable.',
  },
] as const;

export const BC_SMART_READINESS = {
  availability: 'NOT_PUBLIC' as const,
  message:
    'BC Health Gateway does not publish a patient-facing SMART on FHIR launch for third-party apps. Live OAuth sync requires a Ministry / Health Gateway partnership.',
  requiredForLiveSync: [
    'Registered SMART client with BC Ministry of Health / Health Gateway',
    'Authorized FHIR R4 base URL and patient/*.read scopes',
    'Expo auth redirect URI',
    'Data-sharing agreement as required',
  ],
};

export const BC_HEALTH_GATEWAY_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: BC_HEALTH_GATEWAY_PORTAL.label,
  patientPortalUrl: BC_HEALTH_GATEWAY_PORTAL.url,
  notes:
    'Primary path: Health Gateway Download records (PDF) → OCR or text import. Optional FHIR JSON for partner/sandbox bundles. FOI against treating HA when portal incomplete. No public SMART endpoint.',
};

export const BC_HEALTH_GATEWAY_CONTACT = {
  id: BC_HEALTH_GATEWAY_AUTHORITY_ID,
  name: 'BC Health Gateway (provincial portal)',
  jurisdiction: 'BC' as const,
  departmentName: 'Health Gateway Support',
  addressLines: [
    'Ministry of Health — Health Gateway',
    'PO Box 9650 Stn Prov Govt',
    'Victoria, BC V8W 9P4',
  ],
  email: BC_HEALTH_GATEWAY_PORTAL.supportEmail,
  interop: BC_HEALTH_GATEWAY_INTEROP,
};
