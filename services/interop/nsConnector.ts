/**
 * Nova Scotia YourHealthNS connector.
 * Read/import only. Primary public path is YourHealthNS Records print/OCR.
 */

import {
  NS_NSHA_AUTHORITY_ID,
  NS_SMART_READINESS,
  NS_YOURHEALTH_EXPORT_PLAYBOOK,
  NS_YOURHEALTH_PORTAL,
} from '../../data/nsInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export { NS_NSHA_AUTHORITY_ID };

export const NS_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'ns-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    effectiveDateTime: '2026-03-08T12:00:00Z',
    valueQuantity: { value: 56, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'ns-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-03-08T12:00:00Z',
    valueQuantity: { value: 7.0, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'ns-ldl-1',
    status: 'final',
    code: {
      text: 'LDL',
      coding: [
        { system: 'http://loinc.org', code: '2089-1', display: 'LDL' },
      ],
    },
    effectiveDateTime: '2026-03-08T12:00:00Z',
    valueQuantity: { value: 2.9, unit: 'mmol/L' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'ns-atorvastatin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Atorvastatin' },
    dosageInstruction: [{ text: '20 mg once daily' }],
    requester: { display: 'Dr. K. MacDonald' },
  },
];

export const NS_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: NS_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

export function getNsExportPlaybook() {
  return NS_YOURHEALTH_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getNsSmartAuthStatus() {
  return {
    ok: false as const,
    portal: NS_YOURHEALTH_PORTAL,
    readiness: NS_SMART_READINESS,
    message: NS_SMART_READINESS.message,
  };
}

export function createNovaScotiaConnector(options?: {
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const fileResources = options?.fileResources;
  if (fileResources?.length) {
    return createStagedFhirConnector({
      authorityId: NS_NSHA_AUTHORITY_ID,
      resources: fileResources,
      authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from YourHealthNS export.`,
    });
  }
  return createStagedFhirConnector({
    authorityId: NS_NSHA_AUTHORITY_ID,
    resources: NS_SAMPLE_FHIR_RESOURCES,
    authMessage: [
      `${NS_YOURHEALTH_PORTAL.label} has no public SMART launch.`,
      'Use Records/Patient Summary print/OCR, FHIR JSON file import, or sandbox sample sync.',
      `Playbook: ${NS_YOURHEALTH_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
    ].join(' '),
  });
}

export async function importNsFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: NS_NSHA_AUTHORITY_ID,
    jurisdictionFallback: 'NS',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

export async function importNsYourHealthLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: NS_NSHA_AUTHORITY_ID,
    portalLabel: NS_YOURHEALTH_PORTAL.label,
    portalChromePattern:
      /yourhealthns|your\s*health\s*ns|my\s*ns\s*account|nova\s*scotia\s*health|portal\s*screenshot/i,
    portalChromePrefix:
      'YourHealthNS Portal Screenshot / Records lab results',
    note: 'Imported via YourHealthNS lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

export async function syncNsSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createNovaScotiaConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: NS_NSHA_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return {
    auth,
    result,
    playbook: getNsExportPlaybook(),
    smart: getNsSmartAuthStatus(),
  };
}
