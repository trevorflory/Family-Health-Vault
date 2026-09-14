import type {
  FOIRequestPayload,
  FOIRequestRecord,
  FOIRequestStatus,
} from '../types/foiPayload';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

/**
 * Web demo persistence for FOI requests (sessionStorage-backed).
 * Avoids expo-sqlite / wa-sqlite.wasm under Metro web.
 */
const STORAGE_KEY = 'healthcare.web.foiRequests.v1';
const memoryStore = loadSessionMap<FOIRequestRecord>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

function newId(): string {
  return `foi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface SaveFOIRequestInput {
  id?: string;
  patientId: string;
  payload: FOIRequestPayload;
  pdfUri?: string | null;
  status: FOIRequestStatus;
}

export async function saveFOIRequest(
  input: SaveFOIRequestInput,
): Promise<FOIRequestRecord> {
  const now = new Date().toISOString();
  const id = input.id ?? newId();
  const existing = memoryStore.get(id);

  const record: FOIRequestRecord = {
    id,
    patientId: input.patientId,
    jurisdiction: input.payload.jurisdiction,
    facilityId: input.payload.facility.id,
    payloadJson: JSON.stringify(input.payload),
    pdfUri: input.pdfUri ?? null,
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  memoryStore.set(id, record);
  persist();
  return record;
}

export async function listFOIRequestsForPatient(
  patientId: string,
): Promise<FOIRequestRecord[]> {
  return [...memoryStore.values()]
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getFOIRequestById(
  id: string,
): Promise<FOIRequestRecord | null> {
  return memoryStore.get(id) ?? null;
}

/** Test helper — clears in-memory FOI rows. */
export function __resetFOIDbForTests(): void {
  memoryStore.clear();
  clearSessionMap(STORAGE_KEY);
}
