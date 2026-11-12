import { createMMKV } from 'react-native-mmkv';
import { RestaurantMenu } from '../types';
import { enforceCacheEntryLimit, MENU_CACHE_MAX_ENTRIES } from './cacheEviction';

const storage = createMMKV({ id: 'candidate-menu-cache' });
const SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 24 * 60 * 60 * 1000;

interface CandidateMenuCacheEntry {
  parserVersion: number;
  sourceUrl: string;
  menu: RestaurantMenu | null;
  timestamp: number;
}

export type CandidateMenuCacheResult =
  | { status: 'miss' }
  | { status: 'hit'; menu: RestaurantMenu | null };

export function getCachedCandidateMenu(
  restaurantId: string,
  sourceUrl: string,
): CandidateMenuCacheResult {
  const raw = storage.getString(`candidate-menu:${restaurantId}`);
  if (!raw) return { status: 'miss' };

  try {
    const entry = JSON.parse(raw) as CandidateMenuCacheEntry;
    const ttl = entry.menu ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
    if (entry.parserVersion !== 2 || entry.sourceUrl !== sourceUrl || Date.now() - entry.timestamp > ttl) {
      storage.remove(`candidate-menu:${restaurantId}`);
      return { status: 'miss' };
    }
    return { status: 'hit', menu: entry.menu };
  } catch {
    storage.remove(`candidate-menu:${restaurantId}`);
    return { status: 'miss' };
  }
}

export function setCachedCandidateMenu(
  restaurantId: string,
  sourceUrl: string,
  menu: RestaurantMenu | null,
): void {
  storage.set(
    `candidate-menu:${restaurantId}`,
    JSON.stringify({ parserVersion: 2, sourceUrl, menu, timestamp: Date.now() } satisfies CandidateMenuCacheEntry),
  );
  enforceCacheEntryLimit(storage, ['candidate-menu:'], MENU_CACHE_MAX_ENTRIES);
}
