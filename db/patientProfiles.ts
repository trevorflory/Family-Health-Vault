import type {
  PatientProfileRecord,
  SeedMedication,
  SeedVaccine,
} from '../types/patientProfile';
import { getHealthcareDb } from './client';

export async function upsertPatientProfile(
  input: Omit<PatientProfileRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<PatientProfileRecord> {
  const db = await getHealthcareDb();
  const now = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string; createdAt: string }>(
    'SELECT id, createdAt FROM PatientProfiles WHERE id = ?',
    [input.id],
  );

  const record: PatientProfileRecord = {
    id: input.id,
    displayName: input.displayName,
    role: input.role,
    ageYears: input.ageYears,
    city: input.city,
    province: input.province,
    conditionsJson: input.conditionsJson,
    medicationsJson: input.medicationsJson,
    allergiesJson: input.allergiesJson,
    vaccinesJson: input.vaccinesJson,
    notesJson: input.notesJson,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  if (existing) {
    await db.runAsync(
      `UPDATE PatientProfiles
       SET displayName = ?, role = ?, ageYears = ?, city = ?, province = ?,
           conditionsJson = ?, medicationsJson = ?, allergiesJson = ?,
           vaccinesJson = ?, notesJson = ?, updatedAt = ?
       WHERE id = ?`,
      [
        record.displayName,
        record.role,
        record.ageYears,
        record.city,
        record.province,
        record.conditionsJson,
        record.medicationsJson,
        record.allergiesJson,
        record.vaccinesJson,
        record.notesJson,
        record.updatedAt,
        record.id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO PatientProfiles
        (id, displayName, role, ageYears, city, province, conditionsJson,
         medicationsJson, allergiesJson, vaccinesJson, notesJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.displayName,
        record.role,
        record.ageYears,
        record.city,
        record.province,
        record.conditionsJson,
        record.medicationsJson,
        record.allergiesJson,
        record.vaccinesJson,
        record.notesJson,
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  return record;
}

export async function listPatientProfiles(): Promise<PatientProfileRecord[]> {
  const db = await getHealthcareDb();
  return db.getAllAsync<PatientProfileRecord>(
    `SELECT * FROM PatientProfiles ORDER BY role, displayName`,
  );
}

export async function getPatientProfile(
  id: string,
): Promise<PatientProfileRecord | null> {
  const db = await getHealthcareDb();
  const row = await db.getFirstAsync<PatientProfileRecord>(
    `SELECT * FROM PatientProfiles WHERE id = ?`,
    [id],
  );
  return row ?? null;
}

export function parseMedicationsJson(json: string): SeedMedication[] {
  try {
    return JSON.parse(json) as SeedMedication[];
  } catch {
    return [];
  }
}

export function parseVaccinesJson(json: string): SeedVaccine[] {
  try {
    return JSON.parse(json) as SeedVaccine[];
  } catch {
    return [];
  }
}
