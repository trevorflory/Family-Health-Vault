/**
 * Shared FILE_IMPORT province/territory kit factory.
 * Keeps remaining Canada connectors honest (no fake SMART) and DRY.
 */

import type { CanadianJurisdiction } from '../../types/foiPayload';
import type { MedicalEventRecord, SaveMedicalEventInput } from '../../types/db';
import type { FhirImportResource, InteropPullResult } from '../../types/interop';
import {
  createStagedFhirConnector,
  importFhirIntoVault,
  importFhirJsonExportForAuthority,
  importPortalLabTextForAuthority,
  type HealthAuthorityConnector,
} from './connector';

export interface FileImportPlaybookStep {
  id: string;
  title: string;
  detail: string;
}

export interface FileImportProvinceDef {
  authorityId: string;
  jurisdiction: CanadianJurisdiction;
  portal: { label: string; url: string };
  playbook: readonly FileImportPlaybookStep[];
  smartMessage: string;
  sampleResources: FhirImportResource[];
  labChromePattern: RegExp;
  labChromePrefix: string;
  labNote: string;
}

export function buildCkdSampleResources(
  prefix: string,
  opts?: {
    egfr?: number;
    hba1c?: number;
    med?: string;
    dose?: string;
    clinician?: string;
    when?: string;
  },
): FhirImportResource[] {
  const when = opts?.when ?? '2026-02-15T12:00:00Z';
  const egfr = opts?.egfr ?? 55;
  const hba1c = opts?.hba1c ?? 7.1;
  const med = opts?.med ?? 'Metformin';
  const dose = opts?.dose ?? '500 mg twice daily';
  const clinician = opts?.clinician ?? 'Dr. Care Team';
  return [
    {
      resourceType: 'Observation',
      id: `${prefix}-egfr-1`,
      status: 'final',
      code: {
        text: 'eGFR',
        coding: [
          { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
        ],
      },
      effectiveDateTime: when,
      valueQuantity: { value: egfr, unit: 'mL/min/1.73m2' },
      referenceRange: [{ text: '60-120' }],
    },
    {
      resourceType: 'Observation',
      id: `${prefix}-hba1c-1`,
      status: 'final',
      code: {
        text: 'HbA1c',
        coding: [
          { system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' },
        ],
      },
      effectiveDateTime: when,
      valueQuantity: { value: hba1c, unit: '%' },
    },
    {
      resourceType: 'Observation',
      id: `${prefix}-creatinine-1`,
      status: 'final',
      code: {
        text: 'Creatinine',
        coding: [
          {
            system: 'http://loinc.org',
            code: '2160-0',
            display: 'Creatinine',
          },
        ],
      },
      effectiveDateTime: when,
      valueQuantity: { value: 1.3, unit: 'mg/dL' },
    },
    {
      resourceType: 'MedicationRequest',
      id: `${prefix}-med-1`,
      status: 'active',
      medicationCodeableConcept: { text: med },
      dosageInstruction: [{ text: dose }],
      requester: { display: clinician },
    },
  ];
}

export function createFileImportProvince(def: FileImportProvinceDef) {
  const sampleBundleJson = JSON.stringify({
    resourceType: 'Bundle',
    type: 'collection',
    entry: def.sampleResources.map((resource) => ({ resource })),
  });

  function getExportPlaybook() {
    return def.playbook.map((step) => ({ ...step }));
  }

  function getSmartAuthStatus() {
    return {
      ok: false as const,
      portal: def.portal,
      readiness: {
        availability: 'NOT_PUBLIC' as const,
        message: def.smartMessage,
      },
      message: def.smartMessage,
    };
  }

  function createConnector(options?: {
    fileResources?: FhirImportResource[];
  }): HealthAuthorityConnector {
    const fileResources = options?.fileResources;
    if (fileResources?.length) {
      return createStagedFhirConnector({
        authorityId: def.authorityId,
        resources: fileResources,
        authMessage: `FILE_IMPORT — ${fileResources.length} FHIR resource(s) staged from ${def.portal.label} export.`,
      });
    }
    return createStagedFhirConnector({
      authorityId: def.authorityId,
      resources: def.sampleResources,
      authMessage: [
        `${def.portal.label} has no public SMART launch.`,
        'Use portal print/OCR, access-request copies, FHIR JSON file import, or sandbox sample sync.',
        `Playbook: ${def.playbook.map((s) => s.title).join(' → ')}`,
      ].join(' '),
    });
  }

  async function importFhirJsonExport(options: {
    patientId: string;
    jsonText: string;
    status?: SaveMedicalEventInput['status'];
    now?: Date;
  }): Promise<InteropPullResult & { parseError?: string }> {
    return importFhirJsonExportForAuthority({
      patientId: options.patientId,
      authorityId: def.authorityId,
      jurisdictionFallback: def.jurisdiction,
      jsonText: options.jsonText,
      status: options.status,
      now: options.now,
    });
  }

  async function importLabText(options: {
    patientId: string;
    rawText: string;
    sourceUri?: string | null;
    status?: MedicalEventRecord['status'];
    eventId?: string;
  }) {
    return importPortalLabTextForAuthority({
      patientId: options.patientId,
      authorityId: def.authorityId,
      portalLabel: def.portal.label,
      portalChromePattern: def.labChromePattern,
      portalChromePrefix: def.labChromePrefix,
      note: def.labNote,
      rawText: options.rawText,
      sourceUri: options.sourceUri,
      status: options.status,
      eventId: options.eventId,
    });
  }

  async function syncSampleToVault(options: {
    patientId: string;
    now?: Date;
  }) {
    const connector = createConnector();
    const auth = await connector.authenticate();
    const resources = await connector.pullResources(options.patientId);
    const result = await importFhirIntoVault({
      patientId: options.patientId,
      authorityId: def.authorityId,
      bundle: resources,
      status: 'PENDING_REVIEW',
      now: options.now,
    });
    return {
      auth,
      result,
      playbook: getExportPlaybook(),
      smart: getSmartAuthStatus(),
    };
  }

  return {
    authorityId: def.authorityId,
    jurisdiction: def.jurisdiction,
    portal: def.portal,
    sampleBundleJson,
    getExportPlaybook,
    getSmartAuthStatus,
    createConnector,
    importFhirJsonExport,
    importLabText,
    syncSampleToVault,
  };
}

export type FileImportProvinceKit = ReturnType<typeof createFileImportProvince>;
