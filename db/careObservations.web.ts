/**
 * Web demo persistence for care observations / handovers / delegates / impact.
 */
import type {
  CareImpactEvent,
  CareObservation,
  DelegateAccessLogEntry,
  DelegateGrant,
  ShiftHandoverLog,
} from '../types/careObservation';
import { createCareObservationsMemoryStore } from './careObservationsMemory';
import {
  clearSessionMap,
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

const OBS_KEY = 'healthcare.web.careObservations.v1';
const HAND_KEY = 'healthcare.web.shiftHandovers.v1';
const GRANT_KEY = 'healthcare.web.delegateGrants.v1';
const LOG_KEY = 'healthcare.web.delegateAccessLog.v1';
const IMPACT_KEY = 'healthcare.web.careImpact.v1';

const memory = createCareObservationsMemoryStore();

async function hydrate(): Promise<void> {
  memory.__resetCareObservationsDbForTests();
  const obs = loadSessionMap<CareObservation>(OBS_KEY);
  const hands = loadSessionMap<ShiftHandoverLog>(HAND_KEY);
  const grants = loadSessionMap<DelegateGrant>(GRANT_KEY);
  const logs = loadSessionMap<DelegateAccessLogEntry>(LOG_KEY);
  const impact = loadSessionMap<CareImpactEvent>(IMPACT_KEY);
  await memory.saveObservations([...obs.values()]);
  for (const h of hands.values()) await memory.saveHandover(h);
  for (const g of grants.values()) await memory.saveDelegateGrant(g);
  for (const e of logs.values()) await memory.insertDelegateAccessLog(e);
  for (const i of impact.values()) await memory.saveImpactEvent(i);
}

void hydrate();

async function persistAll(): Promise<void> {
  // Re-read via patient-agnostic dumps from maps by listing known keys is awkward;
  // persist by reloading session after each mutation using memory internals via list APIs.
  const allGrants: DelegateGrant[] = [];
  const allLogs = await memory.listDelegateAccessLog();
  const allImpact = await memory.listImpactEvents();
  // Collect by scanning grants then patient-scoped lists is incomplete; store last-write maps.
  persistSessionMap(LOG_KEY, new Map(allLogs.map((e) => [e.logId, e])));
  persistSessionMap(IMPACT_KEY, new Map(allImpact.map((e) => [e.id, e])));
  // Grants: list needs patient — keep grant map by re-fetching from memory through save path
  void allGrants;
}

/** Persist full snapshots after mutations that know patientId. */
async function persistPatientSlice(patientId: string): Promise<void> {
  const obs = await memory.listObservationsForPatient(patientId);
  const hands = await memory.listHandoversForPatient(patientId);
  const grants = await memory.listDelegateGrantsForPatient(patientId);

  const obsMap = loadSessionMap<CareObservation>(OBS_KEY);
  for (const o of obs) obsMap.set(o.id, o);
  persistSessionMap(OBS_KEY, obsMap);

  const handMap = loadSessionMap<ShiftHandoverLog>(HAND_KEY);
  for (const h of hands) handMap.set(h.id, h);
  persistSessionMap(HAND_KEY, handMap);

  const grantMap = loadSessionMap<DelegateGrant>(GRANT_KEY);
  for (const g of grants) grantMap.set(g.tokenId, g);
  persistSessionMap(GRANT_KEY, grantMap);

  const logs = await memory.listDelegateAccessLog(patientId);
  const logMap = loadSessionMap<DelegateAccessLogEntry>(LOG_KEY);
  for (const e of logs) logMap.set(e.logId, e);
  persistSessionMap(LOG_KEY, logMap);

  const impact = await memory.listImpactEvents({ patientId });
  const impactMap = loadSessionMap<CareImpactEvent>(IMPACT_KEY);
  for (const i of impact) impactMap.set(i.id, i);
  // Also merge caregiver-only events
  const allImpact = await memory.listImpactEvents();
  for (const i of allImpact) impactMap.set(i.id, i);
  persistSessionMap(IMPACT_KEY, impactMap);
}

export async function saveObservation(
  row: CareObservation,
): Promise<CareObservation> {
  const saved = await memory.saveObservation(row);
  await persistPatientSlice(row.patientId);
  return saved;
}

export async function saveObservations(rows: CareObservation[]): Promise<void> {
  await memory.saveObservations(rows);
  const patientIds = [...new Set(rows.map((r) => r.patientId))];
  for (const id of patientIds) await persistPatientSlice(id);
}

export async function listObservationsForPatient(
  patientId: string,
): Promise<CareObservation[]> {
  return memory.listObservationsForPatient(patientId);
}

export async function saveHandover(
  row: ShiftHandoverLog,
): Promise<ShiftHandoverLog> {
  const saved = await memory.saveHandover(row);
  await persistPatientSlice(row.patientId);
  return saved;
}

export async function listHandoversForPatient(
  patientId: string,
): Promise<ShiftHandoverLog[]> {
  return memory.listHandoversForPatient(patientId);
}

export async function listHandoversSince(
  patientId: string,
  sinceMs: number,
): Promise<ShiftHandoverLog[]> {
  return memory.listHandoversSince(patientId, sinceMs);
}

export async function getHandoverById(
  id: string,
): Promise<ShiftHandoverLog | null> {
  return memory.getHandoverById(id);
}

export async function saveDelegateGrant(
  grant: DelegateGrant,
): Promise<DelegateGrant> {
  const saved = await memory.saveDelegateGrant(grant);
  await persistPatientSlice(grant.patientId);
  return saved;
}

export async function getDelegateGrant(
  tokenId: string,
): Promise<DelegateGrant | null> {
  return memory.getDelegateGrant(tokenId);
}

export async function listDelegateGrantsForPatient(
  patientId: string,
): Promise<DelegateGrant[]> {
  return memory.listDelegateGrantsForPatient(patientId);
}

export async function insertDelegateAccessLog(
  entry: DelegateAccessLogEntry,
): Promise<DelegateAccessLogEntry> {
  const saved = await memory.insertDelegateAccessLog(entry);
  await persistPatientSlice(entry.patientId);
  return saved;
}

export async function listDelegateAccessLog(
  patientId?: string,
): Promise<DelegateAccessLogEntry[]> {
  return memory.listDelegateAccessLog(patientId);
}

export async function saveImpactEvent(
  event: CareImpactEvent,
): Promise<CareImpactEvent> {
  const saved = await memory.saveImpactEvent(event);
  if (event.patientId) await persistPatientSlice(event.patientId);
  else await persistAll();
  const impact = await memory.listImpactEvents();
  persistSessionMap(IMPACT_KEY, new Map(impact.map((e) => [e.id, e])));
  return saved;
}

export async function listImpactEvents(filter?: {
  caregiverId?: string;
  patientId?: string;
  year?: number;
}): Promise<CareImpactEvent[]> {
  return memory.listImpactEvents(filter);
}

export function __resetCareObservationsDbForTests(): void {
  memory.__resetCareObservationsDbForTests();
  clearSessionMap(OBS_KEY);
  clearSessionMap(HAND_KEY);
  clearSessionMap(GRANT_KEY);
  clearSessionMap(LOG_KEY);
  clearSessionMap(IMPACT_KEY);
}
