/**
 * BC Health Gateway connector.
 * Read/import only. Primary public path is Download records PDF + optional FHIR JSON.
 */

import {
  BC_HEALTH_GATEWAY_AUTHORITY_ID,
  BC_HEALTH_GATEWAY_EXPORT_PLAYBOOK,
  BC_HEALTH_GATEWAY_PORTAL,
  BC_SMART_READINESS,
} from '../../data/bcInterop';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';
import {
  BC_SAMPLE_HEALTH_GATEWAY_CSV,
  parseBcHealthGatewayCsv,
} from './bcCsv';
import { saveMedicalEvent } from '../../db/medicalEvents';
import {
  inferMedicalEventKind,
  parseOcrDocument,
} from '../ocrTextParsers';

export { BC_HEALTH_GATEWAY_AUTHORITY_ID, BC_SAMPLE_HEALTH_GATEWAY_CSV };

export const BC_SAMPLE_FHIR_RESOURCES: FhirImportResource[] = [
  {
    resourceType: 'Observation',
    id: 'bcgw-egfr-1',
    status: 'final',
    code: {
      text: 'eGFR',
      coding: [
        { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
      ],
    },
    effectiveDateTime: '2026-07-10T12:00:00Z',
    valueQuantity: { value: 62, unit: 'mL/min/1.73m2' },
    referenceRange: [{ text: '60-120' }],
  },
  {
    resourceType: 'Observation',
    id: 'bcgw-hba1c-1',
    status: 'final',
    code: {
      text: 'HbA1c',
      coding: [
        { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
      ],
    },
    effectiveDateTime: '2026-07-10T12:00:00Z',
    valueQuantity: { value: 6.4, unit: '%' },
  },
  {
    resourceType: 'Observation',
    id: 'bcgw-ldl-1',
    status: 'final',
    code: {
      text: 'LDL',
      coding: [
        { system: 'http://loinc.org', code: '2089-1', display: 'LDL' },
      ],
    },
    effectiveDateTime: '2026-07-10T12:00:00Z',
    valueQuantity: { value: 2.4, unit: 'mmol/L' },
  },
  {
    resourceType: 'MedicationRequest',
    id: 'bcgw-atorvastatin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Atorvastatin' },
    dosageInstruction: [{ text: '20 mg nightly' }],
    requester: { display: 'Dr. K. Patel' },
  },
  {
    resourceType: 'Immunization',
    id: 'bcgw-covid-1',
    status: 'completed',
    vaccineCode: { text: 'COVID-19 vaccine' },
    occurrenceDateTime: '2025-11-02',
  },
];

export const BC_SAMPLE_FHIR_BUNDLE_JSON = JSON.stringify({
  resourceType: 'Bundle',
  type: 'collection',
  entry: BC_SAMPLE_FHIR_RESOURCES.map((resource) => ({ resource })),
});

export function getBcExportPlaybook() {
  return BC_HEALTH_GATEWAY_EXPORT_PLAYBOOK.map((step) => ({ ...step }));
}

export function getBcSmartAuthStatus() {
  return {
    ok: false as const,
    portal: BC_HEALTH_GATEWAY_PORTAL,
    readiness: BC_SMART_READINESS,
    message: BC_SMART_READINESS.message,
  };
}

export function createBcHealthGatewayConnector(options?: {
  fileResources?: FhirImportResource[];
}): HealthAuthorityConnector {
  const fileResources = options?.fileResources;
  if (fileResources?.length) {
    return createStagedFhirConnector({
      authorityId: BC_HEALTH_GATEWAY_AUTHORITY_ID,
      resources: fileResources,
      authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from BC Health Gateway export.`,
    });
  }
  return createStagedFhirConnector({
    authorityId: BC_HEALTH_GATEWAY_AUTHORITY_ID,
    resources: BC_SAMPLE_FHIR_RESOURCES,
    authMessage: [
      `${BC_HEALTH_GATEWAY_PORTAL.label} has no public SMART launch.`,
      'Use Download records PDF/text import, FHIR JSON file import, or sandbox sample sync.',
      `Playbook: ${BC_HEALTH_GATEWAY_EXPORT_PLAYBOOK.map((s) => s.title).join(' → ')}`,
    ].join(' '),
  });
}

export async function importBcFhirJsonExport(options: {
  patientId: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  return importFhirJsonExportForAuthority({
    patientId: options.patientId,
    authorityId: BC_HEALTH_GATEWAY_AUTHORITY_ID,
    jurisdictionFallback: 'BC',
    jsonText: options.jsonText,
    status: options.status,
    now: options.now,
  });
}

export async function importBcHealthGatewayLabText(options: {
  patientId: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  return importPortalLabTextForAuthority({
    patientId: options.patientId,
    authorityId: BC_HEALTH_GATEWAY_AUTHORITY_ID,
    portalLabel: BC_HEALTH_GATEWAY_PORTAL.label,
    portalChromePattern:
      /health\s*gateway|healthgateway|portal\s*screenshot|bc\s*lab\s*results/i,
    portalChromePrefix:
      'BC Health Gateway Portal Screenshot / Download records — Lab results',
    note: 'Imported via BC Health Gateway lab text path — confirm values before CONFIRMED.',
    rawText: options.rawText,
    sourceUri: options.sourceUri,
    status: options.status,
    eventId: options.eventId,
  });
}

/** Import Health Gateway Download-records CSV/XLSX text (CSV only). */
export async function importBcHealthGatewayCsv(options: {
  patientId: string;
  csvText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}) {
  const parsedCsv = parseBcHealthGatewayCsv(options.csvText);
  if (!parsedCsv.labs.length) {
    throw new Error(
      parsedCsv.notes[0] ?? 'No labs found in Health Gateway CSV export',
    );
  }
  const chrome = `BC Health Gateway Portal Screenshot / Download records CSV\n${options.csvText.trim()}`;
  const parsed = parseOcrDocument(chrome);
  parsed.labs = parsedCsv.labs;
  parsed.sourceAuthorityId = BC_HEALTH_GATEWAY_AUTHORITY_ID;
  parsed.portalLabel = BC_HEALTH_GATEWAY_PORTAL.label;
  parsed.parserNotes = [
    'Imported via BC Health Gateway CSV path — confirm values before CONFIRMED.',
    ...parsedCsv.notes,
    ...parsed.parserNotes,
  ];
  const record = await saveMedicalEvent({
    id: options.eventId,
    patientId: options.patientId,
    kind: inferMedicalEventKind(parsed),
    sourceUri: options.sourceUri ?? null,
    rawText: chrome,
    parsed,
    status: options.status ?? 'PENDING_REVIEW',
    sourceType: 'FILE_IMPORT',
    sourceAuthorityId: BC_HEALTH_GATEWAY_AUTHORITY_ID,
    lastSyncedAt: new Date().toISOString(),
  });
  return { record, parsed, csv: parsedCsv };
}

export async function syncBcSampleToVault(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createBcHealthGatewayConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: BC_HEALTH_GATEWAY_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return {
    auth,
    result,
    playbook: getBcExportPlaybook(),
    smart: getBcSmartAuthStatus(),
  };
}
