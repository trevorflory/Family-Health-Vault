/**
 * Alberta Health Services / MyHealth Records connector.
 * Read/import only. Primary public path is PDF export + optional FHIR JSON.
 */

import {
  AB_AHS_AUTHORITY_ID,
  AB_SMART_READINESS,
  MYHEALTH_AB_EXPORT_PLAYBOOK,
  MYHEALTH_AB_PORTAL,
} from '../../data/abInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export { AB_AHS_AUTHORITY_ID };

export const AB_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'ahs-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    effectiveDateTime: '2026-08-20T12:00:00Z',
    valueQuantity: { value: 58, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'ahs-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-08-20T12:00:00Z',
    valueQuantity: { value: 6.9, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'ahs-ldl-1',
    status: 'final',
    code: {
      text: 'LDL',
      coding: [
        { system: 'http://loinc.org', code: '2089-1', display: 'LDL' },
      ],
    },
    effectiveDateTime: '2026-08-20T12:00:00Z',
    valueQuantity: { value: 2.8, unit: 'mmol/L' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'ahs-ramipril-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Ramipril' },
    dosageInstruction: [{ text: '5 mg daily' }],
    requester: { display: 'Dr. L. Chen' },
  },
];

export const AB_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: AB_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

export function getAbExportPlaybook() {
  return MYHEALTH_AB_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getAbSmartAuthStatus() {
  return {
    ok: false as const,
    portal: MYHEALTH_AB_PORTAL,
    readiness: AB_SMART_READINESS,
    message: AB_SMART_READINESS.message,
  };
}

export function createAlbertaConnector(options?: {
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const fileResources = options?.fileResources;
  if (fileResources?.length) {
    return createStagedFhirConnector({
      authorityId: AB_AHS_AUTHORITY_ID,
      resources: fileResources,
      authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from Alberta export.`,
    });
  }
  return createStagedFhirConnector({
    authorityId: AB_AHS_AUTHORITY_ID,
    resources: AB_SAMPLE_FHIR_RESOURCES,
    authMessage: [
      `${MYHEALTH_AB_PORTAL.label} has no public SMART launch.`,
      'Use Print Lab Results PDF/text import, FHIR JSON file import, or sandbox sample sync.',
      `Playbook: ${MYHEALTH_AB_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
    ].join(' '),
  });
}

export async function importAbFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: AB_AHS_AUTHORITY_ID,
    jurisdictionFallback: 'AB',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

export async function importAbMyHealthLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: AB_AHS_AUTHORITY_ID,
    portalLabel: MYHEALTH_AB_PORTAL.label,
    portalChromePattern: /myhealth|alberta\s*myhealth|netcare|portal\s*screenshot/i,
    portalChromePrefix:
      'Alberta MyHealth Records Portal Screenshot / Print Lab Results export',
    note: 'Imported via Alberta MyHealth lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

export async function syncAbSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createAlbertaConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: AB_AHS_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return {
    auth,
    result,
    playbook: getAbExportPlaybook(),
    smart: getAbSmartAuthStatus(),
  };
}
