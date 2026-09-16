import type {
  CareImpactEvent,
  CareObservation,
  DelegateAccessLogEntry,
  DelegateGrant,
  ShiftHandoverLog,
} from '../types/careObservation';
import { createCareObservationsMemoryStore } from './careObservationsMemory';

const useMemory =
  typeof process !== 'undefined' && process.env.JEST_WORKER_ID != null;

const memory = createCareObservationsMemoryStore();

const CARE_DDL = `
CREATE TABLE IF NOT EXISTS CareObservations (
  id TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  performerId TEXT NOT NULL,
  effectiveDateTimeISO TEXT NOT NULL,
  category TEXT NOT NULL,
  loincCode TEXT,
  display TEXT NOT NULL,
  numericValue REAL,
  unit TEXT,
  textValue TEXT,
  source TEXT NOT NULL,
  sourceEventId TEXT,
  handoverId TEXT,
  status TEXT NOT NULL,
  jurisdiction TEXT,
  dataResidency TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  payloadJson TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_care_obs_patient ON CareObservations(patientId);

CREATE TABLE IF NOT EXISTS ShiftHandoverLogs (
  id TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  payloadJson TEXT NOT NULL,
  shiftEndedAtISO TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_handover_patient ON ShiftHandoverLogs(patientId);

CREATE TABLE IF NOT EXISTS DelegateGrants (
  tokenId TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  payloadJson TEXT NOT NULL,
  expiresAtISO TEXT NOT NULL,
  isActive INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_delegate_patient ON DelegateGrants(patientId);

CREATE TABLE IF NOT EXISTS DelegateAccessLog (
  logId TEXT PRIMARY KEY NOT NULL,
  tokenId TEXT NOT NULL,
  patientId TEXT NOT NULL,
  action TEXT NOT NULL,
  permitted INTEGER NOT NULL,
  detail TEXT,
  atISO TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS CareImpactEvents (
  id TEXT PRIMARY KEY NOT NULL,
  caregiverId TEXT,
  patientId TEXT,
  type TEXT NOT NULL,
  atISO TEXT NOT NULL,
  label TEXT NOT NULL
);
`;

async function getDb() {
  const { getHealthcareDb } = await import('./client');
  return getHealthcareDb();
}

async function ensureTables(): Promise<void> {
  const db = await getDb();
  await db.execAsync(CARE_DDL);
}

export async function saveObservation(
  row: CareObservation,
): Promise<CareObservation> {
  if (useMemory) return memory.saveObservation(row);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO CareObservations (
      id, patientId, performerId, effectiveDateTimeISO, category, loincCode,
      display, numericValue, unit, textValue, source, sourceEventId, handoverId,
      status, jurisdiction, dataResidency, createdAt, payloadJson
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.patientId,
      row.performerId,
      row.effectiveDateTimeISO,
      row.category,
      row.loincCode ?? null,
      row.display,
      row.numericValue ?? null,
      row.unit ?? null,
      row.textValue ?? null,
      row.source,
      row.sourceEventId ?? null,
      row.handoverId ?? null,
      row.status,
      row.jurisdiction ?? null,
      row.dataResidency,
      row.createdAt,
      JSON.stringify(row),
    ],
  );
  return row;
}

export async function saveObservations(rows: CareObservation[]): Promise<void> {
  if (useMemory) {
    await memory.saveObservations(rows);
    return;
  }
  for (const row of rows) await saveObservation(row);
}

export async function listObservationsForPatient(
  patientId: string,
): Promise<CareObservation[]> {
  if (useMemory) return memory.listObservationsForPatient(patientId);
  await ensureTables();
  const db = await getDb();
  const rows = await db.getAllAsync<{ payloadJson: string }>(
    `SELECT payloadJson FROM CareObservations WHERE patientId = ? ORDER BY createdAt DESC`,
    [patientId],
  );
  return rows.map((r) => JSON.parse(r.payloadJson) as CareObservation);
}

export async function saveHandover(
  row: ShiftHandoverLog,
): Promise<ShiftHandoverLog> {
  if (useMemory) return memory.saveHandover(row);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ShiftHandoverLogs (id, patientId, payloadJson, shiftEndedAtISO, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [row.id, row.patientId, JSON.stringify(row), row.shiftEndedAtISO, row.createdAt],
  );
  return row;
}

export async function listHandoversForPatient(
  patientId: string,
): Promise<ShiftHandoverLog[]> {
  if (useMemory) return memory.listHandoversForPatient(patientId);
  await ensureTables();
  const db = await getDb();
  const rows = await db.getAllAsync<{ payloadJson: string }>(
    `SELECT payloadJson FROM ShiftHandoverLogs WHERE patientId = ? ORDER BY createdAt DESC`,
    [patientId],
  );
  return rows.map((r) => JSON.parse(r.payloadJson) as ShiftHandoverLog);
}

export async function listHandoversSince(
  patientId: string,
  sinceMs: number,
): Promise<ShiftHandoverLog[]> {
  if (useMemory) return memory.listHandoversSince(patientId, sinceMs);
  const all = await listHandoversForPatient(patientId);
  return all
    .filter((h) => new Date(h.shiftEndedAtISO).getTime() >= sinceMs)
    .sort(
      (a, b) =>
        new Date(b.shiftEndedAtISO).getTime() -
        new Date(a.shiftEndedAtISO).getTime(),
    );
}

export async function getHandoverById(
  id: string,
): Promise<ShiftHandoverLog | null> {
  if (useMemory) return memory.getHandoverById(id);
  await ensureTables();
  const db = await getDb();
  const row = await db.getFirstAsync<{ payloadJson: string }>(
    `SELECT payloadJson FROM ShiftHandoverLogs WHERE id = ?`,
    [id],
  );
  return row ? (JSON.parse(row.payloadJson) as ShiftHandoverLog) : null;
}

export async function saveDelegateGrant(
  grant: DelegateGrant,
): Promise<DelegateGrant> {
  if (useMemory) return memory.saveDelegateGrant(grant);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO DelegateGrants (tokenId, patientId, payloadJson, expiresAtISO, isActive)
     VALUES (?, ?, ?, ?, ?)`,
    [
      grant.tokenId,
      grant.patientId,
      JSON.stringify(grant),
      grant.expiresAtISO,
      grant.isActive ? 1 : 0,
    ],
  );
  return grant;
}

export async function getDelegateGrant(
  tokenId: string,
): Promise<DelegateGrant | null> {
  if (useMemory) return memory.getDelegateGrant(tokenId);
  await ensureTables();
  const db = await getDb();
  const row = await db.getFirstAsync<{ payloadJson: string }>(
    `SELECT payloadJson FROM DelegateGrants WHERE tokenId = ?`,
    [tokenId],
  );
  return row ? (JSON.parse(row.payloadJson) as DelegateGrant) : null;
}

export async function listDelegateGrantsForPatient(
  patientId: string,
): Promise<DelegateGrant[]> {
  if (useMemory) return memory.listDelegateGrantsForPatient(patientId);
  await ensureTables();
  const db = await getDb();
  const rows = await db.getAllAsync<{ payloadJson: string }>(
    `SELECT payloadJson FROM DelegateGrants WHERE patientId = ?`,
    [patientId],
  );
  return rows.map((r) => JSON.parse(r.payloadJson) as DelegateGrant);
}

export async function insertDelegateAccessLog(
  entry: DelegateAccessLogEntry,
): Promise<DelegateAccessLogEntry> {
  if (useMemory) return memory.insertDelegateAccessLog(entry);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO DelegateAccessLog (logId, tokenId, patientId, action, permitted, detail, atISO)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.logId,
      entry.tokenId,
      entry.patientId,
      entry.action,
      entry.permitted ? 1 : 0,
      entry.detail ?? null,
      entry.atISO,
    ],
  );
  return entry;
}

export async function listDelegateAccessLog(
  patientId?: string,
): Promise<DelegateAccessLogEntry[]> {
  if (useMemory) return memory.listDelegateAccessLog(patientId);
  await ensureTables();
  const db = await getDb();
  if (patientId) {
    const rows = await db.getAllAsync<DelegateAccessLogEntry>(
      `SELECT logId, tokenId, patientId, action, permitted, detail, atISO
       FROM DelegateAccessLog WHERE patientId = ? ORDER BY atISO DESC`,
      [patientId],
    );
    return rows.map((r) => ({
      ...r,
      permitted: Boolean((r as unknown as { permitted: number }).permitted),
    }));
  }
  const rows = await db.getAllAsync<DelegateAccessLogEntry>(
    `SELECT logId, tokenId, patientId, action, permitted, detail, atISO
     FROM DelegateAccessLog ORDER BY atISO DESC`,
  );
  return rows.map((r) => ({
    ...r,
    permitted: Boolean((r as unknown as { permitted: number }).permitted),
  }));
}

export async function saveImpactEvent(
  event: CareImpactEvent,
): Promise<CareImpactEvent> {
  if (useMemory) return memory.saveImpactEvent(event);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO CareImpactEvents (id, caregiverId, patientId, type, atISO, label)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.caregiverId ?? null,
      event.patientId ?? null,
      event.type,
      event.atISO,
      event.label,
    ],
  );
  return event;
}

export async function listImpactEvents(filter?: {
  caregiverId?: string;
  patientId?: string;
  year?: number;
}): Promise<CareImpactEvent[]> {
  if (useMemory) return memory.listImpactEvents(filter);
  await ensureTables();
  const db = await getDb();
  const rows = await db.getAllAsync<CareImpactEvent>(
    `SELECT id, caregiverId, patientId, type, atISO, label FROM CareImpactEvents ORDER BY atISO DESC`,
  );
  return rows.filter((e) => {
    if (filter?.caregiverId && e.caregiverId !== filter.caregiverId) return false;
    if (filter?.patientId && e.patientId !== filter.patientId) return false;
    if (filter?.year != null && new Date(e.atISO).getFullYear() !== filter.year) {
      return false;
    }
    return true;
  });
}

export function __resetCareObservationsDbForTests(): void {
  memory.__resetCareObservationsDbForTests();
}
