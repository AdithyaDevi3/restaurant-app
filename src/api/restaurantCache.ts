import { MMKV } from 'react-native-mmkv';
import { Restaurant } from '../types';

const storage = new MMKV({ id: 'restaurant-finder-cache' });
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CachedRestaurantsEntry {
  restaurants: Restaurant[];
  timestamp: number;
}

function buildCacheKey(lat: number, lon: number, radiusMeters: number): string {
  const latBucket = lat.toFixed(2);
  const lonBucket = lon.toFixed(2);
  return `restaurants:${latBucket}:${lonBucket}:${radiusMeters}`;
}

export function getCachedRestaurants(
  lat: number,
  lon: number,
  radiusMeters: number
): Restaurant[] | null {
  const key = buildCacheKey(lat, lon, radiusMeters);
  const raw = storage.getString(key);

  if (!raw) {
    return null;
  }

  try {
    const cached: CachedRestaurantsEntry = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      storage.delete(key);
      return null;
    }

    return cached.restaurants;
  } catch {
    storage.delete(key);
    return null;
  }
}

export function setCachedRestaurants(
  lat: number,
  lon: number,
  radiusMeters: number,
  restaurants: Restaurant[]
): void {
  const key = buildCacheKey(lat, lon, radiusMeters);
  const payload: CachedRestaurantsEntry = {
    restaurants,
    timestamp: Date.now(),
  };

  storage.set(key, JSON.stringify(payload));
}
