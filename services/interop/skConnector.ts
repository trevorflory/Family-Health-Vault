/**
 * Saskatchewan Health Authority / MySaskHealthRecord connector.
 * Read/import only. Primary public path is PDF/text export + optional FHIR JSON
 * (partner/sandbox). SMART OAuth is stubbed until a public endpoint exists.
 */

import { saveMedicalEvent } from '../../db/medicalEvents';
import {
  MYSASK_EXPORT_PLAYBOOK,
  MYSASK_PORTAL,
  SK_SHA_AUTHORITY_ID,
  SK_SMART_READINESS,
} from '../../data/skInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  inferMedicalEventKind,
  parseOcrDocument,
} from '../ocrTextParsers';
import {
  createFileImportConnector,
  importFhirIntoVault,
  type HealthAuthorityConnector,
} from './connector';
import { parseFhirExportJson } from './fhirJson';

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
  const parsed = parseFhirExportJson(options.jsonText);
  if (!parsed.ok) {
    return {
      authorityId: SK_SHA_AUTHORITY_ID,
      jurisdiction: 'SK',
      importedCount: 0,
      skippedCount: 0,
      syncedAt: (options.now ?? new Date()).toISOString(),
      notes: [parsed.error],
      parseError: parsed.error,
    };
  }

  const connector = createSaskatchewanConnector({
    fileResources: parsed.resources,
  });
  await connector.authenticate();
  return importFhirIntoVault({
    patientId: options.patientId,
    authorityId: SK_SHA_AUTHORITY_ID,
    bundle: parsed.resources,
    status: options.status ?? 'PENDING_REVIEW',
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
}): Promise<{ record: MedicalEventRecord; parsed: ReturnType<typeof parseOcrDocument> }> {
  const rawText = options.rawText.trim();
  if (!rawText) {
    throw new Error('MySask lab text is empty');
  }

  // Ensure portal chrome so inferKind prefers PORTAL_SCREENSHOT when labs present.
  const withChrome = /mysask|portal\s*screenshot|ehealth\s*sask/i.test(rawText)
    ? rawText
    : `MySaskHealthRecord Portal Screenshot / Lab Results export\n${rawText}`;

  const parsed = parseOcrDocument(withChrome);
  parsed.sourceAuthorityId = SK_SHA_AUTHORITY_ID;
  parsed.portalLabel = MYSASK_PORTAL.label;
  if (!parsed.parserNotes.some((n) => /mysask/i.test(n))) {
    parsed.parserNotes.unshift(
      'Imported via Saskatchewan MySask lab text path — confirm values before CONFIRMED.',
    );
  }

  const record = await saveMedicalEvent({
    id: options.eventId,
    patientId: options.patientId,
    kind: inferMedicalEventKind(parsed),
    sourceUri: options.sourceUri ?? null,
    rawText: withChrome,
    parsed,
    status: options.status ?? 'PENDING_REVIEW',
    sourceType: 'FILE_IMPORT',
    sourceAuthorityId: SK_SHA_AUTHORITY_ID,
    lastSyncedAt: new Date().toISOString(),
  });

  return { record, parsed };
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
