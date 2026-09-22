import { getHealthcareDb } from './client';

export interface MedDoseMark {
  id: string;
  patientId: string;
  medicationId: string;
  /** YYYY-MM-DD local */
  dateKey: string;
  markedAt: string;
}

const MED_DOSES_DDL = `
CREATE TABLE IF NOT EXISTS MedDoseMarks (
  id TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  medicationId TEXT NOT NULL,
  dateKey TEXT NOT NULL,
  markedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_med_doses_patient_date
  ON MedDoseMarks(patientId, dateKey);
`;

async function ensureTable(): Promise<void> {
  const db = await getHealthcareDb();
  await db.execAsync(MED_DOSES_DDL);
}

function markId(
  patientId: string,
  medicationId: string,
  dateKey: string,
): string {
  return `${patientId}::${dateKey}::${medicationId}`;
}

export async function markMedDosesGiven(input: {
  patientId: string;
  medicationIds: string[];
  dateKey: string;
  markedAt?: string;
}): Promise<MedDoseMark[]> {
  await ensureTable();
  const db = await getHealthcareDb();
  const markedAt = input.markedAt ?? new Date().toISOString();
  const saved: MedDoseMark[] = [];

  for (const medicationId of input.medicationIds) {
    const id = markId(input.patientId, medicationId, input.dateKey);
    const row: MedDoseMark = {
      id,
      patientId: input.patientId,
      medicationId,
      dateKey: input.dateKey,
      markedAt,
    };
    await db.runAsync(
      `INSERT OR REPLACE INTO MedDoseMarks
        (id, patientId, medicationId, dateKey, markedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [row.id, row.patientId, row.medicationId, row.dateKey, row.markedAt],
    );
    saved.push(row);
  }
  return saved;
}

export async function listMedDosesGiven(
  patientId: string,
  dateKey: string,
): Promise<string[]> {
  await ensureTable();
  const db = await getHealthcareDb();
  const rows = await db.getAllAsync<{ medicationId: string }>(
    `SELECT medicationId FROM MedDoseMarks
     WHERE patientId = ? AND dateKey = ?`,
    [patientId, dateKey],
  );
  return rows.map((r) => r.medicationId);
}

export async function listMedDosesGivenBetween(
  patientId: string,
  fromDateKey: string,
  toDateKey: string,
): Promise<MedDoseMark[]> {
  await ensureTable();
  const db = await getHealthcareDb();
  return db.getAllAsync<MedDoseMark>(
    `SELECT id, patientId, medicationId, dateKey, markedAt
     FROM MedDoseMarks
     WHERE patientId = ? AND dateKey >= ? AND dateKey <= ?
     ORDER BY dateKey ASC`,
    [patientId, fromDateKey, toDateKey],
  );
}

export async function clearMedDoseGiven(
  patientId: string,
  medicationId: string,
  dateKey: string,
): Promise<void> {
  await ensureTable();
  const db = await getHealthcareDb();
  await db.runAsync(`DELETE FROM MedDoseMarks WHERE id = ?`, [
    markId(patientId, medicationId, dateKey),
  ]);
}

export async function setMedDoseGiven(input: {
  patientId: string;
  medicationId: string;
  dateKey: string;
  given: boolean;
}): Promise<void> {
  if (input.given) {
    await markMedDosesGiven({
      patientId: input.patientId,
      medicationIds: [input.medicationId],
      dateKey: input.dateKey,
    });
  } else {
    await clearMedDoseGiven(
      input.patientId,
      input.medicationId,
      input.dateKey,
    );
  }
}

export function __resetMedDosesForTests(): void {
  // Native tests should reset via shared healthcare DB helper when needed.
}
