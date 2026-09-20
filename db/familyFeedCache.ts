/**
 * Offline cache of family feed timeline (ciphertext optional).
 */

export interface FamilyFeedCacheEntry {
  residentId: string;
  cachedAtISO: string;
  timeline: Array<{
    id: string;
    event_type: string;
    summary_non_phi: string;
    occurred_at: string;
  }>;
  plan: 'FREE_FEED' | 'WALLET_PRO';
}

const cache = new Map<string, FamilyFeedCacheEntry>();

export function saveFamilyFeedCache(entry: FamilyFeedCacheEntry): void {
  cache.set(entry.residentId, entry);
}

export function getFamilyFeedCache(
  residentId: string,
): FamilyFeedCacheEntry | null {
  return cache.get(residentId) ?? null;
}

export function clearFamilyFeedCache(): void {
  cache.clear();
}
