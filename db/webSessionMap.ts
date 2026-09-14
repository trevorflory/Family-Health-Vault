/**
 * Tiny sessionStorage-backed Map helpers for Expo web DB stubs.
 * In-memory-only Maps are wiped when Metro/Expo Router does a full document
 * reload between routes (common on web demo navigations).
 */

function canUseSessionStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.sessionStorage !== 'undefined'
  );
}

export function loadSessionMap<T>(key: string): Map<string, T> {
  const map = new Map<string, T>();
  if (!canUseSessionStorage()) return map;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return map;
    const entries = JSON.parse(raw) as Array<[string, T]>;
    for (const [id, value] of entries) {
      map.set(id, value);
    }
  } catch {
    // Corrupt or unavailable storage — start empty.
  }
  return map;
}

export function persistSessionMap<T>(key: string, map: Map<string, T>): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify([...map.entries()]));
  } catch {
    // Quota / private mode — keep in-memory only for this document.
  }
}

export function clearSessionMap(key: string): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
