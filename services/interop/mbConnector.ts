/**
 * Manitoba eChart / Shared Health connector.
 * Read/import only. Primary public path is care-org portal print/OCR or eChart PHI copy.
 */

import {
  MB_ECHART_EXPORT_PLAYBOOK,
  MB_ECHART_PORTAL,
  MB_SHARED_AUTHORITY_ID,
  MB_SMART_READINESS,
} from '../../data/mbInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export { MB_SHARED_AUTHORITY_ID };

export const MB_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'mb-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    effectiveDateTime: '2026-04-20T12:00:00Z',
    valueQuantity: { value: 52, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'mb-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-04-20T12:00:00Z',
    valueQuantity: { value: 7.3, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'mb-creatinine-1',
    status: 'final',
    code: {
      text: 'Creatinine',
      coding: [
        { system: 'http://loinc.org', code: '2160-0', display: 'Creatinine' },
      ],
    },
    effectiveDateTime: '2026-04-20T12:00:00Z',
    valueQuantity: { value: 1.4, unit: 'mg/dL' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'mb-metformin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Metformin' },
    dosageInstruction: [{ text: '500 mg twice daily' }],
    requester: { display: 'Dr. A. Patel' },
  },
];

export const MB_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: MB_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

export function getMbExportPlaybook() {
  return MB_ECHART_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getMbSmartAuthStatus() {
  return {
    ok: false as const,
    portal: MB_ECHART_PORTAL,
    readiness: MB_SMART_READINESS,
    message: MB_SMART_READINESS.message,
  };
}

export function createManitobaConnector(options?: {
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const fileResources = options?.fileResources;
  if (fileResources?.length) {
    return createStagedFhirConnector({
      authorityId: MB_SHARED_AUTHORITY_ID,
      resources: fileResources,
      authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from Manitoba eChart / Shared Health export.`,
    });
  }
  return createStagedFhirConnector({
    authorityId: MB_SHARED_AUTHORITY_ID,
    resources: MB_SAMPLE_FHIR_RESOURCES,
    authMessage: [
      `${MB_ECHART_PORTAL.label} has no public SMART launch.`,
      'Use care-org portal OCR, eChart PHI lab copy, FHIR JSON file import, or sandbox sample sync.',
      `Playbook: ${MB_ECHART_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
    ].join(' '),
  });
}

export async function importMbFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: MB_SHARED_AUTHORITY_ID,
    jurisdictionFallback: 'MB',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

export async function importMbEchartLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: MB_SHARED_AUTHORITY_ID,
    portalLabel: MB_ECHART_PORTAL.label,
    portalChromePattern:
      /echart|shared\s*health|mycare\s*noona|manitoba\s*(?:health|lab)|portal\s*screenshot/i,
    portalChromePrefix:
      'eChart Manitoba / Shared Health Portal Screenshot / Lab results copy',
    note: 'Imported via Manitoba eChart / Shared Health lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

export async function syncMbSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createManitobaConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: MB_SHARED_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return {
    auth,
    result,
    playbook: getMbExportPlaybook(),
    smart: getMbSmartAuthStatus(),
  };
}
