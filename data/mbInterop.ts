/**
 * Manitoba eChart / Shared Health interop catalog (data only).
 * eChart Manitoba is primarily clinician-facing. Public patient path is the
 * eChart PHI access form (and any care-org portal like MyCare Noona) — not SMART.
 */

import type { HealthAuthorityInterop } from '../types/interop';

export const MB_SHARED_AUTHORITY_ID = 'mb-shared';

export const MB_ECHART_PORTAL = {
  label: 'eChart Manitoba / Shared Health access',
  url: 'https://echartmanitoba.ca/manitobans/forms/',
  infoUrl: 'https://echartmanitoba.ca/',
  phiFormNote:
    'Request a copy of Laboratory/Pathology (and other) information via the eChart Personal Health Information form; signed originals by mail/fax.',
} as const;

export const MB_ECHART_EXPORT_PLAYBOOK = [
  {
    id: 'care-portal',
    title: 'Check any care-organization portal first',
    detail:
      'If CancerCare MyCare Noona or a hospital patient portal exposes labs, download/print there. Manitoba has no single provincial consumer portal like Health Gateway.',
  },
  {
    id: 'echart-phi',
    title: 'Request eChart personal health information',
    detail: `${MB_ECHART_PORTAL.phiFormNote} Forms: ${MB_ECHART_PORTAL.url}`,
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste returned lab text or portal screenshots, or import FHIR JSON if a partner/sandbox export is available. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'PHIA access when eChart copy is incomplete',
    detail:
      'Use the FOI wizard against Shared Health Manitoba or WRHA under The Personal Health Information Act (PHIA).',
  },
] as const;

export const MB_SMART_READINESS = {
  availability: 'NOT_PUBLIC' as const,
  message:
    'Manitoba does not publish a patient-facing SMART on FHIR launch for third-party apps. eChart is clinician-facing; patient copies are via PHI form or care-org portals.',
  requiredForLiveSync: [
    'Registered SMART client with Shared Health / Manitoba digital health',
    'Authorized FHIR R4 base URL and patient/*.read scopes',
    'Expo auth redirect URI',
    'Data-sharing agreement as required',
  ],
};

export const MB_SHARED_INTEROP: HealthAuthorityInterop = {
  syncMode: 'FILE_IMPORT',
  portalLabel: MB_ECHART_PORTAL.label,
  patientPortalUrl: MB_ECHART_PORTAL.url,
  notes:
    'Primary path: care-org portal print/OCR or eChart PHI lab copy → FILE_IMPORT. Optional FHIR JSON for partner/sandbox. FOI (PHIA) via Shared Health / WRHA. No public SMART.',
};
