/**
 * Local med-dose “given” marks for digest Mark Meds Given.
 * Web: sessionStorage; Native: SQLite (see medDoses.ts).
 */

import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

export interface MedDoseMark {
  id: string;
  patientId: string;
  medicationId: string;
  /** YYYY-MM-DD local */
  dateKey: string;
  markedAt: string;
}

const STORAGE_KEY = 'healthcare.web.medDoses.v1';
const memoryStore = loadSessionMap<MedDoseMark>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

function markId(
  patientId: string,
  medicationId: string,
  dateKey: string,
): string {
  return `${patientId}::${dateKey}::${medicationId}`;
}

export async function markMedDosesGiven(input: {
  patientId: string;
  medicationIds: string[];
  dateKey: string;
  markedAt?: string;
}): Promise<MedDoseMark[]> {
  const markedAt = input.markedAt ?? new Date().toISOString();
  const saved: MedDoseMark[] = [];
  for (const medicationId of input.medicationIds) {
    const id = markId(input.patientId, medicationId, input.dateKey);
    const row: MedDoseMark = {
      id,
      patientId: input.patientId,
      medicationId,
      dateKey: input.dateKey,
      markedAt,
    };
    memoryStore.set(id, row);
    saved.push(row);
  }
  persist();
  return saved;
}

export async function listMedDosesGiven(
  patientId: string,
  dateKey: string,
): Promise<string[]> {
  return [...memoryStore.values()]
    .filter((r) => r.patientId === patientId && r.dateKey === dateKey)
    .map((r) => r.medicationId);
}

export async function listMedDosesGivenBetween(
  patientId: string,
  fromDateKey: string,
  toDateKey: string,
): Promise<MedDoseMark[]> {
  return [...memoryStore.values()].filter(
    (r) =>
      r.patientId === patientId &&
      r.dateKey >= fromDateKey &&
      r.dateKey <= toDateKey,
  );
}

export async function clearMedDoseGiven(
  patientId: string,
  medicationId: string,
  dateKey: string,
): Promise<void> {
  memoryStore.delete(markId(patientId, medicationId, dateKey));
  persist();
}

export async function setMedDoseGiven(input: {
  patientId: string;
  medicationId: string;
  dateKey: string;
  given: boolean;
}): Promise<void> {
  if (input.given) {
    await markMedDosesGiven({
      patientId: input.patientId,
      medicationIds: [input.medicationId],
      dateKey: input.dateKey,
    });
  } else {
    await clearMedDoseGiven(
      input.patientId,
      input.medicationId,
      input.dateKey,
    );
  }
}

export function __resetMedDosesForTests(): void {
  memoryStore.clear();
  clearSessionMap(STORAGE_KEY);
}
