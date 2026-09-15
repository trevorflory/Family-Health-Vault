/**
 * Web demo persistence for proxy grants + append-only access log.
 */
import type { AccessLogEntry, ProxyGrant } from '../types/proxyAccess';
import { createProxyAccessMemoryStore } from './proxyAccessMemory';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

const GRANTS_KEY = 'healthcare.web.proxyGrants.v1';
const LOG_KEY = 'healthcare.web.proxyAccessLog.v1';

const memory = createProxyAccessMemoryStore();

async function hydrateFromSession(): Promise<void> {
  const grantMap = loadSessionMap<ProxyGrant>(GRANTS_KEY);
  const logMap = loadSessionMap<AccessLogEntry>(LOG_KEY);
  memory.__resetProxyAccessDbForTests();
  await memory.replaceAllProxyGrants([...grantMap.values()]);
  for (const entry of logMap.values()) {
    await memory.insertAccessLogEntry(entry);
  }
}

void hydrateFromSession();

async function persistAll(): Promise<void> {
  const grants = await memory.listProxyGrantsForPatient();
  const logs = await memory.listAccessLogForPatient();
  persistSessionMap(
    GRANTS_KEY,
    new Map(grants.map((g) => [g.grantId, g])),
  );
  persistSessionMap(LOG_KEY, new Map(logs.map((e) => [e.logId, e])));
}

export async function saveProxyGrant(grant: ProxyGrant): Promise<ProxyGrant> {
  const saved = await memory.saveProxyGrant(grant);
  await persistAll();
  return saved;
}

export async function getProxyGrantById(
  grantId: string,
): Promise<ProxyGrant | null> {
  return memory.getProxyGrantById(grantId);
}

export async function listProxyGrantsForPatient(
  patientId?: string,
): Promise<ProxyGrant[]> {
  return memory.listProxyGrantsForPatient(patientId);
}

export async function replaceAllProxyGrants(
  next: ProxyGrant[],
): Promise<void> {
  await memory.replaceAllProxyGrants(next);
  await persistAll();
}

export async function insertAccessLogEntry(
  entry: AccessLogEntry,
): Promise<AccessLogEntry> {
  const saved = await memory.insertAccessLogEntry(entry);
  await persistAll();
  return saved;
}

export async function listAccessLogForPatient(
  patientId?: string,
): Promise<AccessLogEntry[]> {
  return memory.listAccessLogForPatient(patientId);
}

export async function clearAccessLog(): Promise<void> {
  await memory.clearAccessLog();
  clearSessionMap(LOG_KEY);
}

export function __resetProxyAccessDbForTests(): void {
  memory.__resetProxyAccessDbForTests();
  clearSessionMap(GRANTS_KEY);
  clearSessionMap(LOG_KEY);
}
