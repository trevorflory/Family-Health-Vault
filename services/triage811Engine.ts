import { getPatientVaultProfile } from '../data/patientVault';
import type {
  MedicationRecord,
  PatientVaultProfile,
  Triage811Output,
} from '../types/triage811';

export const REGULATORY_NOTICE =
  'This tool is a Contextual Summarizer and Caregiver Script Assistant only. It does not diagnose conditions, triage acuity, or prescribe treatments. Follow guidance from the 811 nurse or other qualified clinicians.';

/** Common acute symptom checklist options for the prep UI. */
export const ACUTE_SYMPTOM_OPTIONS = [
  'Sudden onset confusion',
  'Mild fever',
  'High fever',
  'Chest pain or pressure',
  'Shortness of breath',
  'Severe headache',
  'Persistent vomiting',
  'Uncontrolled bleeding',
  'New rash',
  'Fall with possible injury',
  'Difficulty speaking',
  'Abdominal pain',
  'Reduced urine output',
  'Worsening cough',
] as const;

function sexPhrase(sex: PatientVaultProfile['sex']): string {
  switch (sex) {
    case 'female':
      return 'female';
    case 'male':
      return 'male';
    case 'intersex':
      return 'intersex';
    default:
      return 'patient';
  }
}

function formatMedication(med: MedicationRecord): string {
  const dose = med.dose?.trim();
  const frequency = med.frequency?.trim();
  const parts = [med.name.trim()];
  if (dose) parts.push(dose);
  if (frequency) parts.push(frequency);
  return parts.join(' ');
}

/**
 * Normalize medication list: drop null/undefined and blank names without throwing.
 */
export function formatActiveMedications(
  meds: PatientVaultProfile['activeMedications'] | null | undefined,
): string {
  if (!meds || meds.length === 0) return 'none listed';
  const cleaned = meds
    .filter((m): m is MedicationRecord => Boolean(m && m.name?.trim()))
    .map(formatMedication);
  return cleaned.length > 0 ? cleaned.join(', ') : 'none listed';
}

function formatConditions(conditions: string[] | null | undefined): string {
  if (!conditions || conditions.length === 0) return 'none listed';
  return conditions.filter((c) => c?.trim()).join(', ') || 'none listed';
}

function buildSpokenIntro(
  profile: PatientVaultProfile,
  currentSymptoms: string[],
): string {
  const symptoms =
    currentSymptoms.map((s) => s.trim()).filter(Boolean).join(' and ') ||
    'symptoms as discussed';
  const historyParts: string[] = [];
  const conditions = formatConditions(profile.chronicConditions);
  if (conditions !== 'none listed') {
    historyParts.push(conditions);
  }
  const meds = formatActiveMedications(profile.activeMedications);
  if (meds !== 'none listed') {
    historyParts.push(`taking ${meds}`);
  }
  const recent = (profile.recentEvents ?? [])
    .map((e) => e.trim())
    .filter(Boolean);
  if (recent.length) {
    historyParts.push(recent.join('; '));
  }

  const historyClause =
    historyParts.length > 0
      ? ` Relevant history: ${historyParts.join(', ')}.`
      : ' No chronic conditions or medications listed in the vault.';

  return `I'm calling about my ${profile.ageYears}-year-old ${sexPhrase(profile.sex)} ${profile.relationshipLabel}. Acute symptoms: ${symptoms}.${historyClause}`;
}

/**
 * Historical context markers only — never diagnostic conclusions or treatment plans.
 */
export function deriveHistoricalRedFlags(
  profile: PatientVaultProfile,
  currentSymptoms: string[],
): string[] {
  const flags = [...(profile.historicalMarkers ?? [])];
  const symptomBlob = currentSymptoms.join(' ').toLowerCase();
  const conditions = (profile.chronicConditions ?? []).map((c) =>
    c.toLowerCase(),
  );

  if (
    conditions.some((c) => c.includes('ckd') || c.includes('kidney')) &&
    (symptomBlob.includes('fever') ||
      symptomBlob.includes('vomit') ||
      symptomBlob.includes('urine'))
  ) {
    flags.push(
      'Patient has chronic kidney disease on file; share fluid intake/output details with the nurse',
    );
  }

  if (
    conditions.some((c) => c.includes('diabetes')) &&
    (symptomBlob.includes('confusion') || symptomBlob.includes('fever'))
  ) {
    flags.push(
      'Diabetes on file with acute confusion/fever — mention last known oral intake and usual glucose pattern to the nurse',
    );
  }

  if (
    conditions.some((c) => c.includes('asthma')) &&
    (symptomBlob.includes('breath') || symptomBlob.includes('cough'))
  ) {
    flags.push(
      'Asthma on file; note inhaler use today when speaking with the nurse',
    );
  }

  // Deduplicate while preserving order
  return [...new Set(flags.map((f) => f.trim()).filter(Boolean))];
}

/**
 * Caregiver questions for the nurse — solicit clinical judgment; do not assert acuity.
 */
export function buildQuestionsToAskNurse(
  profile: PatientVaultProfile,
  currentSymptoms: string[],
): [string, string, string] {
  const hasFever = currentSymptoms.some((s) =>
    s.toLowerCase().includes('fever'),
  );
  const hasConfusion = currentSymptoms.some((s) =>
    s.toLowerCase().includes('confusion'),
  );
  const senior = profile.ageYears >= 65;
  const pediatric = profile.ageYears < 18;

  const q1 = hasConfusion
    ? 'Given the sudden confusion, should we go to emergency now, visit urgent care, or monitor at home while we wait for our family physician?'
    : 'Should we visit urgent care or wait for our family physician tomorrow?';

  const q2 = hasFever
    ? 'What fever precautions and hydration guidance should we follow until we are assessed, without starting any new medications on our own?'
    : 'What warning signs mean we should call back or go in immediately?';

  let q3: string;
  if (senior && profile.chronicConditions.some((c) => /ckd|kidney/i.test(c))) {
    q3 =
      'With stage 3 CKD on file, are there fluid or medication timing details you want us to track overnight?';
  } else if (pediatric) {
    q3 =
      'For a child this age, what home-monitoring checks should we do over the next few hours before reassessing?';
  } else {
    q3 =
      'Is there anything from this summary the triage nurse needs clarified before advising next steps?';
  }

  return [q1, q2, q3];
}

/**
 * Synthesize a caregiver-facing 811 script from vault history + acute symptoms.
 * SaMD safeguard: returns contextual summary only — no diagnosis or prescriptions.
 */
export async function generate811Script(
  patientId: string,
  currentSymptoms: string[],
): Promise<Triage811Output> {
  const profile = getPatientVaultProfile(patientId);
  if (!profile) {
    throw new Error(`Unknown patientId: ${patientId}`);
  }

  const symptoms = (currentSymptoms ?? [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);

  return {
    spokenIntroScript: buildSpokenIntro(profile, symptoms),
    historicalRedFlags: deriveHistoricalRedFlags(profile, symptoms),
    questionsToAskNurse: buildQuestionsToAskNurse(profile, symptoms),
    regulatoryNotice: REGULATORY_NOTICE,
  };
}
