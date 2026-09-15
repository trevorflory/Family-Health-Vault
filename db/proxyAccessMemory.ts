import type { AccessLogEntry, ProxyGrant } from '../types/proxyAccess';

/**
 * Pure in-memory proxy grant + append-only access log store.
 * Used by Jest mocks and as the backing model for web/session adapters.
 */
export function createProxyAccessMemoryStore() {
  const grants = new Map<string, ProxyGrant>();
  const logs = new Map<string, AccessLogEntry>();

  return {
    async saveProxyGrant(grant: ProxyGrant): Promise<ProxyGrant> {
      grants.set(grant.grantId, { ...grant });
      return { ...grant };
    },

    async getProxyGrantById(grantId: string): Promise<ProxyGrant | null> {
      const row = grants.get(grantId);
      return row ? { ...row } : null;
    },

    async listProxyGrantsForPatient(
      patientId?: string,
    ): Promise<ProxyGrant[]> {
      const rows = [...grants.values()].filter((g) =>
        patientId ? g.patientId === patientId : true,
      );
      return rows
        .map((g) => ({ ...g }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async replaceAllProxyGrants(next: ProxyGrant[]): Promise<void> {
      grants.clear();
      for (const g of next) grants.set(g.grantId, { ...g });
    },

    async insertAccessLogEntry(entry: AccessLogEntry): Promise<AccessLogEntry> {
      if (logs.has(entry.logId)) {
        // Append-only: never overwrite an existing log row.
        return { ...logs.get(entry.logId)! };
      }
      logs.set(entry.logId, { ...entry });
      return { ...entry };
    },

    async listAccessLogForPatient(
      patientId?: string,
    ): Promise<AccessLogEntry[]> {
      const rows = [...logs.values()].filter((e) =>
        patientId ? e.patientId === patientId : true,
      );
      return rows
        .map((e) => ({ ...e }))
        .sort((a, b) => b.at.localeCompare(a.at));
    },

    async clearAccessLog(): Promise<void> {
      logs.clear();
    },

    __resetProxyAccessDbForTests(): void {
      grants.clear();
      logs.clear();
    },
  };
}

export type ProxyAccessStore = ReturnType<typeof createProxyAccessMemoryStore>;
