import type { PatientVaultProfile } from '../types/triage811';

/**
 * Local patient vault samples spanning pediatric → senior generations.
 * Used by the 811 Call Assistant as historical context only.
 */
export const PATIENT_VAULT: Record<string, PatientVaultProfile> = {
  'pt-1001': {
    patientId: 'pt-1001',
    fullName: 'Avery Chen',
    ageYears: 58,
    sex: 'female',
    relationshipLabel: 'mother',
    chronicConditions: ['Hypertension', 'Osteoarthritis'],
    activeMedications: [
      { name: 'Amlodipine', dose: '5mg', frequency: 'daily' },
      { name: 'Ibuprofen', dose: '200mg', frequency: 'as needed' },
    ],
    recentEvents: ['Annual physical 3 months ago — blood pressure stable'],
    historicalMarkers: [
      'History of orthostatic dizziness; stand slowly after sitting',
    ],
  },
  'pt-2044': {
    patientId: 'pt-2044',
    fullName: 'Jordan Okonkwo',
    ageYears: 50,
    sex: 'male',
    relationshipLabel: 'spouse',
    chronicConditions: ['Asthma'],
    activeMedications: [
      { name: 'Salbutamol inhaler', dose: null, frequency: 'as needed' },
      undefined,
    ],
    recentEvents: [],
    historicalMarkers: ['Prior ED visit for asthma exacerbation (2023)'],
  },
  'pt-7801': {
    patientId: 'pt-7801',
    fullName: 'Robert Ellis',
    preferredName: 'Bob',
    ageYears: 78,
    sex: 'male',
    relationshipLabel: 'father',
    heightCm: 175,
    weightKg: 82,
    chronicConditions: ['Type 2 Diabetes', 'Stage 3 CKD', 'Mild cognitive impairment'],
    activeMedications: [
      { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
      { name: 'Ramipril', dose: '5mg', frequency: 'daily' },
      { name: 'Atorvastatin', dose: '20mg', frequency: 'nightly' },
      { name: 'Vitamin D', dose: '1000 IU', frequency: 'daily' },
    ],
    recentEvents: ['UTI treated with antibiotics 2 weeks ago'],
    historicalMarkers: [
      'Patient has stage 3 CKD; monitor for dehydration',
      'Baseline mild confusion reported by family on busy days',
    ],
  },
  'pt-mom-76': {
    patientId: 'pt-mom-76',
    fullName: 'Helen Ellis',
    preferredName: 'Helen',
    ageYears: 76,
    sex: 'female',
    relationshipLabel: 'mother',
    heightCm: 162,
    weightKg: 68,
    chronicConditions: ['Hypertension', 'Osteoarthritis'],
    activeMedications: [
      { name: 'Amlodipine', dose: '5mg', frequency: 'daily' },
      { name: 'Ibuprofen', dose: '200mg', frequency: 'as needed' },
    ],
    recentEvents: ['Cardiology referral pending BP log review'],
    historicalMarkers: [
      'History of orthostatic dizziness; stand slowly after sitting',
    ],
  },
  'pt-leo-04': {
    patientId: 'pt-leo-04',
    fullName: 'Leo Ellis',
    preferredName: 'Leo',
    ageYears: 4,
    sex: 'male',
    relationshipLabel: 'son',
    heightCm: 102,
    weightKg: 16.9,
    chronicConditions: [],
    activeMedications: [
      { name: "Children's multivitamin", dose: '1 chewable', frequency: 'daily' },
    ],
    recentEvents: [
      'Completed Saskatchewan 4-year immunization visit',
      'Well-child visit prep — immunization booklet needed',
    ],
    historicalMarkers: [
      'DTaP-IPV + MMRV boosters on SK provincial schedule',
      'No known drug allergies on file',
      'Up to date on scheduled childhood vaccines through age 3',
    ],
  },
  'pt-child-09': {
    patientId: 'pt-child-09',
    fullName: 'Mia Ellis',
    preferredName: 'Mia',
    ageYears: 9,
    sex: 'female',
    relationshipLabel: 'daughter',
    heightCm: 135,
    weightKg: 30,
    chronicConditions: [],
    activeMedications: [],
    recentEvents: ['Dental cleaning booked', 'Completed childhood vaccinations on schedule'],
    historicalMarkers: ['No known drug allergies on file'],
  },
  'pt-sam-07': {
    patientId: 'pt-sam-07',
    fullName: 'Sam Ellis',
    preferredName: 'Sam',
    ageYears: 7,
    sex: 'male',
    relationshipLabel: 'son',
    heightCm: 122,
    weightKg: 24,
    chronicConditions: ['Mild intermittent asthma'],
    activeMedications: [
      { name: 'Salbutamol inhaler', dose: '2 puffs', frequency: 'as needed / morning review' },
    ],
    recentEvents: ['Asthma action plan reviewed at school'],
    historicalMarkers: ['Prior wheeze with colds — caregiver carries inhaler'],
  },
  'pt-nora-11': {
    patientId: 'pt-nora-11',
    fullName: 'Nora Ellis',
    preferredName: 'Nora',
    ageYears: 11,
    sex: 'female',
    relationshipLabel: 'daughter',
    heightCm: 148,
    weightKg: 40,
    chronicConditions: [],
    activeMedications: [],
    recentEvents: ['School sports physical form outstanding'],
    historicalMarkers: ['No known drug allergies on file'],
  },
  'pt-self-01': {
    patientId: 'pt-self-01',
    fullName: 'Alex Ellis',
    preferredName: 'Alex',
    ageYears: 42,
    sex: 'female',
    relationshipLabel: 'self',
    heightCm: 165,
    weightKg: 60,
    chronicConditions: ['Type 2 Diabetes', 'Caregiver back strain'],
    activeMedications: [
      { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
      { name: 'Vitamin D', dose: '1000 IU', frequency: 'daily' },
    ],
    recentEvents: ['Missing fasting lipid panel upload (self-care backlog)'],
    historicalMarkers: [
      'Sandwich caregiver — managing aging parents and several kids concurrently',
    ],
  },
};
export function getPatientVaultProfile(
  patientId: string,
): PatientVaultProfile | undefined {
  return PATIENT_VAULT[patientId];
}
