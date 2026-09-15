/**
 * Health-authority connector boundary (Phase B).
 * Read/import only into the local MedicalEvents vault.
 */

import {
  findMedicalEventByExternalId,
  saveMedicalEvent,
} from '../../db/medicalEvents';
import { getFacilityById } from '../../data/healthAuthorities';
import type {
  MedicalEventRecord,
  OcrParsedPayload,
  SaveMedicalEventInput,
} from '../../types/db';
import type {
  FhirBundle,
  FhirImportResource,
  InteropPullResult,
} from '../../types/interop';
import {
  inferMedicalEventKind,
  parseOcrDocument,
} from '../ocrTextParsers';
import {
  flattenFhirBundle,
  mapFhirResourcesToSaveInputs,
} from './fhirMapper';
import { parseFhirExportJson } from './fhirJson';

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

export function createStagedFhirConnector(options: {
  authorityId: string;
  resources: FhirImportResource[];
  authMessage: string;
}): HealthAuthorityConnector {
  return {
    authorityId: options.authorityId,
    async authenticate() {
      return { ok: true, message: options.authMessage };
    },
    async pullResources() {
      return options.resources;
    },
  };
}

/** Parse FHIR JSON text and import into the vault for a given authority. */
export async function importFhirJsonExportForAuthority(options: {
  patientId: string;
  authorityId: string;
  jurisdictionFallback: string;
  jsonText: string;
  status?: SaveMedicalEventInput['status'];
  now?: Date;
}): Promise<InteropPullResult & { parseError?: string }> {
  const parsed = parseFhirExportJson(options.jsonText);
  if (!parsed.ok) {
    return {
      authorityId: options.authorityId,
      jurisdiction: options.jurisdictionFallback,
      importedCount: 0,
      skippedCount: 0,
      syncedAt: (options.now ?? new Date()).toISOString(),
      notes: [parsed.error],
      parseError: parsed.error,
    };
  }

  return importFhirIntoVault({
    patientId: options.patientId,
    authorityId: options.authorityId,
    bundle: parsed.resources,
    status: options.status ?? 'PENDING_REVIEW',
    now: options.now,
  });
}

/**
 * Import provincial portal lab PDF/OCR text with FILE_IMPORT provenance.
 */
export async function importPortalLabTextForAuthority(options: {
  patientId: string;
  authorityId: string;
  portalLabel: string;
  /** Regex that detects portal chrome already present in the text. */
  portalChromePattern: RegExp;
  /** Prefix injected when chrome is missing. */
  portalChromePrefix: string;
  note: string;
  rawText: string;
  sourceUri?: string | null;
  status?: MedicalEventRecord['status'];
  eventId?: string;
}): Promise<{ record: MedicalEventRecord; parsed: OcrParsedPayload }> {
  const rawText = options.rawText.trim();
  if (!rawText) {
    throw new Error(`${options.portalLabel} lab text is empty`);
  }

  const withChrome = options.portalChromePattern.test(rawText)
    ? rawText
    : `${options.portalChromePrefix}\n${rawText}`;

  const parsed = parseOcrDocument(withChrome);
  parsed.sourceAuthorityId = options.authorityId;
  parsed.portalLabel = options.portalLabel;
  if (!parsed.parserNotes.includes(options.note)) {
    parsed.parserNotes.unshift(options.note);
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
    sourceAuthorityId: options.authorityId,
    lastSyncedAt: new Date().toISOString(),
  });

  return { record, parsed };
}
