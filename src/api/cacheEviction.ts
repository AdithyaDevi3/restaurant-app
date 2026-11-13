import { selectCacheKeysToEvict } from '../algorithm/CacheEviction';

export const DISCOVERY_CACHE_MAX_ENTRIES = 250;
export const MENU_CACHE_MAX_ENTRIES = 100;

interface CacheStorage {
  getAllKeys(): string[];
  getString(key: string): string | undefined;
  remove(key: string): void;
}

function entryTimestamp(raw: string | undefined): number {
  if (!raw) return 0;

  try {
    const timestamp = (JSON.parse(raw) as { timestamp?: unknown }).timestamp;
    return typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : 0;
  } catch {
    return 0;
  }
}

export function enforceCacheEntryLimit(
  storage: CacheStorage,
  keyPrefixes: string[],
  maxEntries: number,
): void {
  const entries = storage
    .getAllKeys()
    .filter((key) => keyPrefixes.some((prefix) => key.startsWith(prefix)))
    .map((key) => ({ key, timestamp: entryTimestamp(storage.getString(key)) }));

  selectCacheKeysToEvict(entries, maxEntries).forEach((key) => storage.remove(key));
}
