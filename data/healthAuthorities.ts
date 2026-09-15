import type {
  CanadianJurisdiction,
  HealthAuthorityContact,
} from '../types/foiPayload';
import { ALL_CANADIAN_JURISDICTIONS } from '../types/foiPayload';

/**
 * Provincial / territorial health authority & facility record-department templates.
 * At least one custodial contact per Canadian jurisdiction for FOI dispatch.
 * Addresses are illustrative templates for printable requests — verify before mailing.
 */
export const HEALTH_AUTHORITIES: HealthAuthorityContact[] = [
  // —— Alberta ——
  {
    id: 'ab-ahs',
    name: 'Alberta Health Services',
    jurisdiction: 'AB',
    departmentName: 'Health Information Management — Access & Disclosure',
    addressLines: [
      'Alberta Health Services',
      'Access & Disclosure',
      'Seventh Street Plaza, North Tower',
      '10030 107 Street NW',
      'Edmonton, AB T5J 3E4',
    ],
    phone: '1-855-442-3888',
    fax: '780-735-1152',
    email: 'access.disclosure@ahs.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'Alberta MyHealth Records',
      patientPortalUrl: 'https://myhealth.alberta.ca/',
      notes:
        'Primary path: MyHealth Print Lab Results / Print Reports PDF → OCR or text import (`importAbMyHealthLabText`). Optional FHIR JSON (`importAbFhirJsonExport`) for partner/sandbox bundles. FOI (HIA) when portal incomplete. No public SMART endpoint — see data/abInterop.ts.',
    },
  },
  // —— British Columbia ——
  {
    id: 'bc-health-gateway',
    name: 'BC Health Gateway (provincial portal)',
    jurisdiction: 'BC',
    departmentName: 'Health Gateway Support',
    addressLines: [
      'Ministry of Health — Health Gateway',
      'PO Box 9650 Stn Prov Govt',
      'Victoria, BC V8W 9P4',
    ],
    email: 'HealthGateway@gov.bc.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'BC Health Gateway',
      patientPortalUrl: 'https://healthgateway.gov.bc.ca/',
      notes:
        'Primary path: Health Gateway Download records (PDF) → OCR or text import (`importBcHealthGatewayLabText`). Optional FHIR JSON for partner/sandbox bundles. FOI against treating HA (Fraser/VCH/Island) when portal incomplete. No public SMART endpoint — see data/bcInterop.ts.',
    },
  },
  {
    id: 'bc-fraser',
    name: 'Fraser Health (BC)',
    jurisdiction: 'BC',
    departmentName: 'Information Access & Privacy',
    addressLines: [
      'Fraser Health Authority',
      'Information Access & Privacy Office',
      'Suite 400, 13450 102 Avenue',
      'Surrey, BC V3T 0H1',
    ],
    phone: '604-587-4600',
    fax: '604-587-4666',
    email: 'foi@fraserhealth.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'BC Health Gateway',
      patientPortalUrl: 'https://healthgateway.gov.bc.ca/',
      notes:
        'Facility FOI custodian. Prefer provincial Health Gateway download (`bc-health-gateway`) for lab/med exports; FOI here for charts Gateway lacks.',
    },
  },
  {
    id: 'bc-vch',
    name: 'Vancouver Coastal Health (BC)',
    jurisdiction: 'BC',
    departmentName: 'Freedom of Information Office',
    addressLines: [
      'Vancouver Coastal Health',
      'FOI Office',
      '11th Floor, 601 West Broadway',
      'Vancouver, BC V5Z 4C2',
    ],
    phone: '604-875-4252',
    email: 'foi@vch.ca',
  },
  {
    id: 'bc-island',
    name: 'Island Health (BC)',
    jurisdiction: 'BC',
    departmentName: 'Information Access & Privacy',
    addressLines: [
      'Island Health',
      'Information Access Office',
      '1952 Bay Street',
      'Victoria, BC V8R 1J8',
    ],
    phone: '250-370-8699',
    email: 'foi@islandhealth.ca',
  },
  // —— Manitoba ——
  {
    id: 'mb-shared',
    name: 'Shared Health Manitoba',
    jurisdiction: 'MB',
    departmentName: 'Health Information Services — Access to Personal Health Information',
    addressLines: [
      'Shared Health',
      'Health Information Services',
      '1502-155 Carlton Street',
      'Winnipeg, MB R3C 3H8',
    ],
    phone: '204-926-7000',
    email: 'phia@sharedhealthmb.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'eChart Manitoba / Shared Health access',
      patientPortalUrl: 'https://echartmanitoba.ca/manitobans/forms/',
      notes:
        'Primary path: care-org portal print/OCR or eChart PHI lab copy (`importMbEchartLabText`). Optional FHIR JSON for partner/sandbox. FOI (PHIA) here or WRHA when incomplete. No public SMART — see data/mbInterop.ts.',
    },
  },
  {
    id: 'mb-wrha',
    name: 'Winnipeg Regional Health Authority',
    jurisdiction: 'MB',
    departmentName: 'Privacy & Access Office',
    addressLines: [
      'Winnipeg Regional Health Authority',
      'Privacy Office',
      '650 Main Street',
      'Winnipeg, MB R3B 1E2',
    ],
    phone: '204-926-7000',
    email: 'privacy@wrha.mb.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'eChart Manitoba / Shared Health access',
      patientPortalUrl: 'https://echartmanitoba.ca/manitobans/forms/',
      notes:
        'Facility FOI custodian. Prefer eChart PHI / Shared Health FILE_IMPORT via mb-shared for lab copies; FOI here for WRHA charts portals lack.',
    },
  },
  // —— New Brunswick ——
  {
    id: 'nb-myhealth',
    name: 'MyHealthNB (provincial portal)',
    jurisdiction: 'NB',
    departmentName: 'MyHealthNB — Digital Health Account support',
    addressLines: [
      'Government of New Brunswick — MyHealthNB',
      'See myhealth.gnb.ca for support channels',
      'Fredericton, NB',
    ],
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'MyHealthNB',
      patientPortalUrl: 'https://myhealth.gnb.ca/s/',
      notes:
        'Primary path: MyHealth Records print/OCR (`importNbMyHealthLabText`). Optional FHIR JSON. FOI via Horizon/Vitalité. No public SMART — see data/canadaRemainingInterop.ts.',
    },
  },
  {
    id: 'nb-horizon',
    name: 'Horizon Health Network',
    jurisdiction: 'NB',
    departmentName: 'Health Information Management — Access Requests',
    addressLines: [
      'Horizon Health Network',
      'Health Records / Access',
      '80 Woodstock Road',
      'Fredericton, NB E3B 5N5',
    ],
    phone: '506-452-5200',
    email: 'health.records@horizonnb.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'MyHealthNB',
      patientPortalUrl: 'https://myhealth.gnb.ca/s/',
      notes:
        'Facility FOI custodian. Prefer MyHealthNB FILE_IMPORT via nb-myhealth for labs; FOI here for charts portals lack.',
    },
  },
  {
    id: 'nb-vitalite',
    name: 'Vitalité Health Network',
    jurisdiction: 'NB',
    departmentName: 'Gestion de l’information sur la santé — Accès',
    addressLines: [
      'Réseau de santé Vitalité',
      'Bureau d’accès à l’information',
      '330 Avenue Université',
      'Moncton, NB E1C 2Z3',
    ],
    phone: '506-862-4000',
    email: 'acces@vitalitenb.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'MyHealthNB',
      patientPortalUrl: 'https://myhealth.gnb.ca/s/',
      notes:
        'Facility FOI custodian. Prefer MyHealthNB FILE_IMPORT via nb-myhealth for labs; FOI here for establishment charts.',
    },
  },
  // —— Newfoundland and Labrador ——
  {
    id: 'nl-nlhs',
    name: 'Newfoundland and Labrador Health Services',
    jurisdiction: 'NL',
    departmentName: 'Health Information Management — Access to Information',
    addressLines: [
      'Newfoundland and Labrador Health Services',
      'Access to Information Office',
      '300 Prince Philip Drive',
      'St. John’s, NL A1B 3V6',
    ],
    phone: '709-777-6300',
    email: 'access@nlhealthservices.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'MyHealthNL',
      patientPortalUrl: 'https://myhealthnl.ca/',
      notes:
        'Primary path: MyHealthNL (MyChart) test results → print/OCR (`importNlMyHealthLabText`). Optional FHIR JSON. FOI here when incomplete. No public SMART.',
    },
  },
  // —— Nova Scotia ——
  {
    id: 'ns-nsha',
    name: 'Nova Scotia Health',
    jurisdiction: 'NS',
    departmentName: 'Privacy & Access to Personal Health Information',
    addressLines: [
      'Nova Scotia Health',
      'Privacy Office',
      '90 Lovett Lake Court, Suite 201',
      'Halifax, NS B3S 0H6',
    ],
    phone: '1-902-473-2700',
    email: 'privacy@nshealth.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'YourHealthNS',
      patientPortalUrl: 'https://yourhealthns.ca/',
      notes:
        'Primary path: YourHealthNS Records / Patient Summary → print/OCR (`importNsYourHealthLabText`). Optional FHIR JSON for partner/sandbox. FOI here when incomplete. No public SMART — see data/nsInterop.ts.',
    },
  },
  // —— Northwest Territories ——
  {
    id: 'nt-nthssa',
    name: 'NWT Health and Social Services Authority',
    jurisdiction: 'NT',
    departmentName: 'Health Information / ATIPP Access',
    addressLines: [
      'Northwest Territories Health and Social Services Authority',
      'Access to Information Coordinator',
      'Box 1320',
      'Yellowknife, NT X1A 2L9',
    ],
    phone: '867-767-9054',
    email: 'atipp@gov.nt.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'NWT HealthNet / ATIPP access',
      patientPortalUrl:
        'https://www.hss.gov.nt.ca/en/services/nwt-healthnet/healthnet-viewer',
      notes:
        'HealthNet is clinician-facing. Provider copies or ATIPP → FILE_IMPORT (`importNtAccessLabText`). No public SMART.',
    },
  },
  // —— Nunavut ——
  {
    id: 'nu-health',
    name: 'Government of Nunavut — Department of Health',
    jurisdiction: 'NU',
    departmentName: 'ATIPP / Health Records Access',
    addressLines: [
      'Department of Health',
      'ATIPP Coordinator',
      'Box 1000, Station 1000',
      'Iqaluit, NU X0A 0H0',
    ],
    phone: '867-975-5700',
    email: 'atipp@gov.nu.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'Nunavut Health ATIPP / records access',
      patientPortalUrl: 'https://www.gov.nu.ca/health',
      notes:
        'No general consumer portal. Health-centre copies or ATIPP → FILE_IMPORT (`importNuAccessLabText`). No public SMART.',
    },
  },
  // —— Ontario ——
  {
    id: 'on-patient-portals',
    name: 'Ontario MyChart / OLIS (provincial portal path)',
    jurisdiction: 'ON',
    departmentName: 'Patient portal FILE_IMPORT (not a single custodian)',
    addressLines: [
      'Ontario Health / hospital MyChart programs',
      'Use treating facility FOI contacts for chart packages',
      'Toronto, ON',
    ],
    email: 'privacy@ontariohealth.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'Ontario MyChart / OLIS',
      patientPortalUrl: 'https://www.ontariohealth.ca/',
      notes:
        'Fragmented FILE_IMPORT: hospital MyChart Test Results PDF + OLIS. Optional FHIR JSON for partner/sandbox. FOI (PHIPA) via UHN/Sunnybrook/OH when portals incomplete. No public provincial SMART — see data/onInterop.ts.',
    },
  },
  {
    id: 'on-uhn',
    name: 'University Health Network (ON)',
    jurisdiction: 'ON',
    departmentName: 'Health Records / Privacy Office',
    addressLines: [
      'University Health Network',
      'Health Records Department',
      '190 Elizabeth Street',
      'Toronto, ON M5G 2C4',
    ],
    phone: '416-340-3131',
    fax: '416-340-4186',
    email: 'health.records@uhn.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'myUHN / MyChart + OLIS',
      patientPortalUrl: 'https://www.myuhn.ca/',
      notes:
        'Facility FOI custodian. Prefer MyChart/OLIS download via on-patient-portals connector for lab exports; FOI here for charts portals lack.',
    },
  },
  {
    id: 'on-oh',
    name: 'Ontario Health — Provincial Programs',
    jurisdiction: 'ON',
    departmentName: 'Privacy & Access to Information',
    addressLines: [
      'Ontario Health',
      'Privacy Office',
      '525 University Avenue, 5th Floor',
      'Toronto, ON M5G 2L3',
    ],
    phone: '1-877-660-6066',
    email: 'privacy@ontariohealth.ca',
  },
  {
    id: 'on-sunnybrook',
    name: 'Sunnybrook Health Sciences Centre',
    jurisdiction: 'ON',
    departmentName: 'Health Data & Privacy — Release of Information',
    addressLines: [
      'Sunnybrook Health Sciences Centre',
      'Health Records — Release of Information',
      '2075 Bayview Avenue',
      'Toronto, ON M4N 3M5',
    ],
    phone: '416-480-6100',
    email: 'roi@sunnybrook.ca',
  },
  // —— Prince Edward Island ——
  {
    id: 'pe-healthpei',
    name: 'Health PEI',
    jurisdiction: 'PE',
    departmentName: 'Health Information Management — Access Requests',
    addressLines: [
      'Health PEI',
      'Health Records / Access',
      '16 Garfield Street',
      'Charlottetown, PE C1A 7N8',
    ],
    phone: '902-368-6130',
    email: 'healthrecords@ihis.org',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'MyHealthPEI',
      patientPortalUrl:
        'https://www.princeedwardisland.ca/en/service/log-into-myhealthpei',
      notes:
        'Primary path: MyHealthPEI download/print → OCR (`importPeMyHealthLabText`). Optional FHIR JSON. FOI here when incomplete. No public SMART.',
    },
  },
  // —— Quebec ——
  {
    id: 'qc-carnet-sante',
    name: 'Carnet santé Québec (provincial portal)',
    jurisdiction: 'QC',
    departmentName: 'Carnet santé Québec — soutien usager',
    addressLines: [
      'Gouvernement du Québec — Carnet santé Québec',
      'See carnetsante.gouv.qc.ca for support channels',
      'Québec, QC',
    ],
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'Carnet santé Québec',
      patientPortalUrl: 'https://carnetsante.gouv.qc.ca/portail',
      notes:
        'Primary path: Carnet santé lab/imaging view → print/OCR (`importQcCarnetLabText`). Optional FHIR JSON for partner/sandbox. FOI to treating CIUSSS when incomplete. No public SMART — see data/qcInterop.ts.',
    },
  },
  {
    id: 'qc-ciusss-centresud',
    name: 'CIUSSS du Centre-Sud-de-l’Île-de-Montréal',
    jurisdiction: 'QC',
    departmentName: 'Accès au dossier de l’usager / Privacy',
    addressLines: [
      'CIUSSS du Centre-Sud-de-l’Île-de-Montréal',
      'Bureau d’accès aux documents',
      '66, boulevard René-Lévesque Est',
      'Montréal, QC H2X 1N1',
    ],
    phone: '514-593-3600',
    email: 'acces.dossier@ccsmtl.gouv.qc.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'Carnet santé Québec',
      patientPortalUrl: 'https://carnetsante.gouv.qc.ca/portail',
      notes:
        'Facility FOI custodian. Prefer Carnet santé download/print via qc-carnet-sante for labs; FOI here for establishment charts.',
    },
  },
  {
    id: 'qc-sante',
    name: 'Santé Québec — Accès aux documents',
    jurisdiction: 'QC',
    departmentName: 'Accès à l’information et protection des renseignements',
    addressLines: [
      'Santé Québec',
      'Responsable de l’accès aux documents',
      '1000, rue De La Gauchetière Ouest',
      'Montréal, QC H3B 4W5',
    ],
    phone: '1-877-644-4545',
    email: 'acces@sante.quebec',
  },
  // —— Saskatchewan ——
  {
    id: 'sk-sha',
    name: 'Saskatchewan Health Authority',
    jurisdiction: 'SK',
    departmentName: 'Health Information Management — Access to Information',
    addressLines: [
      'Saskatchewan Health Authority',
      'Access to Information Office',
      '2121 11th Avenue',
      'Regina, SK S4P 3X3',
    ],
    phone: '1-877-800-0002',
    fax: '306-766-5970',
    email: 'access.information@saskhealthauthority.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'MySaskHealthRecord',
      patientPortalUrl: 'https://services.ehealthsask.ca/MySaskHealthRecord',
      notes:
        'Primary path: MySask PDF/lab export → OCR or text import (`importSkMySaskLabText`). Optional FHIR JSON (`importSkFhirJsonExport`) for partner/sandbox bundles. FOI (HIPA) when portal incomplete. No public SMART endpoint — see data/skInterop.ts.',
    },
  },
  // —— Yukon ——
  {
    id: 'yt-hss',
    name: 'Yukon Health and Social Services',
    jurisdiction: 'YT',
    departmentName: 'ATIPP / Health Information Access',
    addressLines: [
      'Government of Yukon',
      'Department of Health and Social Services — ATIPP',
      'Box 2703',
      'Whitehorse, YT Y1A 2C6',
    ],
    phone: '867-667-3673',
    email: 'atipp@yukon.ca',
    interop: {
      syncMode: 'FILE_IMPORT',
      portalLabel: 'Yukon health record access (ATIPP / YHC)',
      patientPortalUrl: 'https://yukon.ca/en/health-and-wellness',
      notes:
        '1Health is clinician-facing. Care-team copies or ATIPP → FILE_IMPORT (`importYtAccessLabText`). FOI via HSS/YHC. No public SMART.',
    },
  },
  {
    id: 'yt-yhc',
    name: 'Yukon Hospital Corporation',
    jurisdiction: 'YT',
    departmentName: 'Health Records — Release of Information',
    addressLines: [
      'Yukon Hospital Corporation',
      'Health Records',
      '5 Hospital Road',
      'Whitehorse, YT Y1A 3H7',
    ],
    phone: '867-393-8700',
    email: 'health.records@wgh.yk.ca',
    interop: {
      syncMode: 'MANUAL_ONLY',
      portalLabel: 'Yukon health record access (ATIPP / YHC)',
      patientPortalUrl: 'https://yukon.ca/en/health-and-wellness',
      notes:
        'Facility FOI custodian. Prefer yt-hss FILE_IMPORT path for ATIPP packages; FOI here for hospital charts.',
    },
  },
];

export function facilitiesForJurisdiction(
  jurisdiction: CanadianJurisdiction,
): HealthAuthorityContact[] {
  return HEALTH_AUTHORITIES.filter((f) => f.jurisdiction === jurisdiction);
}

export function getFacilityById(id: string): HealthAuthorityContact | undefined {
  return HEALTH_AUTHORITIES.find((f) => f.id === id);
}

/** Every province/territory must have ≥1 facility template. */
export function jurisdictionsMissingFacilities(): CanadianJurisdiction[] {
  return ALL_CANADIAN_JURISDICTIONS.filter(
    (code) => facilitiesForJurisdiction(code).length === 0,
  );
}
