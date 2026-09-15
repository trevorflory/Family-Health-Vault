import type {
  MedicalEventRecord,
  SaveMedicalEventInput,
} from '../types/db';
import { getHealthcareDb } from './client';

function newId(): string {
  return `me_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRecord(
  row: MedicalEventRecord & Partial<MedicalEventRecord>,
): MedicalEventRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    kind: row.kind,
    sourceUri: row.sourceUri ?? null,
    rawText: row.rawText,
    parsedJson: row.parsedJson,
    status: row.status,
    sourceType: row.sourceType ?? 'OCR',
    sourceAuthorityId: row.sourceAuthorityId ?? null,
    externalId: row.externalId ?? null,
    lastSyncedAt: row.lastSyncedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function saveMedicalEvent(
  input: SaveMedicalEventInput,
): Promise<MedicalEventRecord> {
  const db = await getHealthcareDb();
  const now = new Date().toISOString();
  const id = input.id ?? newId();

  const existing = await db.getFirstAsync<{ id: string; createdAt: string }>(
    'SELECT id, createdAt FROM MedicalEvents WHERE id = ?',
    [id],
  );

  const record: MedicalEventRecord = {
    id,
    patientId: input.patientId,
    kind: input.kind,
    sourceUri: input.sourceUri ?? null,
    rawText: input.rawText,
    parsedJson: JSON.stringify(input.parsed),
    status: input.status,
    sourceType: input.sourceType ?? 'OCR',
    sourceAuthorityId: input.sourceAuthorityId ?? null,
    externalId: input.externalId ?? null,
    lastSyncedAt: input.lastSyncedAt ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    await db.runAsync(
      `UPDATE MedicalEvents
       SET patientId = ?, kind = ?, sourceUri = ?, rawText = ?, parsedJson = ?,
           status = ?, sourceType = ?, sourceAuthorityId = ?, externalId = ?,
           lastSyncedAt = ?, updatedAt = ?
       WHERE id = ?`,
      [
        record.patientId,
        record.kind,
        record.sourceUri,
        record.rawText,
        record.parsedJson,
        record.status,
        record.sourceType,
        record.sourceAuthorityId,
        record.externalId,
        record.lastSyncedAt,
        record.updatedAt,
        record.id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO MedicalEvents
        (id, patientId, kind, sourceUri, rawText, parsedJson, status,
         sourceType, sourceAuthorityId, externalId, lastSyncedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.patientId,
        record.kind,
        record.sourceUri,
        record.rawText,
        record.parsedJson,
        record.status,
        record.sourceType,
        record.sourceAuthorityId,
        record.externalId,
        record.lastSyncedAt,
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  return record;
}

const SELECT_COLS = `id, patientId, kind, sourceUri, rawText, parsedJson, status,
  sourceType, sourceAuthorityId, externalId, lastSyncedAt, createdAt, updatedAt`;

export async function listMedicalEventsForPatient(
  patientId: string,
): Promise<MedicalEventRecord[]> {
  const db = await getHealthcareDb();
  const rows = await db.getAllAsync<MedicalEventRecord>(
    `SELECT ${SELECT_COLS}
     FROM MedicalEvents WHERE patientId = ? ORDER BY updatedAt DESC`,
    [patientId],
  );
  return rows.map(normalizeRecord);
}

export async function getMedicalEventById(
  id: string,
): Promise<MedicalEventRecord | null> {
  const db = await getHealthcareDb();
  const row = await db.getFirstAsync<MedicalEventRecord>(
    `SELECT ${SELECT_COLS} FROM MedicalEvents WHERE id = ?`,
    [id],
  );
  return row ? normalizeRecord(row) : null;
}

export async function findMedicalEventByExternalId(
  patientId: string,
  externalId: string,
): Promise<MedicalEventRecord | null> {
  const db = await getHealthcareDb();
  const row = await db.getFirstAsync<MedicalEventRecord>(
    `SELECT ${SELECT_COLS}
     FROM MedicalEvents WHERE patientId = ? AND externalId = ?`,
    [patientId, externalId],
  );
  return row ? normalizeRecord(row) : null;
}
