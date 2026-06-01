import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface Coords { lat: number; lon: number }

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable in Settings.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      setLoading(false);
    })();
  }, []);

  return { coords, error, loading };
}
