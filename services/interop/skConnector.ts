/**
 * Saskatchewan Health Authority / MySaskHealthRecord connector.
 * Read/import only. Primary public path is PDF/text export + optional FHIR JSON
 * (partner/sandbox). SMART OAuth is stubbed until a public endpoint exists.
 */

import {
  MYSASK_EXPORT_PLAYBOOK,
  MYSASK_PORTAL,
  SK_SHA_AUTHORITY_ID,
  SK_SMART_READINESS,
} from '../../data/skInterop';
import type {
  MedicalEventRecord,
  OcrParsedPayload,
  SaveMedicalEventInput,
} from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createFileImportConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export { SK_SHA_AUTHORITY_ID as SHA_AUTHORITY_ID } from '../../data/skInterop';

/** Deterministic sample bundle for QA / sandbox (not a live MySask pull). */
export const SK_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'sha-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        {
          system: 'http://loinc.org',
          code: '33914-3',
          display: 'eGFR',
        },
      ],
    },
    effectiveDateTime: '2026-09-01T12:00:00Z',
    valueQuantity: {
      value: 54,
      unit: 'mL/min/1.73m2',
    },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'sha-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-09-01T12:00:00Z',
    valueQuantity: { value: 7.1, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'sha-ldl-1',
    status: 'final',
    code: {
      text: 'LDL',
      coding: [
        { system: 'http://loinc.org', code: '2089-1', display: 'LDL' },
      ],
    },
    effectiveDateTime: '2026-09-01T12:00:00Z',
    valueQuantity: { value: 3.2, unit: 'mmol/L' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'sha-metformin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Metformin' },
    dosageInstruction: [{ text: '500 mg twice daily' }],
    requester: { display: 'Dr. A. Singh' },
  },
  {
    resourceType: 'Immunization',
    id: 'sha-flu-1',
    status: 'completed',
    vaccineCode: { text: 'Influenza vaccine' },
    occurrenceDateTime: '2025-10-15',
  },
];

/** FHIR Bundle JSON string — same sample, for file-import path tests. */
export const SK_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: SK_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

/** @deprecated Use SK_SAMPLE_FHIR_RESOURCES */
export const SHA_PILOT_FHIR_SAMPLE = SK_SAMPLE_FHIR_RESOURCES;

export function getSkExportPlaybook() {
  return MYSASK_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getSkSmartAuthStatus() {
  return {
    ok: false as const,
    portal: MYSASK_PORTAL,
    readiness: SK_SMART_READINESS,
    message: SK_SMART_READINESS.message,
  };
}

/**
 * Saskatchewan connector — sample pull for sandbox; file import for real exports.
 */
export function createSaskatchewanConnector(options?: {
  /** When set, pullResources returns these instead of the sample set. */
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const file = createFileImportConnector(SK_SHA_AUTHORITY_ID);
  const fileResources = options?.fileResources;
  return {
    authorityId: SK_SHA_AUTHORITY_ID,
    async authenticate() {
      if (fileResources?.length) {
        return {
          ok: true,
          message: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from export.`,
        };
      }
      return {
        ok: true,
        message: [
          `${MYSASK_PORTAL.label} has no public SMART launch.`,
          'Use MySask PDF/lab text import, FHIR JSON file import, or sandbox sample sync.',
          `Playbook: ${MYSASK_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
        ].join(' '),
      };
    },
    async pullResources() {
      return fileResources ?? SK_SAMPLE_FHIR_RESOURCES;
    },
  };
}

/** @deprecated Use createSaskatchewanConnector */
export function createShaPilotConnector(): HealthAuthorityConnector {
  return createSaskatchewanConnector();
}

export async function importSkFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: SK_SHA_AUTHORITY_ID,
    jurisdictionFallback: 'SK',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

/**
 * Import MySask-style lab PDF/OCR text into MedicalEvents (portal provenance).
 */
export async function importSkMySaskLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}): Promise<{ record: MedicalEventRecord; parsed: OcrParsedPayload }> {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: SK_SHA_AUTHORITY_ID,
    portalLabel: MYSASK_PORTAL.label,
    portalChromePattern: /mysask|portal\s*screenshot|ehealth\s*sask/i,
    portalChromePrefix:
      'MySaskHealthRecord Portal Screenshot / Lab Results export',
    note: 'Imported via Saskatchewan MySask lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

/**
 * Sandbox / QA: pull sample FHIR → vault (idempotent by externalId).
 */
export async function syncSkSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createSaskatchewanConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: SK_SHA_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return { auth, result, playbook: getSkExportPlaybook(), smart: getSkSmartAuthStatus() };
}

/** @deprecated Use syncSkSampleToVault */
export async function syncShaPilotSample(options: {
  patientId: string;
  now?: Date;
}) {
  const { auth, result } = await syncSkSampleToVault(options);
  return { auth, result };
}
