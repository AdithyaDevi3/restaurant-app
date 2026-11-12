import * as Location from 'expo-location';
import { createMMKV } from 'react-native-mmkv';
import { pickAreaLabel } from '../algorithm/areaLabel';
import { DISCOVERY_CACHE_MAX_ENTRIES, enforceCacheEntryLimit } from './cacheEviction';

const storage = createMMKV({ id: 'restaurant-finder-cache' });

interface CachedAreaLabel {
  label: string | null;
  timestamp: number;
}

function labelCacheKey(lat: number, lon: number): string {
  return `arealabel:${lat.toFixed(3)}:${lon.toFixed(3)}`;
}

/**
 * Reverse-geocode an area centroid to a neighborhood-style label ("SoHo").
 * Cached permanently per ~100m bucket — geocoding is rate-limited and
 * neighborhoods don't move. Returns null on failure (callers keep fallback).
 */
export async function getAreaLabel(lat: number, lon: number): Promise<string | null> {
  const key = labelCacheKey(lat, lon);
  const cached = storage.getString(key);
  if (cached !== undefined) {
    try {
      const entry = JSON.parse(cached) as CachedAreaLabel;
      if (
        typeof entry.timestamp === 'number' &&
        (typeof entry.label === 'string' || entry.label === null)
      ) {
        return entry.label;
      }
    } catch {
      // Legacy entries stored the label directly; retain them until normal eviction.
    }
    return cached === '' ? null : cached;
  }

  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const label = pickAreaLabel(addresses);
    storage.set(key, JSON.stringify({ label, timestamp: Date.now() } satisfies CachedAreaLabel));
    enforceCacheEntryLimit(storage, ['restaurants:', 'arealabel:'], DISCOVERY_CACHE_MAX_ENTRIES);
    return label;
  } catch {
    return null; // transient failure: don't cache, retry next refresh
  }
}
