/**
 * Ontario MyChart / OLIS connector.
 * Read/import only. Primary public path is fragmented hospital portal PDF export.
 */

import {
  ON_EXPORT_PLAYBOOK,
  ON_PATIENT_PORTALS,
  ON_PATIENT_PORTALS_AUTHORITY_ID,
  ON_SMART_READINESS,
} from '../../data/onInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export { ON_PATIENT_PORTALS_AUTHORITY_ID };

export const ON_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'on-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    effectiveDateTime: '2026-06-01T12:00:00Z',
    valueQuantity: { value: 49, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'on-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-06-01T12:00:00Z',
    valueQuantity: { value: 7.5, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'on-creatinine-1',
    status: 'final',
    code: {
      text: 'Creatinine',
      coding: [
        { system: 'http://loinc.org', code: '2160-0', display: 'Creatinine' },
      ],
    },
    effectiveDateTime: '2026-06-01T12:00:00Z',
    valueQuantity: { value: 1.5, unit: 'mg/dL' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'on-metformin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Metformin' },
    dosageInstruction: [{ text: '500 mg twice daily' }],
    requester: { display: 'Dr. R. Kim' },
  },
];

export const ON_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: ON_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

export function getOnExportPlaybook() {
  return ON_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getOnSmartAuthStatus() {
  return {
    ok: false as const,
    portal: ON_PATIENT_PORTALS,
    readiness: ON_SMART_READINESS,
    message: ON_SMART_READINESS.message,
  };
}

export function createOntarioConnector(options?: {
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const fileResources = options?.fileResources;
  if (fileResources?.length) {
    return createStagedFhirConnector({
      authorityId: ON_PATIENT_PORTALS_AUTHORITY_ID,
      resources: fileResources,
      authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from Ontario portal export.`,
    });
  }
  return createStagedFhirConnector({
    authorityId: ON_PATIENT_PORTALS_AUTHORITY_ID,
    resources: ON_SAMPLE_FHIR_RESOURCES,
    authMessage: [
      `${ON_PATIENT_PORTALS.label} has no unified public SMART launch.`,
      'Use MyChart/OLIS PDF/text import, FHIR JSON file import, or sandbox sample sync.',
      `Playbook: ${ON_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
    ].join(' '),
  });
}

export async function importOnFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: ON_PATIENT_PORTALS_AUTHORITY_ID,
    jurisdictionFallback: 'ON',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

export async function importOnMyChartLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: ON_PATIENT_PORTALS_AUTHORITY_ID,
    portalLabel: ON_PATIENT_PORTALS.label,
    portalChromePattern:
      /mychart|olis|ontario\s*lab|myuhn|connectingontario|portal\s*screenshot/i,
    portalChromePrefix:
      'Ontario MyChart / OLIS Portal Screenshot / Test Results export',
    note: 'Imported via Ontario MyChart/OLIS lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

export async function syncOnSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createOntarioConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: ON_PATIENT_PORTALS_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return {
    auth,
    result,
    playbook: getOnExportPlaybook(),
    smart: getOnSmartAuthStatus(),
  };
}
