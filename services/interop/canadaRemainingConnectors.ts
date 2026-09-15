/**
 * Remaining Canada FILE_IMPORT connectors (NB, NL, PE, YT, NT, NU).
 */

import {
  NB_MYHEALTH_AUTHORITY_ID,
  NB_MYHEALTH_EXPORT_PLAYBOOK,
  NB_MYHEALTH_PORTAL,
  NL_MYHEALTH_EXPORT_PLAYBOOK,
  NL_MYHEALTH_PORTAL,
  NL_NLHS_AUTHORITY_ID,
  NT_ACCESS_EXPORT_PLAYBOOK,
  NT_ACCESS_PORTAL,
  NT_NTHSSA_AUTHORITY_ID,
  NU_ACCESS_EXPORT_PLAYBOOK,
  NU_ACCESS_PORTAL,
  NU_HEALTH_AUTHORITY_ID,
  PE_HEALTHPEI_AUTHORITY_ID,
  PE_MYHEALTH_EXPORT_PLAYBOOK,
  PE_MYHEALTH_PORTAL,
  YT_ACCESS_EXPORT_PLAYBOOK,
  YT_ACCESS_PORTAL,
  YT_HSS_AUTHORITY_ID,
} from '../../data/canadaRemainingInterop';
import {
  buildCkdSampleResources,
  createFileImportProvince,
} from './fileImportProvinceKit';

export {
  NB_MYHEALTH_AUTHORITY_ID,
  NL_NLHS_AUTHORITY_ID,
  NT_NTHSSA_AUTHORITY_ID,
  NU_HEALTH_AUTHORITY_ID,
  PE_HEALTHPEI_AUTHORITY_ID,
  YT_HSS_AUTHORITY_ID,
};

export const nbMyHealth = createFileImportProvince({
  authorityId: NB_MYHEALTH_AUTHORITY_ID,
  jurisdiction: 'NB',
  portal: NB_MYHEALTH_PORTAL,
  playbook: NB_MYHEALTH_EXPORT_PLAYBOOK,
  smartMessage:
    'MyHealthNB does not publish a patient-facing SMART on FHIR launch for third-party apps. Live OAuth sync requires a New Brunswick partnership.',
  sampleResources: buildCkdSampleResources('nb', {
    egfr: 57,
    hba1c: 6.9,
    med: 'Ramipril',
    dose: '5 mg once daily',
    clinician: 'Dr. J. LeBlanc',
    when: '2026-03-01T12:00:00Z',
  }),
  labChromePattern:
    /myhealthnb|my\s*health\s*nb|myhealth\s*records|horizon|vitalit[eé]|portal\s*screenshot/i,
  labChromePrefix: 'MyHealthNB Portal Screenshot / MyHealth Records labs',
  labNote:
    'Imported via MyHealthNB lab text path — confirm values before CONFIRMED.',
});

export const nlMyHealth = createFileImportProvince({
  authorityId: NL_NLHS_AUTHORITY_ID,
  jurisdiction: 'NL',
  portal: NL_MYHEALTH_PORTAL,
  playbook: NL_MYHEALTH_EXPORT_PLAYBOOK,
  smartMessage:
    'MyHealthNL (MyChart) does not publish a third-party SMART launch for this vault. Partnership registration would be required for live OAuth.',
  sampleResources: buildCkdSampleResources('nl', {
    egfr: 54,
    hba1c: 7.2,
    med: 'Metformin',
    dose: '500 mg twice daily',
    clinician: 'Dr. M. Power',
    when: '2026-03-10T12:00:00Z',
  }),
  labChromePattern:
    /myhealthnl|my\s*health\s*nl|nl\s*health\s*services|mychart|portal\s*screenshot/i,
  labChromePrefix: 'MyHealthNL Portal Screenshot / Test Results',
  labNote:
    'Imported via MyHealthNL lab text path — confirm values before CONFIRMED.',
});

export const peMyHealth = createFileImportProvince({
  authorityId: PE_HEALTHPEI_AUTHORITY_ID,
  jurisdiction: 'PE',
  portal: PE_MYHEALTH_PORTAL,
  playbook: PE_MYHEALTH_EXPORT_PLAYBOOK,
  smartMessage:
    'MyHealthPEI does not publish a patient-facing SMART on FHIR launch for third-party apps.',
  sampleResources: buildCkdSampleResources('pe', {
    egfr: 60,
    hba1c: 6.7,
    med: 'Perindopril',
    dose: '4 mg once daily',
    clinician: 'Dr. A. MacNeill',
    when: '2026-03-18T12:00:00Z',
  }),
  labChromePattern:
    /myhealthpei|my\s*health\s*pei|mypei|health\s*pei|portal\s*screenshot/i,
  labChromePrefix: 'MyHealthPEI Portal Screenshot / Lab results',
  labNote:
    'Imported via MyHealthPEI lab text path — confirm values before CONFIRMED.',
});

export const ytAccess = createFileImportProvince({
  authorityId: YT_HSS_AUTHORITY_ID,
  jurisdiction: 'YT',
  portal: YT_ACCESS_PORTAL,
  playbook: YT_ACCESS_EXPORT_PLAYBOOK,
  smartMessage:
    'Yukon does not publish a patient-facing SMART on FHIR launch. 1Health is clinician-facing; patient copies are via care team or ATIPP.',
  sampleResources: buildCkdSampleResources('yt', {
    egfr: 58,
    hba1c: 7.0,
    clinician: 'Dr. Yukon Clinic',
    when: '2026-01-20T12:00:00Z',
  }),
  labChromePattern:
    /yukon|1health|whitehorse\s*general|atipp|portal\s*screenshot/i,
  labChromePrefix: 'Yukon Portal Screenshot / health record lab copy',
  labNote:
    'Imported via Yukon access-request lab text path — confirm values before CONFIRMED.',
});

export const ntAccess = createFileImportProvince({
  authorityId: NT_NTHSSA_AUTHORITY_ID,
  jurisdiction: 'NT',
  portal: NT_ACCESS_PORTAL,
  playbook: NT_ACCESS_EXPORT_PLAYBOOK,
  smartMessage:
    'NWT HealthNet is not a public patient SMART endpoint. Patient copies are via providers or ATIPP.',
  sampleResources: buildCkdSampleResources('nt', {
    egfr: 53,
    hba1c: 7.4,
    clinician: 'Dr. NTHSSA Clinic',
    when: '2026-01-12T12:00:00Z',
  }),
  labChromePattern:
    /healthnet|nthssa|nwt|northwest\s*territor|atipp|portal\s*screenshot/i,
  labChromePrefix: 'NWT Portal Screenshot / HealthNet lab copy',
  labNote:
    'Imported via NWT access-request lab text path — confirm values before CONFIRMED.',
});

export const nuAccess = createFileImportProvince({
  authorityId: NU_HEALTH_AUTHORITY_ID,
  jurisdiction: 'NU',
  portal: NU_ACCESS_PORTAL,
  playbook: NU_ACCESS_EXPORT_PLAYBOOK,
  smartMessage:
    'Nunavut does not publish a patient-facing SMART on FHIR launch for third-party apps.',
  sampleResources: buildCkdSampleResources('nu', {
    egfr: 59,
    hba1c: 6.8,
    clinician: 'Dr. Health Centre',
    when: '2026-01-08T12:00:00Z',
  }),
  labChromePattern:
    /nunavut|iqaluit|atipp|gov\.nu|portal\s*screenshot/i,
  labChromePrefix: 'Nunavut Portal Screenshot / health record lab copy',
  labNote:
    'Imported via Nunavut access-request lab text path — confirm values before CONFIRMED.',
});

export const REMAINING_CANADA_CONNECTORS = [
  nbMyHealth,
  nlMyHealth,
  peMyHealth,
  ytAccess,
  ntAccess,
  nuAccess,
] as const;

export const NB_SAMPLE_FHIR_BUNDLE_JSON = nbMyHealth.sampleBundleJson;
export const getNbExportPlaybook = () => nbMyHealth.getExportPlaybook();
export const getNbSmartAuthStatus = () => nbMyHealth.getSmartAuthStatus();
export const importNbFhirJsonExport =
  nbMyHealth.importFhirJsonExport.bind(nbMyHealth);
export const importNbMyHealthLabText =
  nbMyHealth.importLabText.bind(nbMyHealth);
export const syncNbSampleToVault =
  nbMyHealth.syncSampleToVault.bind(nbMyHealth);

export const NL_SAMPLE_FHIR_BUNDLE_JSON = nlMyHealth.sampleBundleJson;
export const getNlExportPlaybook = () => nlMyHealth.getExportPlaybook();
export const getNlSmartAuthStatus = () => nlMyHealth.getSmartAuthStatus();
export const importNlFhirJsonExport =
  nlMyHealth.importFhirJsonExport.bind(nlMyHealth);
export const importNlMyHealthLabText =
  nlMyHealth.importLabText.bind(nlMyHealth);
export const syncNlSampleToVault =
  nlMyHealth.syncSampleToVault.bind(nlMyHealth);

export const PE_SAMPLE_FHIR_BUNDLE_JSON = peMyHealth.sampleBundleJson;
export const getPeExportPlaybook = () => peMyHealth.getExportPlaybook();
export const getPeSmartAuthStatus = () => peMyHealth.getSmartAuthStatus();
export const importPeFhirJsonExport =
  peMyHealth.importFhirJsonExport.bind(peMyHealth);
export const importPeMyHealthLabText =
  peMyHealth.importLabText.bind(peMyHealth);
export const syncPeSampleToVault =
  peMyHealth.syncSampleToVault.bind(peMyHealth);

export const YT_SAMPLE_FHIR_BUNDLE_JSON = ytAccess.sampleBundleJson;
export const getYtExportPlaybook = () => ytAccess.getExportPlaybook();
export const getYtSmartAuthStatus = () => ytAccess.getSmartAuthStatus();
export const importYtFhirJsonExport =
  ytAccess.importFhirJsonExport.bind(ytAccess);
export const importYtAccessLabText = ytAccess.importLabText.bind(ytAccess);
export const syncYtSampleToVault = ytAccess.syncSampleToVault.bind(ytAccess);

export const NT_SAMPLE_FHIR_BUNDLE_JSON = ntAccess.sampleBundleJson;
export const getNtExportPlaybook = () => ntAccess.getExportPlaybook();
export const getNtSmartAuthStatus = () => ntAccess.getSmartAuthStatus();
export const importNtFhirJsonExport =
  ntAccess.importFhirJsonExport.bind(ntAccess);
export const importNtAccessLabText = ntAccess.importLabText.bind(ntAccess);
export const syncNtSampleToVault = ntAccess.syncSampleToVault.bind(ntAccess);

export const NU_SAMPLE_FHIR_BUNDLE_JSON = nuAccess.sampleBundleJson;
export const getNuExportPlaybook = () => nuAccess.getExportPlaybook();
export const getNuSmartAuthStatus = () => nuAccess.getSmartAuthStatus();
export const importNuFhirJsonExport =
  nuAccess.importFhirJsonExport.bind(nuAccess);
export const importNuAccessLabText = nuAccess.importLabText.bind(nuAccess);
export const syncNuSampleToVault = nuAccess.syncSampleToVault.bind(nuAccess);

export async function syncAllRemainingCanadaSamples(options: {
  patientId: string;
  now?: Date;
}) {
  const results = [];
  for (const kit of REMAINING_CANADA_CONNECTORS) {
    results.push(await kit.syncSampleToVault(options));
  }
  return results;
}
