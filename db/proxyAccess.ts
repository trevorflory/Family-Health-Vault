import type { AccessLogEntry, ProxyGrant } from '../types/proxyAccess';
import { createProxyAccessMemoryStore } from './proxyAccessMemory';

/** Jest / Node unit tests: avoid expo-sqlite. Native app: SQLite. */
const useMemory =
  typeof process !== 'undefined' && process.env.JEST_WORKER_ID != null;

const memory = createProxyAccessMemoryStore();

const PROXY_DDL = `
CREATE TABLE IF NOT EXISTS ProxyGrants (
  grantId TEXT PRIMARY KEY NOT NULL,
  patientId TEXT NOT NULL,
  granteeId TEXT NOT NULL,
  granteeDisplayName TEXT NOT NULL,
  role TEXT NOT NULL,
  permissionsJson TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','REVOKED','AGED_OUT','EXPIRED')),
  expiresAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_proxy_grants_patient ON ProxyGrants(patientId);

CREATE TABLE IF NOT EXISTS ProxyAccessLog (
  logId TEXT PRIMARY KEY NOT NULL,
  grantId TEXT NOT NULL,
  patientId TEXT NOT NULL,
  actorId TEXT NOT NULL,
  actorDisplayName TEXT NOT NULL,
  action TEXT NOT NULL,
  permitted INTEGER NOT NULL,
  detail TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proxy_log_patient ON ProxyAccessLog(patientId);
`;

interface GrantRow {
  grantId: string;
  patientId: string;
  granteeId: string;
  granteeDisplayName: string;
  role: ProxyGrant['role'];
  permissionsJson: string;
  status: ProxyGrant['status'];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes: string | null;
}

interface LogRow {
  logId: string;
  grantId: string;
  patientId: string;
  actorId: string;
  actorDisplayName: string;
  action: string;
  permitted: number;
  detail: string | null;
  at: string;
}

async function getDb() {
  const { getHealthcareDb } = await import('./client');
  return getHealthcareDb();
}

async function ensureTables(): Promise<void> {
  const db = await getDb();
  await db.execAsync(PROXY_DDL);
}

function rowToGrant(row: GrantRow): ProxyGrant {
  return {
    grantId: row.grantId,
    patientId: row.patientId,
    granteeId: row.granteeId,
    granteeDisplayName: row.granteeDisplayName,
    role: row.role,
    permissions: JSON.parse(row.permissionsJson) as ProxyGrant['permissions'],
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    notes: row.notes ?? undefined,
  };
}

function rowToLog(row: LogRow): AccessLogEntry {
  return {
    logId: row.logId,
    grantId: row.grantId,
    patientId: row.patientId,
    actorId: row.actorId,
    actorDisplayName: row.actorDisplayName,
    action: row.action,
    permitted: row.permitted === 1,
    detail: row.detail ?? undefined,
    at: row.at,
  };
}

export async function saveProxyGrant(grant: ProxyGrant): Promise<ProxyGrant> {
  if (useMemory) return memory.saveProxyGrant(grant);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ProxyGrants
      (grantId, patientId, granteeId, granteeDisplayName, role, permissionsJson,
       status, expiresAt, createdAt, updatedAt, createdBy, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      grant.grantId,
      grant.patientId,
      grant.granteeId,
      grant.granteeDisplayName,
      grant.role,
      JSON.stringify(grant.permissions),
      grant.status,
      grant.expiresAt ?? null,
      grant.createdAt,
      grant.updatedAt,
      grant.createdBy,
      grant.notes ?? null,
    ],
  );
  return grant;
}

export async function getProxyGrantById(
  grantId: string,
): Promise<ProxyGrant | null> {
  if (useMemory) return memory.getProxyGrantById(grantId);
  await ensureTables();
  const db = await getDb();
  const row = await db.getFirstAsync<GrantRow>(
    `SELECT * FROM ProxyGrants WHERE grantId = ?`,
    [grantId],
  );
  return row ? rowToGrant(row) : null;
}

export async function listProxyGrantsForPatient(
  patientId?: string,
): Promise<ProxyGrant[]> {
  if (useMemory) return memory.listProxyGrantsForPatient(patientId);
  await ensureTables();
  const db = await getDb();
  const rows = patientId
    ? await db.getAllAsync<GrantRow>(
        `SELECT * FROM ProxyGrants WHERE patientId = ? ORDER BY updatedAt DESC`,
        [patientId],
      )
    : await db.getAllAsync<GrantRow>(
        `SELECT * FROM ProxyGrants ORDER BY updatedAt DESC`,
      );
  return rows.map(rowToGrant);
}

export async function replaceAllProxyGrants(
  next: ProxyGrant[],
): Promise<void> {
  if (useMemory) {
    await memory.replaceAllProxyGrants(next);
    return;
  }
  await ensureTables();
  const db = await getDb();
  await db.execAsync('DELETE FROM ProxyGrants;');
  for (const grant of next) {
    await saveProxyGrant(grant);
  }
}

export async function insertAccessLogEntry(
  entry: AccessLogEntry,
): Promise<AccessLogEntry> {
  if (useMemory) return memory.insertAccessLogEntry(entry);
  await ensureTables();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO ProxyAccessLog
      (logId, grantId, patientId, actorId, actorDisplayName, action, permitted, detail, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.logId,
      entry.grantId,
      entry.patientId,
      entry.actorId,
      entry.actorDisplayName,
      entry.action,
      entry.permitted ? 1 : 0,
      entry.detail ?? null,
      entry.at,
    ],
  );
  return entry;
}

export async function listAccessLogForPatient(
  patientId?: string,
): Promise<AccessLogEntry[]> {
  if (useMemory) return memory.listAccessLogForPatient(patientId);
  await ensureTables();
  const db = await getDb();
  const rows = patientId
    ? await db.getAllAsync<LogRow>(
        `SELECT * FROM ProxyAccessLog WHERE patientId = ? ORDER BY at DESC`,
        [patientId],
      )
    : await db.getAllAsync<LogRow>(
        `SELECT * FROM ProxyAccessLog ORDER BY at DESC`,
      );
  return rows.map(rowToLog);
}

export async function clearAccessLog(): Promise<void> {
  if (useMemory) {
    await memory.clearAccessLog();
    return;
  }
  await ensureTables();
  const db = await getDb();
  await db.execAsync('DELETE FROM ProxyAccessLog;');
}

export function __resetProxyAccessDbForTests(): void {
  memory.__resetProxyAccessDbForTests();
}
