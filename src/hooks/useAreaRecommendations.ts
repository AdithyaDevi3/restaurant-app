import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AreaRecommendation, VisitArea } from '../types';
import { clusterVisits, haversineMeters } from '../algorithm/AreaClustering';
import { buildTasteProfile } from '../algorithm/TasteProfile';
import { AreaRecommendationEngine } from '../algorithm/AreaRecommendationEngine';
import { fetchNearbyRestaurants } from '../api/places';
import { getAreaLabel } from '../api/areaLabels';
import { getCachedRestaurants, setCachedRestaurants } from '../api/restaurantCache';
import { useAppStore } from '../store/useAppStore';
import { loadCandidateMenus } from '../api/candidateMenus';
import { Coords } from './useLocation';

interface SearchOptions { coords?: Coords | null; areaId?: string; radiusMeters?: number; locationLabel?: string }

export function useAreaRecommendations({ coords, areaId, radiusMeters = 1500, locationLabel = 'Near you' }: SearchOptions = {}) {
  const preferences = useAppStore((state) => state.preferences);
  const restaurantMenus = useAppStore((state) => state.restaurantMenus);
  const menuChoices = useAppStore((state) => state.menuChoices);
  const [recommendations, setRecommendations] = useState<AreaRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const areas = useMemo(() => clusterVisits(preferences.visitHistory), [preferences.visitHistory]);
  const profile = useMemo(() => buildTasteProfile(preferences.visitHistory, restaurantMenus, menuChoices),
    [preferences.visitHistory, restaurantMenus, menuChoices]);
  const searchAreas = useMemo<VisitArea[]>(() => {
    if (coords) return [{ id: 'search-location', label: locationLabel, centroid: coords, radiusMeters, visitIds: [] }];
    const selected = areas.find((area) => area.id === areaId);
    return selected ? [{ ...selected, radiusMeters }] : [];
  }, [coords?.lat, coords?.lon, areaId, areas, radiusMeters, locationLabel]);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setRecommendations([]);
    setError(null);
    if (!searchAreas.length || !menuChoices.length) { setLoading(false); return; }
    setLoading(true);
    try {
      const results = await Promise.all(searchAreas.map(async (area) => {
        const { lat, lon } = area.centroid;
        const cached = getCachedRestaurants(lat, lon, area.radiusMeters);
        const candidates = cached ?? await fetchNearbyRestaurants(lat, lon, area.radiusMeters);
        if (!cached) setCachedRestaurants(lat, lon, area.radiusMeters, candidates);
        const geoLabel = area.id === 'search-location' ? null : await getAreaLabel(lat, lon);
        const labeledArea = geoLabel ? { ...area, label: geoLabel } : area;
        // A candidate with weak metadata may still have a matching dish on its menu.
        const visited = new Set(preferences.visitHistory.map((visit) => visit.restaurantId));
        const nearbyCandidates = candidates.filter((candidate) => !visited.has(candidate.id) && haversineMeters(lat, lon, candidate.lat, candidate.lon) <= area.radiusMeters);
        const preliminary = AreaRecommendationEngine.rankForArea(nearbyCandidates, labeledArea, profile, preferences.visitHistory, preferences);
        const candidateMenus = await loadCandidateMenus([
          ...preliminary, ...nearbyCandidates.filter((candidate) => !preliminary.some((ranked) => ranked.id === candidate.id)),
        ]);
        return { area: labeledArea, restaurants: AreaRecommendationEngine.rankForArea(
          candidates, labeledArea, profile, preferences.visitHistory, preferences,
          { ...restaurantMenus, ...candidateMenus },
        ).slice(0, 10) };
      }));
      if (id === requestId.current) setRecommendations(results);
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [searchAreas, profile, preferences, menuChoices.length, restaurantMenus]);

  useEffect(() => { void refresh(); return () => { requestId.current += 1; }; }, [refresh]);
  return { recommendations, areas, profile, loading, error, refresh };
}
