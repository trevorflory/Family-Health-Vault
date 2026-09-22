export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface EmergencyPatientContext {
  patientId: string;
  fullName: string;
  ageYears: number;
  allergies: string[];
  activeMedications: string[];
  emergencyContacts: EmergencyContact[];
  primaryCaregiverPhone: string;
  criticalAlerts: string[];
}

/**
 * Compact emergency profiles for offline QR / wallet-card export.
 */
export const EMERGENCY_PROFILES: Record<string, EmergencyPatientContext> = {
  'pt-7801': {
    patientId: 'pt-7801',
    fullName: 'Robert Ellis',
    ageYears: 78,
    allergies: ['Penicillin (rash)', 'Sulfa drugs'],
    activeMedications: [
      'Metformin 500mg BID',
      'Ramipril 5mg daily',
      'Vitamin D',
    ],
    emergencyContacts: [
      { name: 'Alex Ellis', relationship: 'Primary caregiver / child', phone: '+1-306-555-0142' },
      { name: 'Dr. Nguyen', relationship: 'Family physician', phone: '+1-306-555-0198' },
    ],
    primaryCaregiverPhone: '+1-306-555-0142',
    criticalAlerts: [
      'Stage 3 CKD — avoid nephrotoxic agents when possible',
      'Type 2 Diabetes',
      'Mild cognitive impairment — verify historian',
    ],
  },
  'pt-1001': {
    patientId: 'pt-1001',
    fullName: 'Avery Chen',
    ageYears: 58,
    allergies: ['NKDA'],
    activeMedications: ['Amlodipine 5mg daily', 'Ibuprofen 200mg PRN'],
    emergencyContacts: [
      { name: 'Jordan Okonkwo', relationship: 'Spouse', phone: '+1-416-555-0177' },
    ],
    primaryCaregiverPhone: '+1-416-555-0177',
    criticalAlerts: ['Hypertension', 'Orthostatic dizziness history'],
  },
  'pt-2044': {
    patientId: 'pt-2044',
    fullName: 'Jordan Okonkwo',
    ageYears: 50,
    allergies: ['NKDA'],
    activeMedications: ['Salbutamol inhaler PRN'],
    emergencyContacts: [
      { name: 'Avery Chen', relationship: 'Spouse', phone: '+1-416-555-0166' },
    ],
    primaryCaregiverPhone: '+1-416-555-0166',
    criticalAlerts: ['Asthma — prior ED exacerbation 2023'],
  },
  'pt-child-09': {
    patientId: 'pt-child-09',
    fullName: 'Mia Ellis',
    ageYears: 9,
    allergies: ['NKDA'],
    activeMedications: [],
    emergencyContacts: [
      { name: 'Alex Ellis', relationship: 'Parent / primary caregiver', phone: '+1-306-555-0142' },
    ],
    primaryCaregiverPhone: '+1-306-555-0142',
    criticalAlerts: ['Pediatric patient — contact caregiver first'],
  },
  /** Seed / sandbox Child (4) — aligns with SEED_CHILD_ID / proxy Leo profile. */
  'pt-leo-04': {
    patientId: 'pt-leo-04',
    fullName: 'Leo Ellis',
    ageYears: 4,
    allergies: ['NKDA'],
    activeMedications: ["Children's multivitamin 1 chewable daily"],
    emergencyContacts: [
      {
        name: 'Alex Ellis',
        relationship: 'Parent / primary caregiver',
        phone: '+1-306-555-0142',
      },
    ],
    primaryCaregiverPhone: '+1-306-555-0142',
    criticalAlerts: [
      'Pediatric patient (age 4) — contact caregiver first',
      'Up to date on SK childhood vaccines through age 3 (see vault)',
    ],
  },
  'pt-mom-76': {
    patientId: 'pt-mom-76',
    fullName: 'Helen Ellis',
    ageYears: 76,
    allergies: ['NKDA'],
    activeMedications: ['Amlodipine 5mg daily', 'Ibuprofen 200mg PRN'],
    emergencyContacts: [
      {
        name: 'Alex Ellis',
        relationship: 'Primary caregiver / child',
        phone: '+1-306-555-0142',
      },
    ],
    primaryCaregiverPhone: '+1-306-555-0142',
    criticalAlerts: ['Hypertension', 'Orthostatic dizziness history'],
  },
  'pt-sam-07': {
    patientId: 'pt-sam-07',
    fullName: 'Sam Ellis',
    ageYears: 7,
    allergies: ['NKDA'],
    activeMedications: ['Salbutamol inhaler PRN'],
    emergencyContacts: [
      {
        name: 'Alex Ellis',
        relationship: 'Parent / primary caregiver',
        phone: '+1-306-555-0142',
      },
    ],
    primaryCaregiverPhone: '+1-306-555-0142',
    criticalAlerts: [
      'Pediatric patient — contact caregiver first',
      'Mild intermittent asthma — inhaler with caregiver',
    ],
  },
  'pt-nora-11': {
    patientId: 'pt-nora-11',
    fullName: 'Nora Ellis',
    ageYears: 11,
    allergies: ['NKDA'],
    activeMedications: [],
    emergencyContacts: [
      {
        name: 'Alex Ellis',
        relationship: 'Parent / primary caregiver',
        phone: '+1-306-555-0142',
      },
    ],
    primaryCaregiverPhone: '+1-306-555-0142',
    criticalAlerts: ['Pediatric patient — contact caregiver first'],
  },
};

export function getEmergencyProfile(
  patientId: string,
): EmergencyPatientContext | undefined {
  return EMERGENCY_PROFILES[patientId];
}
