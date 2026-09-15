import type {
  MedicalEventRecord,
  SaveMedicalEventInput,
} from '../types/db';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

/**
 * Web MedicalEvents store (sessionStorage-backed).
 * Avoids expo-sqlite / wa-sqlite.wasm under Metro web and survives
 * full-document navigations between Sandbox seed and SBAR export.
 */
const STORAGE_KEY = 'healthcare.web.medicalEvents.v2';
const memoryStore = loadSessionMap<MedicalEventRecord>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

function newId(): string {
  return `me_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRecord(row: MedicalEventRecord): MedicalEventRecord {
  return {
    ...row,
    sourceType: row.sourceType ?? 'OCR',
    sourceAuthorityId: row.sourceAuthorityId ?? null,
    externalId: row.externalId ?? null,
    lastSyncedAt: row.lastSyncedAt ?? null,
  };
}

export async function saveMedicalEvent(
  input: SaveMedicalEventInput,
): Promise<MedicalEventRecord> {
  const now = new Date().toISOString();
  const id = input.id ?? newId();
  const existing = memoryStore.get(id);

  const record: MedicalEventRecord = normalizeRecord({
    id,
    patientId: input.patientId,
    kind: input.kind,
    sourceUri: input.sourceUri ?? null,
    rawText: input.rawText,
    parsedJson: JSON.stringify(input.parsed),
    status: input.status,
    sourceType: input.sourceType ?? 'OCR',
    sourceAuthorityId: input.sourceAuthorityId ?? null,
    externalId: input.externalId ?? null,
    lastSyncedAt: input.lastSyncedAt ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  memoryStore.set(id, record);
  persist();
  return record;
}

export async function listMedicalEventsForPatient(
  patientId: string,
): Promise<MedicalEventRecord[]> {
  return [...memoryStore.values()]
    .filter((r) => r.patientId === patientId)
    .map(normalizeRecord)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMedicalEventById(
  id: string,
): Promise<MedicalEventRecord | null> {
  const row = memoryStore.get(id);
  return row ? normalizeRecord(row) : null;
}

export async function findMedicalEventByExternalId(
  patientId: string,
  externalId: string,
): Promise<MedicalEventRecord | null> {
  for (const row of memoryStore.values()) {
    if (row.patientId === patientId && row.externalId === externalId) {
      return normalizeRecord(row);
    }
  }
  return null;
}

export function __resetMedicalEventsForTests(): void {
  memoryStore.clear();
  clearSessionMap(STORAGE_KEY);
}
