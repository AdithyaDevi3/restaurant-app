import axios from 'axios';
import { Restaurant } from '../types';
import { apiEndpoint } from './apiEndpoint';

interface OverpassNode {
  id: number;
  type?: string;
  lat: number;
  lon: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

/**
 * Fetch restaurants using OpenStreetMap Overpass API (free, no key required)
 */
async function fetchFromOverpassAPI(
  lat: number,
  lon: number,
  radiusMeters: number
): Promise<Restaurant[]> {
  try {
    const query = `
      [out:json][timeout:25];
      nwr["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
      out center;
    `;

    const response = apiEndpoint ? await axios.get(`${apiEndpoint}/places`, {
      params: { lat, lon, radius: radiusMeters }, timeout: 150000,
    }) : await axios.post(
      'https://overpass.private.coffee/api/interpreter',
      query,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
    );

    if (apiEndpoint && Array.isArray(response.data.restaurants)) return response.data.restaurants;
    const data: OverpassResponse = response.data;

    return data.elements.filter((node) => node.tags && Number.isFinite(node.lat ?? node.center?.lat) && Number.isFinite(node.lon ?? node.center?.lon)).map((node: OverpassNode) => {
      const cuisines = node.tags.cuisine
        ? node.tags.cuisine.split(';').map(c => c.trim())
        : ['Restaurant'];

      return {
        id: node.type && node.type !== 'node' ? `osm-${node.type}-${node.id}` : `osm-${node.id}`,
        sourceProvider: 'osm' as const,
        name: node.tags.name || 'Unnamed Restaurant',
        cuisine: cuisines,
        rating: 0, // OSM doesn't provide ratings directly
        reviewCount: 0,
        priceLevel: estimatePriceLevel(node.tags) as 1 | 2 | 3 | 4,
        distance: 0,
        lat: node.lat ?? node.center!.lat,
        lon: node.lon ?? node.center!.lon,
        openNow: undefined,
        photoUrl: undefined,
        sourceUrl: normalizeWebsiteUrl(node.tags.website || node.tags['contact:website']),
        tags: extractTagsFromOSM(node.tags),
      };
    });
  } catch (error) {
    if (apiEndpoint && axios.isAxiosError(error) && typeof error.response?.data === 'string') {
      throw new Error(error.response.data);
    }
    throw error;
  }
}

export function normalizeWebsiteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Free public restaurant lookup shared by native and web builds. */
export async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  radiusMeters: number = 1500,
): Promise<Restaurant[]> {
  return fetchFromOverpassAPI(lat, lon, radiusMeters);
}

/**
 * Extract tags from OSM tags
 */
function extractTagsFromOSM(tags: Record<string, string>): string[] {
  const result: string[] = [];

  if (tags.diet === 'vegan') result.push('vegan');
  if (tags.diet === 'vegetarian') result.push('vegetarian');
  if (tags.halal === 'yes') result.push('halal');
  if (tags.kosher === 'yes') result.push('kosher');

  return result;
}

/**
 * Estimate price level from OSM tags
 */
function estimatePriceLevel(tags: Record<string, string>): number {
  if (tags.price_level) {
    const parsed = parseInt(tags.price_level, 10);
    return Math.max(1, Math.min(4, parsed));
  }

  // Heuristic based on type
  if (tags.fast_food === 'yes' || tags.cuisine?.includes('fast_food')) return 1;
  if (tags.cuisine?.includes('fine_dining')) return 4;

  return 2; // Default middle price
}
