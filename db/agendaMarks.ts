import { getHealthcareDb } from './client';

export interface AgendaDoneMark {
  id: string;
  itemId: string;
  dateKey: string;
  markedAt: string;
}

const AGENDA_MARKS_DDL = `
CREATE TABLE IF NOT EXISTS AgendaDoneMarks (
  id TEXT PRIMARY KEY NOT NULL,
  itemId TEXT NOT NULL,
  dateKey TEXT NOT NULL,
  markedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agenda_marks_date
  ON AgendaDoneMarks(dateKey);
`;

async function ensureTable(): Promise<void> {
  const db = await getHealthcareDb();
  await db.execAsync(AGENDA_MARKS_DDL);
}

function rowId(itemId: string, dateKey: string): string {
  return `${dateKey}::${itemId}`;
}

export async function markAgendaItemDone(input: {
  itemId: string;
  dateKey: string;
  markedAt?: string;
}): Promise<AgendaDoneMark> {
  await ensureTable();
  const db = await getHealthcareDb();
  const markedAt = input.markedAt ?? new Date().toISOString();
  const id = rowId(input.itemId, input.dateKey);
  const row: AgendaDoneMark = {
    id,
    itemId: input.itemId,
    dateKey: input.dateKey,
    markedAt,
  };
  await db.runAsync(
    `INSERT OR REPLACE INTO AgendaDoneMarks (id, itemId, dateKey, markedAt)
     VALUES (?, ?, ?, ?)`,
    [row.id, row.itemId, row.dateKey, row.markedAt],
  );
  return row;
}

export async function clearAgendaItemDone(
  itemId: string,
  dateKey: string,
): Promise<void> {
  await ensureTable();
  const db = await getHealthcareDb();
  await db.runAsync(`DELETE FROM AgendaDoneMarks WHERE id = ?`, [
    rowId(itemId, dateKey),
  ]);
}

export async function listAgendaItemsDone(dateKey: string): Promise<string[]> {
  await ensureTable();
  const db = await getHealthcareDb();
  const rows = await db.getAllAsync<{ itemId: string }>(
    `SELECT itemId FROM AgendaDoneMarks WHERE dateKey = ?`,
    [dateKey],
  );
  return rows.map((r) => r.itemId);
}

export async function setAgendaItemDone(input: {
  itemId: string;
  dateKey: string;
  done: boolean;
}): Promise<void> {
  if (input.done) {
    await markAgendaItemDone(input);
  } else {
    await clearAgendaItemDone(input.itemId, input.dateKey);
  }
}
