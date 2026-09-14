import type {
  MedicalEventRecord,
  SaveMedicalEventInput,
} from '../types/db';
import { getHealthcareDb } from './client';

function newId(): string {
  return `me_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
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
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    await db.runAsync(
      `UPDATE MedicalEvents
       SET patientId = ?, kind = ?, sourceUri = ?, rawText = ?, parsedJson = ?,
           status = ?, updatedAt = ?
       WHERE id = ?`,
      [
        record.patientId,
        record.kind,
        record.sourceUri,
        record.rawText,
        record.parsedJson,
        record.status,
        record.updatedAt,
        record.id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO MedicalEvents
        (id, patientId, kind, sourceUri, rawText, parsedJson, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.patientId,
        record.kind,
        record.sourceUri,
        record.rawText,
        record.parsedJson,
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  return record;
}

export async function listMedicalEventsForPatient(
  patientId: string,
): Promise<MedicalEventRecord[]> {
  const db = await getHealthcareDb();
  return db.getAllAsync<MedicalEventRecord>(
    `SELECT id, patientId, kind, sourceUri, rawText, parsedJson, status, createdAt, updatedAt
     FROM MedicalEvents WHERE patientId = ? ORDER BY updatedAt DESC`,
    [patientId],
  );
}

export async function getMedicalEventById(
  id: string,
): Promise<MedicalEventRecord | null> {
  const db = await getHealthcareDb();
  const row = await db.getFirstAsync<MedicalEventRecord>(
    `SELECT id, patientId, kind, sourceUri, rawText, parsedJson, status, createdAt, updatedAt
     FROM MedicalEvents WHERE id = ?`,
    [id],
  );
  return row ?? null;
}
