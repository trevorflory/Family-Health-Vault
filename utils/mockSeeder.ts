import { DEMO_CAREGIVER_ID } from '../data/caregiverHousehold';
import { getFacilityById } from '../data/healthAuthorities';
import { saveMedicalEvent } from '../db/medicalEvents';
import { upsertPatientProfile } from '../db/patientProfiles';
import type { SeedMedication, SeedVaccine } from '../types/patientProfile';

export const SEED_DAD_ID = 'pt-7801';
export const SEED_CHILD_ID = 'pt-leo-04';

/** Mock Saskatchewan Health Authority lab report text (as if OCR'd from PDF). */
export const SHA_LAB_PDF_MOCK = `
Saskatchewan Health Authority — Laboratory Report
Patient: Robert Ellis  DOB: 1948-02-19  PHN: ••••-•••-8841
Collected: 2026-09-01  Reported: 2026-09-02
Facility: Saskatoon City Hospital Lab

eGFR 55 mL/min/1.73m2 (ref 60-120)
Creatinine 1.4 mg/dL (ref 0.7-1.3)
HbA1c 7.2 % (ref <5.7)
Potassium 4.1 mmol/L
`.trim();

export const DAD_MEDICATIONS: SeedMedication[] = [
  { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
  { name: 'Ramipril', dose: '5mg', frequency: 'daily' },
  { name: 'Atorvastatin', dose: '20mg', frequency: 'nightly' },
  { name: 'Vitamin D', dose: '1000 IU', frequency: 'daily' },
];

/** SK provincial schedule vaccines for a 4-year-old (school-entry boosters). */
export const CHILD_SK_VACCINES: SeedVaccine[] = [
  {
    name: 'DTaP-IPV',
    doseNumber: 'Booster',
    dateGiven: '2026-04-15',
    scheduleNote:
      'Saskatchewan 4–6 year booster (diphtheria, tetanus, pertussis, polio)',
  },
  {
    name: 'MMRV',
    doseNumber: 'Dose 2',
    dateGiven: '2026-04-15',
    scheduleNote: 'Saskatchewan measles/mumps/rubella/varicella 2nd dose',
  },
  {
    name: 'Influenza (inactivated)',
    doseNumber: 'Annual',
    dateGiven: '2025-10-20',
    scheduleNote: 'SK seasonal influenza for children 6 months+',
  },
];

export interface SeedResult {
  caregiverId: string;
  profiles: Array<{ id: string; displayName: string; role: string }>;
  labEventId: string;
  visitDebriefEventId: string;
  vaccineNote: string;
}

/**
 * Populate local SQLite with realistic sandwich-generation dummy profiles:
 * Dad (78) CKD/T2DM + 4 meds + SHA lab PDF mock + visit debrief; Child (4) SK vaccine record.
 */
export async function seedLocalSandboxData(): Promise<SeedResult> {
  const dad = await upsertPatientProfile({
    id: SEED_DAD_ID,
    displayName: 'Dad (78) - Saskatoon',
    role: 'aging_parent',
    ageYears: 78,
    city: 'Saskatoon',
    province: 'SK',
    conditionsJson: JSON.stringify([
      'Stage 3 CKD',
      'Type 2 Diabetes',
      'Mild cognitive impairment',
    ]),
    medicationsJson: JSON.stringify(DAD_MEDICATIONS),
    allergiesJson: JSON.stringify(['Penicillin (rash)', 'Sulfa drugs']),
    vaccinesJson: JSON.stringify([]),
    notesJson: JSON.stringify({
      shaLabMock: true,
      pendingFoiDays: 34,
      nephrologyFollowUpHours: 48,
    }),
  });

  const child = await upsertPatientProfile({
    id: SEED_CHILD_ID,
    displayName: 'Child (4) - Regina',
    role: 'child',
    ageYears: 4,
    city: 'Regina',
    province: 'SK',
    conditionsJson: JSON.stringify([]),
    medicationsJson: JSON.stringify([
      {
        name: "Children's multivitamin",
        dose: '1 chewable',
        frequency: 'daily',
      },
    ]),
    allergiesJson: JSON.stringify(['NKDA']),
    vaccinesJson: JSON.stringify(CHILD_SK_VACCINES),
    notesJson: JSON.stringify({
      schedule: 'Saskatchewan childhood immunization schedule (4-year visit)',
    }),
  });

  const labEvent = await saveMedicalEvent({
    id: 'me_seed_sha_lab_dad',
    patientId: SEED_DAD_ID,
    kind: 'LAB_RESULT',
    sourceUri: 'mock://sha/lab-report-2026-09-02.pdf',
    rawText: SHA_LAB_PDF_MOCK,
    parsed: {
      documentHint: 'lab',
      labs: [
        {
          testName: 'eGFR',
          value: '55',
          units: 'mL/min/1.73m2',
          referenceRange: '60-120',
        },
        {
          testName: 'Creatinine',
          value: '1.4',
          units: 'mg/dL',
          referenceRange: '0.7-1.3',
        },
        {
          testName: 'HbA1c',
          value: '7.2',
          units: '%',
          referenceRange: '<5.7',
        },
      ],
      prescriptions: [],
      parserNotes: ['Seeded mock Saskatchewan Health Authority lab PDF'],
    },
    status: 'CONFIRMED',
  });

  const visitDebrief = await saveMedicalEvent({
    id: 'me_seed_visit_debrief_dad',
    patientId: SEED_DAD_ID,
    kind: 'VISIT_DEBRIEF',
    sourceUri: 'mock://voice/dad-nephrology-debrief.m4a',
    rawText:
      'Nephrology talked about ankle swelling and evening fatigue. Keep Metformin. Bring blister pack next time.',
    parsed: {
      eventType: 'VISIT_DEBRIEF',
      discussionSummary:
        'Nephrology discussed ankle swelling and evening fatigue; caregiver to monitor both before next labs.',
      dosageChanges: [
        {
          medicationName: 'Metformin',
          changeDescription: 'Continue current dose pending next labs',
        },
      ],
      actionItems: [
        'Bring blister pack to next visit',
        'Note evening ankle size for clinician',
      ],
    },
    status: 'CONFIRMED',
  });

  const sha = getFacilityById('sk-sha');
  if (!sha) {
    throw new Error('Missing Saskatchewan Health Authority template (sk-sha)');
  }

  return {
    caregiverId: DEMO_CAREGIVER_ID,
    profiles: [
      { id: dad.id, displayName: dad.displayName, role: dad.role },
      { id: child.id, displayName: child.displayName, role: child.role },
    ],
    labEventId: labEvent.id,
    visitDebriefEventId: visitDebrief.id,
    vaccineNote: `${CHILD_SK_VACCINES.length} SK schedule vaccines seeded for Child (4)`,
  };
}

/** Pure fixtures for unit tests (no SQLite). */
export function getDadSeedFixture() {
  return {
    id: SEED_DAD_ID,
    displayName: 'Dad (78) - Saskatoon',
    conditions: ['Stage 3 CKD', 'Type 2 Diabetes', 'Mild cognitive impairment'],
    medications: DAD_MEDICATIONS,
    labPdfMock: SHA_LAB_PDF_MOCK,
  };
}

export function getChildSeedFixture() {
  return {
    id: SEED_CHILD_ID,
    displayName: 'Child (4) - Regina',
    vaccines: CHILD_SK_VACCINES,
  };
}
