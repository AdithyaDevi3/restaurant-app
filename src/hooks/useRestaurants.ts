import { useState, useEffect, useCallback } from 'react';
import { Restaurant } from '../types';
import { fetchNearbyRestaurants } from '../api/places';
import { getCachedRestaurants, setCachedRestaurants } from '../api/restaurantCache';

interface UseRestaurantsOptions {
  lat: number | null;
  lon: number | null;
  radiusMeters?: number;
}

export function useRestaurants({
  lat,
  lon,
  radiusMeters = 1500,
}: UseRestaurantsOptions) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!lat || !lon) {
      setError('Location not available');
      return;
    }

    setLoading(true);
    setError(null);

    const cached = getCachedRestaurants(lat, lon, radiusMeters);
    if (cached) {
      setRestaurants(
        cached
          .map(r => ({
            ...r,
            distance: calculateDistance(lat, lon, r.lat, r.lon),
          }))
          .sort((a, b) => a.distance - b.distance)
      );
      setLoading(false);
      return;
    }

    try {
      const results = await fetchNearbyRestaurants(lat, lon, radiusMeters);

      // Calculate distances
      const withDistances = results.map(r => ({
        ...r,
        distance: calculateDistance(lat, lon, r.lat, r.lon),
      }));

      const sorted = withDistances.sort((a, b) => a.distance - b.distance);
      setRestaurants(sorted);
      setCachedRestaurants(lat, lon, radiusMeters, sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch restaurants';
      setError(message);
      console.error('useRestaurants error:', err);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, radiusMeters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { restaurants, loading, error, refetch: fetch };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
