/**
 * Web: sessionStorage-backed profile overrides for local full-test.
 */

import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

export interface ProfileOverride {
  patientId: string;
  preferredName?: string;
  conditionsText?: string;
  allergiesText?: string;
  updatedAt: string;
}

const KEY = 'healthcare.web.profileOverrides.v1';
const map = loadSessionMap<ProfileOverride>(KEY);

function persist(): void {
  persistSessionMap(KEY, map);
}

export async function getProfileOverride(
  patientId: string,
): Promise<ProfileOverride | null> {
  return map.get(patientId) ?? null;
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
  map.set(input.patientId, row);
  persist();
  return row;
}

export async function clearProfileOverride(patientId: string): Promise<void> {
  map.delete(patientId);
  persist();
}

export function __resetProfileOverridesForTests(): void {
  map.clear();
  clearSessionMap(KEY);
}
