import {
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

export interface VisitGoalDraft {
  patientId: string;
  appointmentId: string;
  goalsText: string;
  updatedAt: string;
}

const STORAGE_KEY = 'healthcare.web.visitGoals.v1';
const memoryStore = loadSessionMap<VisitGoalDraft>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

function key(patientId: string, appointmentId: string): string {
  return `${patientId}:${appointmentId}`;
}

export async function getVisitGoals(
  patientId: string,
  appointmentId: string,
): Promise<VisitGoalDraft | null> {
  return memoryStore.get(key(patientId, appointmentId)) ?? null;
}

export async function setVisitGoals(input: {
  patientId: string;
  appointmentId: string;
  goalsText: string;
}): Promise<VisitGoalDraft> {
  const draft: VisitGoalDraft = {
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    goalsText: input.goalsText.trim(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.set(key(input.patientId, input.appointmentId), draft);
  persist();
  return draft;
}

export async function listVisitGoals(): Promise<VisitGoalDraft[]> {
  return [...memoryStore.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
