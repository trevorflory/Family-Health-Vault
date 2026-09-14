import type {
  PatientProfileRecord,
  SeedMedication,
  SeedVaccine,
} from '../types/patientProfile';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

/**
 * Web PatientProfiles store (sessionStorage-backed).
 * Avoids expo-sqlite / wa-sqlite.wasm under Metro web.
 */
const STORAGE_KEY = 'healthcare.web.patientProfiles.v1';
const memoryStore = loadSessionMap<PatientProfileRecord>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

export async function upsertPatientProfile(
  input: Omit<PatientProfileRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<PatientProfileRecord> {
  const now = new Date().toISOString();
  const existing = memoryStore.get(input.id);

  const record: PatientProfileRecord = {
    id: input.id,
    displayName: input.displayName,
    role: input.role,
    ageYears: input.ageYears,
    city: input.city,
    province: input.province,
    conditionsJson: input.conditionsJson,
    medicationsJson: input.medicationsJson,
    allergiesJson: input.allergiesJson,
    vaccinesJson: input.vaccinesJson,
    notesJson: input.notesJson,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  memoryStore.set(record.id, record);
  persist();
  return record;
}

export async function listPatientProfiles(): Promise<PatientProfileRecord[]> {
  return [...memoryStore.values()].sort((a, b) => {
    const roleCmp = a.role.localeCompare(b.role);
    if (roleCmp !== 0) return roleCmp;
    return a.displayName.localeCompare(b.displayName);
  });
}

export async function getPatientProfile(
  id: string,
): Promise<PatientProfileRecord | null> {
  return memoryStore.get(id) ?? null;
}

export function parseMedicationsJson(json: string): SeedMedication[] {
  try {
    return JSON.parse(json) as SeedMedication[];
  } catch {
    return [];
  }
}

export function parseVaccinesJson(json: string): SeedVaccine[] {
  try {
    return JSON.parse(json) as SeedVaccine[];
  } catch {
    return [];
  }
}

export function __resetPatientProfilesForTests(): void {
  memoryStore.clear();
  clearSessionMap(STORAGE_KEY);
}
