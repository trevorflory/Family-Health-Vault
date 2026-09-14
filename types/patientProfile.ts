/**
 * Seedable patient profile row for local QA sandbox / SQLite.
 */
export type SeedProfileRole = 'aging_parent' | 'child' | 'self';

export interface PatientProfileRecord {
  id: string;
  displayName: string;
  role: SeedProfileRole;
  ageYears: number;
  city: string;
  province: string;
  conditionsJson: string;
  medicationsJson: string;
  allergiesJson: string;
  vaccinesJson: string;
  notesJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeedMedication {
  name: string;
  dose: string;
  frequency: string;
}

export interface SeedVaccine {
  name: string;
  doseNumber: string;
  dateGiven: string;
  scheduleNote: string;
}

export const PATIENT_PROFILES_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS PatientProfiles (
  id TEXT PRIMARY KEY NOT NULL,
  displayName TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('aging_parent', 'child', 'self')),
  ageYears INTEGER NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  conditionsJson TEXT NOT NULL,
  medicationsJson TEXT NOT NULL,
  allergiesJson TEXT NOT NULL,
  vaccinesJson TEXT NOT NULL,
  notesJson TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_role ON PatientProfiles(role);
`;
