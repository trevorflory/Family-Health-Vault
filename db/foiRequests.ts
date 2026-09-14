import * as SQLite from 'expo-sqlite';
import type {
  FOIRequestPayload,
  FOIRequestRecord,
  FOIRequestStatus,
} from '../types/foiPayload';

const DB_NAME = 'healthcare_foi.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
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

function newId(): string {
  return `foi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface SaveFOIRequestInput {
  id?: string;
  patientId: string;
  payload: FOIRequestPayload;
  pdfUri?: string | null;
  status: FOIRequestStatus;
}

/**
 * Insert or update a FOI request row. Generate/dispatch flows call this
 * with status DRAFT or DISPATCHED respectively.
 */
export async function saveFOIRequest(
  input: SaveFOIRequestInput,
): Promise<FOIRequestRecord> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = input.id ?? newId();

  const existing = await db.getFirstAsync<{ id: string; createdAt: string }>(
    'SELECT id, createdAt FROM FOIRequests WHERE id = ?',
    [id],
  );

  const record: FOIRequestRecord = {
    id,
    patientId: input.patientId,
    jurisdiction: input.payload.jurisdiction,
    facilityId: input.payload.facility.id,
    payloadJson: JSON.stringify(input.payload),
    pdfUri: input.pdfUri ?? null,
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    await db.runAsync(
      `UPDATE FOIRequests
       SET patientId = ?, jurisdiction = ?, facilityId = ?, payloadJson = ?,
           pdfUri = ?, status = ?, updatedAt = ?
       WHERE id = ?`,
      [
        record.patientId,
        record.jurisdiction,
        record.facilityId,
        record.payloadJson,
        record.pdfUri,
        record.status,
        record.updatedAt,
        record.id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO FOIRequests
        (id, patientId, jurisdiction, facilityId, payloadJson, pdfUri, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.patientId,
        record.jurisdiction,
        record.facilityId,
        record.payloadJson,
        record.pdfUri,
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  return record;
}

export async function listFOIRequestsForPatient(
  patientId: string,
): Promise<FOIRequestRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FOIRequestRecord>(
    `SELECT id, patientId, jurisdiction, facilityId, payloadJson, pdfUri, status, createdAt, updatedAt
     FROM FOIRequests WHERE patientId = ? ORDER BY updatedAt DESC`,
    [patientId],
  );
  return rows;
}

export async function getFOIRequestById(
  id: string,
): Promise<FOIRequestRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FOIRequestRecord>(
    `SELECT id, patientId, jurisdiction, facilityId, payloadJson, pdfUri, status, createdAt, updatedAt
     FROM FOIRequests WHERE id = ?`,
    [id],
  );
  return row ?? null;
}

/** Test helper — resets module DB handle (in-memory / re-open). */
export function __resetFOIDbForTests(): void {
  dbPromise = null;
}
