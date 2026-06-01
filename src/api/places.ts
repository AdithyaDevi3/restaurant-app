import axios from 'axios';
import { Restaurant } from '../types';

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

interface GooglePlacesResult {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{ photo_reference: string }>;
  types: string[];
  opening_hours?: {
    open_now: boolean;
  };
  price_level?: number;
}

interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

/**
 * Fetch restaurants using Google Places API (if key is available)
 */
async function fetchFromGooglePlaces(
  lat: number,
  lon: number,
  radiusMeters: number
): Promise<Restaurant[]> {
  if (!GOOGLE_PLACES_KEY) {
    throw new Error('Google Places API key not configured');
  }

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${lat},${lon}`,
          radius: radiusMeters,
          type: 'restaurant',
          key: GOOGLE_PLACES_KEY,
        },
      }
    );

    return response.data.results.map((place: GooglePlacesResult) => ({
      id: place.place_id,
      name: place.name,
      cuisine: extractCuisines(place.types),
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      priceLevel: (place.price_level || 2) as 1 | 2 | 3 | 4,
      distance: 0, // Will be calculated on client
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      openNow: place.opening_hours?.open_now,
      photoUrl: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_KEY}`
        : undefined,
      tags: extractTags(place.types),
    }));
  } catch (error) {
    console.error('Google Places API error:', error);
    throw error;
  }
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
      node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
      out body;
    `;

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const data: OverpassResponse = response.data;

    return data.elements.map((node: OverpassNode, index: number) => {
      const cuisines = node.tags.cuisine
        ? node.tags.cuisine.split(';').map(c => c.trim())
        : ['Restaurant'];

      return {
        id: `osm-${node.id}`,
        name: node.tags.name || 'Unnamed Restaurant',
        cuisine: cuisines,
        rating: 0, // OSM doesn't provide ratings directly
        reviewCount: 0,
        priceLevel: estimatePriceLevel(node.tags) as 1 | 2 | 3 | 4,
        distance: 0,
        lat: node.lat,
        lon: node.lon,
        openNow: undefined,
        photoUrl: undefined,
        tags: extractTagsFromOSM(node.tags),
      };
    });
  } catch (error) {
    console.error('Overpass API error:', error);
    throw error;
  }
}

/**
 * Main entry point - tries Google Places first, falls back to Overpass
 */
export async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  radiusMeters: number = 1500
): Promise<Restaurant[]> {
  try {
    // Try Google Places first
    if (GOOGLE_PLACES_KEY) {
      return await fetchFromGooglePlaces(lat, lon, radiusMeters);
    }
  } catch (error) {
    console.warn('Google Places failed, trying Overpass API');
  }

  // Fall back to Overpass
  return fetchFromOverpassAPI(lat, lon, radiusMeters);
}

/**
 * Extract cuisine categories from Google Places types
 */
function extractCuisines(types: string[]): string[] {
  const cuisineMap: Record<string, string> = {
    cafe: 'Cafe',
    bakery: 'Bakery',
    bar_pub: 'Bar/Pub',
    chinese_restaurant: 'Chinese',
    european_restaurant: 'European',
    fast_food_restaurant: 'Fast Food',
    french_restaurant: 'French',
    indian_restaurant: 'Indian',
    italian_restaurant: 'Italian',
    japanese_restaurant: 'Japanese',
    korean_restaurant: 'Korean',
    mediterranean_restaurant: 'Mediterranean',
    mexican_restaurant: 'Mexican',
    middle_eastern_restaurant: 'Middle Eastern',
    pizza_restaurant: 'Pizza',
    seafood_restaurant: 'Seafood',
    steakhouse: 'Steakhouse',
    sushi_restaurant: 'Sushi',
    thai_restaurant: 'Thai',
    vietnamese_restaurant: 'Vietnamese',
  };

  const extracted: string[] = [];
  types.forEach(type => {
    if (cuisineMap[type] && !extracted.includes(cuisineMap[type])) {
      extracted.push(cuisineMap[type]);
    }
  });

  return extracted.length > 0 ? extracted : ['International'];
}

/**
 * Extract tags from Google Places types
 */
function extractTags(types: string[]): string[] {
  const tags: string[] = [];

  if (types.includes('vegetarian_restaurant')) tags.push('vegetarian');
  if (types.includes('vegan_restaurant')) tags.push('vegan');

  return tags;
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
