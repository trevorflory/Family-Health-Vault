import type {
  CareImpactEvent,
  CareObservation,
  DelegateAccessLogEntry,
  DelegateGrant,
  ShiftHandoverLog,
} from '../types/careObservation';

/**
 * In-memory care observations / handovers / delegate grants / impact ledger.
 * Jest + web session backing store.
 */
export function createCareObservationsMemoryStore() {
  const observations = new Map<string, CareObservation>();
  const handovers = new Map<string, ShiftHandoverLog>();
  const grants = new Map<string, DelegateGrant>();
  const accessLog = new Map<string, DelegateAccessLogEntry>();
  const impact = new Map<string, CareImpactEvent>();

  return {
    async saveObservation(row: CareObservation): Promise<CareObservation> {
      observations.set(row.id, { ...row });
      return { ...row };
    },

    async saveObservations(rows: CareObservation[]): Promise<void> {
      for (const row of rows) observations.set(row.id, { ...row });
    },

    async listObservationsForPatient(
      patientId: string,
    ): Promise<CareObservation[]> {
      return [...observations.values()]
        .filter((o) => o.patientId === patientId)
        .map((o) => ({ ...o }))
        .sort((a, b) => b.createdAt - a.createdAt);
    },

    async getObservationById(id: string): Promise<CareObservation | null> {
      const row = observations.get(id);
      return row ? { ...row } : null;
    },

    async saveHandover(row: ShiftHandoverLog): Promise<ShiftHandoverLog> {
      handovers.set(row.id, { ...row });
      return { ...row };
    },

    async listHandoversForPatient(
      patientId: string,
    ): Promise<ShiftHandoverLog[]> {
      return [...handovers.values()]
        .filter((h) => h.patientId === patientId)
        .map((h) => ({ ...h }))
        .sort((a, b) => b.createdAt - a.createdAt);
    },

    async listHandoversSince(
      patientId: string,
      sinceMs: number,
    ): Promise<ShiftHandoverLog[]> {
      return [...handovers.values()]
        .filter(
          (h) =>
            h.patientId === patientId &&
            new Date(h.shiftEndedAtISO).getTime() >= sinceMs,
        )
        .map((h) => ({ ...h }))
        .sort(
          (a, b) =>
            new Date(b.shiftEndedAtISO).getTime() -
            new Date(a.shiftEndedAtISO).getTime(),
        );
    },

    async getHandoverById(id: string): Promise<ShiftHandoverLog | null> {
      const row = handovers.get(id);
      return row ? { ...row } : null;
    },

    async saveDelegateGrant(grant: DelegateGrant): Promise<DelegateGrant> {
      grants.set(grant.tokenId, { ...grant });
      return { ...grant };
    },

    async getDelegateGrant(tokenId: string): Promise<DelegateGrant | null> {
      const row = grants.get(tokenId);
      return row ? { ...row } : null;
    },

    async listDelegateGrantsForPatient(
      patientId: string,
    ): Promise<DelegateGrant[]> {
      return [...grants.values()]
        .filter((g) => g.patientId === patientId)
        .map((g) => ({ ...g }))
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
    },

    async insertDelegateAccessLog(
      entry: DelegateAccessLogEntry,
    ): Promise<DelegateAccessLogEntry> {
      if (accessLog.has(entry.logId)) {
        return { ...accessLog.get(entry.logId)! };
      }
      accessLog.set(entry.logId, { ...entry });
      return { ...entry };
    },

    async listDelegateAccessLog(
      patientId?: string,
    ): Promise<DelegateAccessLogEntry[]> {
      return [...accessLog.values()]
        .filter((e) => (patientId ? e.patientId === patientId : true))
        .map((e) => ({ ...e }))
        .sort((a, b) => b.atISO.localeCompare(a.atISO));
    },

    async saveImpactEvent(event: CareImpactEvent): Promise<CareImpactEvent> {
      impact.set(event.id, { ...event });
      return { ...event };
    },

    async listImpactEvents(filter?: {
      caregiverId?: string;
      patientId?: string;
      year?: number;
    }): Promise<CareImpactEvent[]> {
      return [...impact.values()]
        .filter((e) => {
          if (filter?.caregiverId && e.caregiverId !== filter.caregiverId) {
            return false;
          }
          if (filter?.patientId && e.patientId !== filter.patientId) {
            return false;
          }
          if (filter?.year != null) {
            const y = new Date(e.atISO).getFullYear();
            if (y !== filter.year) return false;
          }
          return true;
        })
        .map((e) => ({ ...e }))
        .sort((a, b) => b.atISO.localeCompare(a.atISO));
    },

    __resetCareObservationsDbForTests(): void {
      observations.clear();
      handovers.clear();
      grants.clear();
      accessLog.clear();
      impact.clear();
    },
  };
}

export type CareObservationsStore = ReturnType<
  typeof createCareObservationsMemoryStore
>;
