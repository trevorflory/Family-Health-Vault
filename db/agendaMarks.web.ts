/**
 * Non-med Today checklist done marks.
 * Web: sessionStorage; Native: SQLite (see agendaMarks.ts).
 */

import {
  loadSessionMap,
  persistSessionMap,
} from './webSessionMap';

export interface AgendaDoneMark {
  id: string;
  itemId: string;
  dateKey: string;
  markedAt: string;
}

const STORAGE_KEY = 'healthcare.web.agendaMarks.v1';
const memoryStore = loadSessionMap<AgendaDoneMark>(STORAGE_KEY);

function persist(): void {
  persistSessionMap(STORAGE_KEY, memoryStore);
}

function rowId(itemId: string, dateKey: string): string {
  return `${dateKey}::${itemId}`;
}

export async function markAgendaItemDone(input: {
  itemId: string;
  dateKey: string;
  markedAt?: string;
}): Promise<AgendaDoneMark> {
  const markedAt = input.markedAt ?? new Date().toISOString();
  const id = rowId(input.itemId, input.dateKey);
  const row: AgendaDoneMark = {
    id,
    itemId: input.itemId,
    dateKey: input.dateKey,
    markedAt,
  };
  memoryStore.set(id, row);
  persist();
  return row;
}

export async function clearAgendaItemDone(
  itemId: string,
  dateKey: string,
): Promise<void> {
  memoryStore.delete(rowId(itemId, dateKey));
  persist();
}

export async function listAgendaItemsDone(dateKey: string): Promise<string[]> {
  return [...memoryStore.values()]
    .filter((r) => r.dateKey === dateKey)
    .map((r) => r.itemId);
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
