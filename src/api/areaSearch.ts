import { apiEndpoint } from './apiEndpoint';

export interface SearchArea { id: string; label: string; lat: number; lon: number }

export async function searchAreas(query: string): Promise<SearchArea[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
  const response = await fetch(apiEndpoint
    ? `${apiEndpoint}/areas?q=${encodeURIComponent(query.trim())}`
    : `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=5`,
  { signal: controller.signal });
  if (!response.ok) throw new Error('Area search is unavailable. Try again or use a saved area.');
  const data = await response.json();
  return (data.features ?? []).filter((feature: any) => Array.isArray(feature.geometry?.coordinates))
    .map((feature: any, index: number) => ({
      id: `search-${index}-${feature.geometry.coordinates.join(',')}`,
      label: [...new Set([feature.properties.name, feature.properties.city, feature.properties.state, feature.properties.country].filter(Boolean))].join(', '),
      lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0],
    }));
  } finally { clearTimeout(timeout); }
}
