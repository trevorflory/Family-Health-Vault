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
  'pt-leo-04': {
    patientId: 'pt-leo-04',
    fullName: 'Leo Ellis',
    preferredName: 'Leo',
    ageYears: 4,
    sex: 'male',
    relationshipLabel: 'son',
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
    ageYears: 9,
    sex: 'female',
    relationshipLabel: 'daughter',
    chronicConditions: [],
    activeMedications: [],
    recentEvents: ['Completed childhood vaccinations on schedule'],
    historicalMarkers: ['No known drug allergies on file'],
  },
  'pt-self-01': {
    patientId: 'pt-self-01',
    fullName: 'Alex Ellis',
    ageYears: 42,
    sex: 'unspecified',
    relationshipLabel: 'self',
    chronicConditions: ['Caregiver back strain'],
    activeMedications: [
      { name: 'Vitamin D', dose: '1000 IU', frequency: 'daily' },
    ],
    recentEvents: ['Missing fasting lipid panel upload (self-care backlog)'],
    historicalMarkers: [
      'Sandwich caregiver — managing aging parent and young child concurrently',
    ],
  },
};

export function getPatientVaultProfile(
  patientId: string,
): PatientVaultProfile | undefined {
  return PATIENT_VAULT[patientId];
}
