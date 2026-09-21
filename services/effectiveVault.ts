import { getPatientVaultProfile } from '../data/patientVault';
import { getVaultMedOverrides } from '../db/vaultMedOverrides';
import { getProfileOverride } from '../db/profileOverrides';
import type { DigestMedicationDue } from '../types/digest';
import type {
  MedicationRecord,
  PatientVaultProfile,
} from '../types/triage811';

/**
 * Resolve vault profile with session medication + profile overrides when present.
 */
export async function getEffectiveVaultProfile(
  patientId: string,
): Promise<PatientVaultProfile | undefined> {
  const profile = getPatientVaultProfile(patientId);
  if (!profile) return undefined;
  const [overrides, profileOverride] = await Promise.all([
    getVaultMedOverrides(patientId),
    getProfileOverride(patientId),
  ]);
  let next: PatientVaultProfile = profile;
  if (overrides) {
    next = { ...next, activeMedications: overrides };
  }
  if (profileOverride) {
    const conditions = profileOverride.conditionsText
      ? profileOverride.conditionsText
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : next.chronicConditions;
    const markers = [...(next.historicalMarkers ?? [])];
    if (profileOverride.allergiesText) {
      markers.unshift(`Allergies (local): ${profileOverride.allergiesText}`);
    }
    next = {
      ...next,
      preferredName: profileOverride.preferredName ?? next.preferredName,
      chronicConditions: conditions,
      historicalMarkers: markers,
    };
  }
  return next;
}

export async function getEffectiveMedications(
  patientId: string,
): Promise<MedicationRecord[]> {
  const profile = await getEffectiveVaultProfile(patientId);
  return (profile?.activeMedications ?? []).filter(
    (m): m is MedicationRecord => Boolean(m?.name),
  );
}

/**
 * When the caregiver has edited prescriptions, rebuild today's digest med rows
 * from overrides while preserving fixture schedule/given marks by name.
 */
export function mergeOverridesIntoMedsToday(
  fixtureMeds: DigestMedicationDue[],
  overrides: MedicationRecord[] | null,
  givenSet: Set<string>,
): DigestMedicationDue[] {
  if (!overrides) {
    return fixtureMeds.map((m) => ({
      ...m,
      given: m.given || givenSet.has(m.medicationId),
    }));
  }

  return overrides.map((m, i) => {
    const match = fixtureMeds.find(
      (f) => f.name.trim().toLowerCase() === m.name.trim().toLowerCase(),
    );
    const medicationId = match?.medicationId ?? `override-med-${i}`;
    return {
      medicationId,
      name: m.name,
      dose: m.dose ?? match?.dose ?? null,
      scheduledTime: match?.scheduledTime ?? '08:00',
      given: Boolean(match?.given) || givenSet.has(medicationId),
    };
  });
}

export function formatMedicationLines(meds: MedicationRecord[]): string[] {
  return meds.map((m) => {
    const dose = m.dose?.trim();
    const freq = m.frequency?.trim();
    return [m.name, dose, freq].filter(Boolean).join(' ');
  });
}
