import * as SQLite from 'expo-sqlite';
import {
  HEALTHCARE_DB_NAME,
  MEDICAL_EVENTS_TABLE_DDL,
} from '../types/db';
import { PATIENT_PROFILES_TABLE_DDL } from '../types/patientProfile';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Shared local SQLite handle. Ensures MedicalEvents, PatientProfiles, FOIRequests.
 */
export async function getHealthcareDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(HEALTHCARE_DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        ${MEDICAL_EVENTS_TABLE_DDL}
        ${PATIENT_PROFILES_TABLE_DDL}
        CREATE TABLE IF NOT EXISTS FOIRequests (
          id TEXT PRIMARY KEY NOT NULL,
          patientId TEXT NOT NULL,
          jurisdiction TEXT NOT NULL,
          facilityId TEXT NOT NULL,
          payloadJson TEXT NOT NULL,
          pdfUri TEXT,
          status TEXT NOT NULL CHECK (status IN ('DRAFT', 'DISPATCHED')),
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_foi_patient ON FOIRequests(patientId);
        CREATE INDEX IF NOT EXISTS idx_foi_status ON FOIRequests(status);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export function __resetHealthcareDbForTests(): void {
  dbPromise = null;
}
