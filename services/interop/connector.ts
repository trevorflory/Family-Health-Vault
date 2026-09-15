/**
 * Health-authority connector boundary (Phase B).
 * Read/import only into the local MedicalEvents vault.
 */

import {
  findMedicalEventByExternalId,
  saveMedicalEvent,
} from '../../db/medicalEvents';
import { getFacilityById } from '../../data/healthAuthorities';
import type { SaveMedicalEventInput } from '../../types/db';
import type {
  FhirBundle,
  FhirImportResource,
  InteropPullResult,
} from '../../types/interop';
import {
  flattenFhirBundle,
  mapFhirResourcesToSaveInputs,
} from './fhirMapper';

export interface HealthAuthorityConnector {
  authorityId: string;
  /** Authenticate / open portal — SMART OAuth placeholder for pilots. */
  authenticate(): Promise<{ ok: boolean; message: string }>;
  /** Pull resources from live endpoint when available. */
  pullResources(patientId: string): Promise<FhirImportResource[]>;
}

export async function importFhirIntoVault(options: {
  patientId: string;
  authorityId: string;
  bundle: FhirBundle | FhirImportResource | FhirImportResource[];
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult> {
  const facility = getFacilityById(options.authorityId);
  const syncedAt = (options.now ?? new Date()).toISOString();
  const resources = flattenFhirBundle(options.bundle);
  const { inputs, notes } = mapFhirResourcesToSaveInputs(resources, {
    patientId: options.patientId,
    authorityId: options.authorityId,
    syncedAt,
    status: options.status ?? 'PENDING_REVIEW',
  });

  let importedCount = 0;
  let skippedCount = 0;

  for (const input of inputs) {
    if (input.externalId) {
      const existing = await findMedicalEventByExternalId(
        options.patientId,
        input.externalId,
      );
      if (existing) {
        await saveMedicalEvent({ ...input, id: existing.id });
        importedCount += 1;
        continue;
      }
    }
    await saveMedicalEvent(input);
    importedCount += 1;
  }

  skippedCount = Math.max(0, resources.length - inputs.length);

  return {
    authorityId: options.authorityId,
    jurisdiction: facility?.jurisdiction ?? 'SK',
    importedCount,
    skippedCount,
    syncedAt,
    notes,
  };
}

/**
 * Generic file-import connector: caregiver drops FHIR JSON exported from a portal.
 */
export function createFileImportConnector(
  authorityId: string,
): HealthAuthorityConnector {
  return {
    authorityId,
    async authenticate() {
      return {
        ok: true,
        message:
          'FILE_IMPORT mode — authenticate by selecting a portal FHIR/CCD export on device.',
      };
    },
    async pullResources() {
      return [];
    },
  };
}
