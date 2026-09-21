/**
 * Local profile overrides for full-test (not EHR source of truth).
 */

export interface ProfileOverride {
  patientId: string;
  preferredName?: string;
  conditionsText?: string;
  allergiesText?: string;
  updatedAt: string;
}

const store = new Map<string, ProfileOverride>();

export async function getProfileOverride(
  patientId: string,
): Promise<ProfileOverride | null> {
  return store.get(patientId) ?? null;
}

export async function setProfileOverride(
  input: Omit<ProfileOverride, 'updatedAt'> & { updatedAt?: string },
): Promise<ProfileOverride> {
  const row: ProfileOverride = {
    patientId: input.patientId,
    preferredName: input.preferredName?.trim() || undefined,
    conditionsText: input.conditionsText?.trim() || undefined,
    allergiesText: input.allergiesText?.trim() || undefined,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
  store.set(input.patientId, row);
  return row;
}

export async function clearProfileOverride(patientId: string): Promise<void> {
  store.delete(patientId);
}

export function __resetProfileOverridesForTests(): void {
  store.clear();
}
