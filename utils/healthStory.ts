import type { PatientVaultProfile } from '../types/triage811';

function sexLabel(sex: PatientVaultProfile['sex']): string {
  switch (sex) {
    case 'female':
      return 'female';
    case 'male':
      return 'male';
    case 'intersex':
      return 'intersex';
    default:
      return 'person';
  }
}

function medPhrase(
  meds: PatientVaultProfile['activeMedications'],
): string | null {
  const names = meds
    .filter((m): m is NonNullable<typeof m> => Boolean(m?.name?.trim()))
    .map((m) => {
      const dose = m.dose?.trim();
      return dose ? `${m.name} (${dose})` : m.name;
    });
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * Concise caregiver-facing health story for home / About me tiles.
 * Educational context only — never diagnostic.
 */
export function formatHealthStory(profile: PatientVaultProfile): string {
  const bits: string[] = [
    `${profile.ageYears}-year-old ${sexLabel(profile.sex)}`,
  ];
  if (profile.heightCm != null) bits.push(`${profile.heightCm} cm`);
  if (profile.weightKg != null) bits.push(`${profile.weightKg} kg`);

  const lead = bits.join(', ');
  const conditions = profile.chronicConditions.filter((c) => c.trim());
  const conditionPart =
    conditions.length === 0
      ? 'with no chronic conditions on file'
      : `with ${conditions.join(', ')}`;

  const meds = medPhrase(profile.activeMedications);
  const medPart = meds ? ` Takes ${meds}.` : '';

  return `${lead}, ${conditionPart}.${medPart}`;
}

export function formatHealthStoryDeep(profile: PatientVaultProfile): string {
  const base = formatHealthStory(profile);
  const events = (profile.recentEvents ?? []).filter((e) => e.trim());
  if (events.length === 0) return base;
  return `${base} Recent context: ${events.join('; ')}.`;
}
