import type { MedicationRecord } from '../types/triage811';
import {
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

const STORAGE_KEY = 'healthcare.web.vaultMedOverrides.v1';
const memoryStore = loadSessionMap<MedicationRecord[]>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

export async function getVaultMedOverrides(
  patientId: string,
): Promise<MedicationRecord[] | null> {
  const row = memoryStore.get(patientId);
  return row ? [...row] : null;
}

export async function setVaultMedOverrides(
  patientId: string,
  meds: MedicationRecord[],
): Promise<void> {
  memoryStore.set(
    patientId,
    meds
      .map((m) => ({
        name: m.name.trim(),
        dose: m.dose?.trim() || null,
        frequency: m.frequency?.trim() || null,
      }))
      .filter((m) => m.name.length > 0),
  );
  persist();
}

export async function clearVaultMedOverrides(patientId: string): Promise<void> {
  memoryStore.delete(patientId);
  persist();
}
