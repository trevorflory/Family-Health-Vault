export interface VisitGoalDraft {
  patientId: string;
  appointmentId: string;
  goalsText: string;
  updatedAt: string;
}

const store = new Map<string, VisitGoalDraft>();

function key(patientId: string, appointmentId: string): string {
  return `${patientId}:${appointmentId}`;
}

export async function getVisitGoals(
  patientId: string,
  appointmentId: string,
): Promise<VisitGoalDraft | null> {
  return store.get(key(patientId, appointmentId)) ?? null;
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
  store.set(key(input.patientId, input.appointmentId), draft);
  return draft;
}

export async function listVisitGoals(): Promise<VisitGoalDraft[]> {
  return [...store.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
