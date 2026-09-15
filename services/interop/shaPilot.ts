/**
 * Saskatchewan Health Authority (sk-sha) pilot connector.
 * Uses sample FHIR Observation/MedicationRequest fixtures until a live
 * SMART endpoint is partnered. Still exercises the same vault import path.
 */

import type { FhirImportResource } from '../../types/interop';
import {
  createFileImportConnector,
  importFhirIntoVault,
  type HealthAuthorityConnector,
} from './connector';

export const SHA_AUTHORITY_ID = 'sk-sha';

/** Deterministic sample bundle for QA / sandbox SHA pilot. */
export const SHA_PILOT_FHIR_SAMPLE: FhirImportResource[] = [
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
    resourceType: 'MedicationRequest',
    id: 'sha-metformin-1',
    status: 'active',
    medicationCodeableConcept: { text: 'Metformin' },
    dosageInstruction: [{ text: '500 mg twice daily' }],
    requester: { display: 'Dr. A. Singh' },
  },
];

export function createShaPilotConnector(): HealthAuthorityConnector {
  const file = createFileImportConnector(SHA_AUTHORITY_ID);
  return {
    authorityId: SHA_AUTHORITY_ID,
    authenticate: file.authenticate,
    async pullResources() {
      return SHA_PILOT_FHIR_SAMPLE;
    },
  };
}

/**
 * Run the SHA pilot pull → vault import (sample FHIR until live SMART lands).
 */
export async function syncShaPilotSample(options: {
  patientId: string;
  now?: Date;
}) {
  const connector = createShaPilotConnector();
  const auth = await connector.authenticate();
  const resources = await connector.pullResources(options.patientId);
  const result = await importFhirIntoVault({
    patientId: options.patientId,
    authorityId: SHA_AUTHORITY_ID,
    bundle: resources,
    status: 'PENDING_REVIEW',
    now: options.now,
  });
  return { auth, result };
}
