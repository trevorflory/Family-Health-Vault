/**
 * Remaining Canada FILE_IMPORT catalogs (NB, NL, PE, YT, NT, NU) — data only.
 */

import type { HealthAuthorityInterop } from '../types/interop';

export interface RemainingPlaybookStep {
  id: string;
  title: string;
  detail: string;
}

function interopFrom(
  portal: { label: string; url: string },
  notes: string,
): HealthAuthorityInterop {
  return {
    syncMode: 'FILE_IMPORT',
    portalLabel: portal.label,
    patientPortalUrl: portal.url,
    notes,
  };
}

export const NB_MYHEALTH_AUTHORITY_ID = 'nb-myhealth';
export const NB_MYHEALTH_PORTAL = {
  label: 'MyHealthNB',
  url: 'https://myhealth.gnb.ca/s/',
} as const;
export const NB_MYHEALTH_EXPORT_PLAYBOOK: readonly RemainingPlaybookStep[] = [
  {
    id: 'register',
    title: 'Register / unlock MyHealth Records',
    detail:
      'Get a registration code at an SNB Service Centre or at a Horizon/Vitalité lab or imaging visit, then create or upgrade your MyHealthNB account (age 16+ with NB Medicare).',
  },
  {
    id: 'labs',
    title: 'Open MyHealth Records → lab results',
    detail:
      'View and print finalized labs (general labs may reach back to 2010; sensitive categories can have a delay). Meds, immunizations, and imaging reports may also appear.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste printed or downloaded lab text, or import FHIR JSON if a partner/sandbox export is available. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'Access request when MyHealthNB is incomplete',
    detail:
      'Use the FOI wizard against Horizon Health Network or Vitalité Health Network under PHIPAA.',
  },
];

export const NL_NLHS_AUTHORITY_ID = 'nl-nlhs';
export const NL_MYHEALTH_PORTAL = {
  label: 'MyHealthNL',
  url: 'https://myhealthnl.ca/',
} as const;
export const NL_MYHEALTH_EXPORT_PLAYBOOK: readonly RemainingPlaybookStep[] = [
  {
    id: 'login',
    title: 'Sign in to MyHealthNL (MyChart)',
    detail: `Open ${NL_MYHEALTH_PORTAL.url} or the MyChart app, select NL Health Services, and sign in.`,
  },
  {
    id: 'results',
    title: 'Open test results',
    detail:
      'View labs, imaging reports, meds, and visit notes where available. Download/print results the portal exposes.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste result text or import FHIR JSON for partner/sandbox bundles. Confirm PENDING_REVIEW events before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'ATIPP when the portal is incomplete',
    detail:
      'Use the FOI wizard against Newfoundland and Labrador Health Services.',
  },
];

export const PE_HEALTHPEI_AUTHORITY_ID = 'pe-healthpei';
export const PE_MYHEALTH_PORTAL = {
  label: 'MyHealthPEI',
  url: 'https://www.princeedwardisland.ca/en/service/log-into-myhealthpei',
} as const;
export const PE_MYHEALTH_EXPORT_PLAYBOOK: readonly RemainingPlaybookStep[] = [
  {
    id: 'login',
    title: 'Sign in with a verified MyPEI account',
    detail:
      'Link your PEI Health Card in MyPEI, then open MyHealthPEI (age 16+) to view labs, imaging, and immunizations.',
  },
  {
    id: 'labs',
    title: 'View and download lab / imaging reports',
    detail:
      'Download results from MyHealthPEI when offered (provider systems remain separate from the resident portal).',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/paste downloaded text or import FHIR JSON for partner/sandbox. Confirm PENDING_REVIEW before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'Access request when MyHealthPEI is incomplete',
    detail:
      'Use the FOI wizard against Health PEI under FOIPP / health privacy rules.',
  },
];

export const YT_HSS_AUTHORITY_ID = 'yt-hss';
export const YT_ACCESS_PORTAL = {
  label: 'Yukon health record access (ATIPP / YHC)',
  url: 'https://yukon.ca/en/health-and-wellness',
} as const;
export const YT_ACCESS_EXPORT_PLAYBOOK: readonly RemainingPlaybookStep[] = [
  {
    id: 'provider',
    title: 'Ask your care team for printed or portal copies first',
    detail:
      '1Health / MEDITECH Expanse is provider-facing. Request labs from your clinic or Yukon Hospital Corporation health records when available.',
  },
  {
    id: 'atipp',
    title: 'File an ATIPP / health information access request',
    detail: `Use Yukon HSS ATIPP channels (${YT_ACCESS_PORTAL.url}) or YHC Release of Information for chart packages.`,
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/scan returned lab packages or import FHIR JSON for partner/sandbox. Confirm PENDING_REVIEW before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI wizard against Yukon HSS or YHC',
    detail: 'Use in-app FOI when mailed copies are incomplete.',
  },
];

export const NT_NTHSSA_AUTHORITY_ID = 'nt-nthssa';
export const NT_ACCESS_PORTAL = {
  label: 'NWT HealthNet / ATIPP access',
  url: 'https://www.hss.gov.nt.ca/en/services/nwt-healthnet/healthnet-viewer',
} as const;
export const NT_ACCESS_EXPORT_PLAYBOOK: readonly RemainingPlaybookStep[] = [
  {
    id: 'provider',
    title: 'Request labs from your NWT care provider',
    detail:
      'HealthNet Viewer / EMR tools are for authorized clinicians. Ask your clinic for printed or electronic copies of results.',
  },
  {
    id: 'atipp',
    title: 'ATIPP access request to NTHSSA',
    detail:
      'File an access request with NWT Health and Social Services Authority when you need a formal chart package.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/scan returned copies or import FHIR JSON for partner/sandbox. Confirm PENDING_REVIEW before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI wizard against NTHSSA',
    detail: 'Use in-app FOI / ATIPP prep when portal copies do not exist.',
  },
];

export const NU_HEALTH_AUTHORITY_ID = 'nu-health';
export const NU_ACCESS_PORTAL = {
  label: 'Nunavut Health ATIPP / records access',
  url: 'https://www.gov.nu.ca/health',
} as const;
export const NU_ACCESS_EXPORT_PLAYBOOK: readonly RemainingPlaybookStep[] = [
  {
    id: 'provider',
    title: 'Request copies from your health centre',
    detail:
      'Nunavut has no general consumer provincial portal comparable to Health Gateway. Start with your local health centre for lab printouts.',
  },
  {
    id: 'atipp',
    title: 'ATIPP request to Department of Health',
    detail:
      'Use Government of Nunavut ATIPP / health records channels for formal chart packages.',
  },
  {
    id: 'import-vault',
    title: 'Import into Family Health Vault',
    detail:
      'OCR/scan returned lab packages or import FHIR JSON for partner/sandbox. Confirm PENDING_REVIEW before digests/SBAR.',
  },
  {
    id: 'foi-fallback',
    title: 'FOI wizard against Nunavut Health',
    detail: 'Use in-app FOI when mailed copies are incomplete.',
  },
];

export const NB_MYHEALTH_INTEROP = interopFrom(
  NB_MYHEALTH_PORTAL,
  'Primary path: MyHealthNB MyHealth Records print/OCR. Optional FHIR JSON for partner/sandbox. FOI via Horizon/Vitalité. No public SMART — see data/canadaRemainingInterop.ts.',
);
export const NL_MYHEALTH_INTEROP = interopFrom(
  NL_MYHEALTH_PORTAL,
  'Primary path: MyHealthNL (MyChart) test results → print/OCR. Optional FHIR JSON. FOI via NLHS. No public SMART.',
);
export const PE_MYHEALTH_INTEROP = interopFrom(
  PE_MYHEALTH_PORTAL,
  'Primary path: MyHealthPEI download/print → OCR. Optional FHIR JSON. FOI via Health PEI. No public SMART.',
);
export const YT_ACCESS_INTEROP = interopFrom(
  YT_ACCESS_PORTAL,
  'No general consumer portal. Care-team copies or ATIPP → FILE_IMPORT. Optional FHIR sandbox. FOI via HSS/YHC.',
);
export const NT_ACCESS_INTEROP = interopFrom(
  NT_ACCESS_PORTAL,
  'HealthNet is clinician-facing. Provider copies or ATIPP → FILE_IMPORT. Optional FHIR sandbox.',
);
export const NU_ACCESS_INTEROP = interopFrom(
  NU_ACCESS_PORTAL,
  'No general consumer portal. Health-centre copies or ATIPP → FILE_IMPORT. Optional FHIR sandbox.',
);
