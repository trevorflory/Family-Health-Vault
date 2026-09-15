import { getPatientVaultProfile } from '../data/patientVault';
import type {
  DispatcherCue,
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

function formatSymptomList(currentSymptoms: string[]): string {
  return (
    currentSymptoms.map((s) => s.trim()).filter(Boolean).join('; ') ||
    'symptoms as discussed'
  );
}

/**
 * Opening line when the nurse asks why you are calling — short; details live
 * on the dispatcher cue sheet so the caregiver can answer their script.
 */
function buildSpokenIntro(
  profile: PatientVaultProfile,
  currentSymptoms: string[],
): string {
  const symptoms = formatSymptomList(currentSymptoms);
  const name = profile.preferredName?.trim() || profile.fullName;
  return `I'm calling about my ${profile.ageYears}-year-old ${sexPhrase(profile.sex)} ${profile.relationshipLabel}, ${name}. Today I'm concerned about: ${symptoms}. I have their history and medications ready if you need them.`;
}

/**
 * Mirror a typical 811 dispatcher script: they ask; caregiver answers from vault.
 * SaMD: factual restatement only — no acuity, diagnosis, or treatment advice.
 */
export function buildDispatcherCueSheet(
  profile: PatientVaultProfile,
  currentSymptoms: string[],
): Triage811Output['dispatcherCueSheet'] {
  const name = profile.preferredName?.trim()
    ? `${profile.fullName} (goes by ${profile.preferredName.trim()})`
    : profile.fullName;
  const conditions = formatConditions(profile.chronicConditions);
  const meds = formatActiveMedications(profile.activeMedications);
  const recent = (profile.recentEvents ?? [])
    .map((e) => e.trim())
    .filter(Boolean);
  const recentClause =
    recent.length > 0 ? recent.join('; ') : 'none listed in the vault';
  const markers = (profile.historicalMarkers ?? [])
    .map((m) => m.trim())
    .filter(Boolean);
  const markerClause =
    markers.length > 0
      ? ` Extra context on file: ${markers.slice(0, 2).join('; ')}.`
      : '';

  const who: DispatcherCue = {
    dispatcherAsks: 'Who are you calling about? What is their age and relationship to you?',
    readyAnswer: `${name}, ${profile.ageYears}-year-old ${sexPhrase(profile.sex)}, my ${profile.relationshipLabel}.`,
  };

  const whatsHappening: DispatcherCue = {
    dispatcherAsks:
      'What is happening right now? What symptoms are you seeing, and when did they start?',
    readyAnswer: `Current concerns: ${formatSymptomList(currentSymptoms)}. Exact onset time is not recorded in the vault — share what you observed today.`,
  };

  const historyMeds: DispatcherCue = {
    dispatcherAsks:
      'Do they have any medical conditions or take medications regularly?',
    readyAnswer: `Conditions on file: ${conditions}. Medications: ${meds}.`,
  };

  const recentContext: DispatcherCue = {
    dispatcherAsks:
      'Has anything changed recently — illness, hospital visit, falls, or new symptoms?',
    readyAnswer: `Recent events on file: ${recentClause}.${markerClause}`,
  };

  return [who, whatsHappening, historyMeds, recentContext];
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
      'Patient has chronic kidney disease on file; share fluid intake/output details when the nurse asks about liquids or urine',
    );
  }

  if (
    conditions.some((c) => c.includes('diabetes')) &&
    (symptomBlob.includes('confusion') || symptomBlob.includes('fever'))
  ) {
    flags.push(
      'Diabetes on file with acute confusion/fever — when asked, mention last known oral intake and usual glucose pattern',
    );
  }

  if (
    conditions.some((c) => c.includes('asthma')) &&
    (symptomBlob.includes('breath') || symptomBlob.includes('cough'))
  ) {
    flags.push(
      'Asthma on file; when asked about breathing treatments, note inhaler use today',
    );
  }

  // Deduplicate while preserving order
  return [...new Set(flags.map((f) => f.trim()).filter(Boolean))];
}

/**
 * Optional clarifying questions after the nurse finishes their script —
 * solicit clinical judgment; do not assert acuity.
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
 * Framed for answering the nurse’s dispatcher script, not diagnosing.
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
    dispatcherCueSheet: buildDispatcherCueSheet(profile, symptoms),
    historicalRedFlags: deriveHistoricalRedFlags(profile, symptoms),
    questionsToAskNurse: buildQuestionsToAskNurse(profile, symptoms),
    regulatoryNotice: REGULATORY_NOTICE,
  };
}
