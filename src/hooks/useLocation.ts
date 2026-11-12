import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export interface Coords { lat: number; lon: number }

export function useLocation(enabled = true) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location access is off. Allow location in your browser or device settings, or choose a saved area.');
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (id === requestId.current) setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } catch (err) {
      if (id === requestId.current) {
        setCoords(null);
        setError(err instanceof Error ? err.message : 'Could not find your location. Choose a saved area or try again.');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
    else setLoading(false);
    return () => { requestId.current += 1; };
  }, [enabled, refresh]);

  return { coords, error, loading, refresh };
}
