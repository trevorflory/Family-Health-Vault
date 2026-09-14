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
const STORAGE_KEY = 'healthcare.web.medicalEvents.v1';
const memoryStore = loadSessionMap<MedicalEventRecord>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

function newId(): string {
  return `me_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveMedicalEvent(
  input: SaveMedicalEventInput,
): Promise<MedicalEventRecord> {
  const now = new Date().toISOString();
  const id = input.id ?? newId();
  const existing = memoryStore.get(id);

  const record: MedicalEventRecord = {
    id,
    patientId: input.patientId,
    kind: input.kind,
    sourceUri: input.sourceUri ?? null,
    rawText: input.rawText,
    parsedJson: JSON.stringify(input.parsed),
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  memoryStore.set(id, record);
  persist();
  return record;
}

export async function listMedicalEventsForPatient(
  patientId: string,
): Promise<MedicalEventRecord[]> {
  return [...memoryStore.values()]
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMedicalEventById(
  id: string,
): Promise<MedicalEventRecord | null> {
  return memoryStore.get(id) ?? null;
}

export function __resetMedicalEventsForTests(): void {
  memoryStore.clear();
  clearSessionMap(STORAGE_KEY);
}
