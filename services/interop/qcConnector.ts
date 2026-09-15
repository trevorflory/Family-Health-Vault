/**
 * Québec Carnet santé connector.
 * Read/import only. Primary public path is portal view + print/OCR.
 */

import {
  QC_CARNET_AUTHORITY_ID,
  QC_CARNET_EXPORT_PLAYBOOK,
  QC_CARNET_PORTAL,
  QC_SMART_READINESS,
} from '../../data/qcInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export { QC_CARNET_AUTHORITY_ID };

export const QC_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'qc-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    effectiveDateTime: '2026-05-12T12:00:00Z',
    valueQuantity: { value: 61, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'qc-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-05-12T12:00:00Z',
    valueQuantity: { value: 6.8, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'qc-ldl-1',
    status: 'final',
    code: {
      text: 'LDL',
      coding: [
        { system: 'http://loinc.org', code: '2089-1', display: 'LDL' },
      ],
    },
    effectiveDateTime: '2026-05-12T12:00:00Z',
    valueQuantity: { value: 2.6, unit: 'mmol/L' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'qc-ramipril-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Ramipril' },
    dosageInstruction: [{ text: '5 mg once daily' }],
    requester: { display: 'Dre M. Tremblay' },
  },
];

export const QC_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: QC_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

export function getQcExportPlaybook() {
  return QC_CARNET_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getQcSmartAuthStatus() {
  return {
    ok: false as const,
    portal: QC_CARNET_PORTAL,
    readiness: QC_SMART_READINESS,
    message: QC_SMART_READINESS.message,
  };
}

export function createQuebecConnector(options?: {
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const fileResources = options?.fileResources;
  if (fileResources?.length) {
    return createStagedFhirConnector({
      authorityId: QC_CARNET_AUTHORITY_ID,
      resources: fileResources,
      authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from Carnet santé export.`,
    });
  }
  return createStagedFhirConnector({
    authorityId: QC_CARNET_AUTHORITY_ID,
    resources: QC_SAMPLE_FHIR_RESOURCES,
    authMessage: [
      `${QC_CARNET_PORTAL.label} has no public SMART launch.`,
      'Use lab-result print/OCR, FHIR JSON file import, or sandbox sample sync.',
      `Playbook: ${QC_CARNET_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
    ].join(' '),
  });
}

export async function importQcFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: QC_CARNET_AUTHORITY_ID,
    jurisdictionFallback: 'QC',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

export async function importQcCarnetLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: QC_CARNET_AUTHORITY_ID,
    portalLabel: QC_CARNET_PORTAL.label,
    portalChromePattern:
      /carnet\s*sant[eé]|carnetsante|dossier\s*sant[eé]\s*qu[eé]bec|portal\s*screenshot/i,
    portalChromePrefix:
      'Carnet santé Québec Portal Screenshot / Résultats de prélèvements',
    note: 'Imported via Carnet santé Québec lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

export async function syncQcSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createQuebecConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: QC_CARNET_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return {
    auth,
    result,
    playbook: getQcExportPlaybook(),
    smart: getQcSmartAuthStatus(),
  };
}
