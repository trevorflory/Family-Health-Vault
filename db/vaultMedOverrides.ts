import type { MedicationRecord } from '../types/triage811';

/**
 * In-memory medication overrides for demo / native.
 * Web uses vaultMedOverrides.web.ts (sessionStorage).
 */
const store = new Map<string, MedicationRecord[]>();

export async function getVaultMedOverrides(
  patientId: string,
): Promise<MedicationRecord[] | null> {
  return store.has(patientId) ? [...(store.get(patientId) ?? [])] : null;
}

export async function setVaultMedOverrides(
  patientId: string,
  meds: MedicationRecord[],
): Promise<void> {
  store.set(
    patientId,
    meds
      .map((m) => ({
        name: m.name.trim(),
        dose: m.dose?.trim() || null,
        frequency: m.frequency?.trim() || null,
      }))
      .filter((m) => m.name.length > 0),
  );
}

export async function clearVaultMedOverrides(patientId: string): Promise<void> {
  store.delete(patientId);
}
