export interface Restaurant {
  id: string;
  name: string;
  sourceUrl?: string;
  sourceProvider?: 'osm' | 'overture';
  sourceDate?: string;
  cuisine: string[];
  rating: number; // 0–5
  priceLevel: 1 | 2 | 3 | 4;
  priceLevelKnown?: boolean;
  distance: number; // meters
  lat: number;
  lon: number;
  openNow?: boolean;
  photoUrl?: string;
  reviewCount?: number;
  tags: string[];
}

export interface UserPreferences {
  favoriteCuisines: string[];
  maxDistance: number; // meters (default 1500)
  priceRange: [number, number]; // [1, 4]
  avoidCuisines: string[];
  dietaryRestrictions: string[]; // 'vegan', 'halal', 'kosher', etc.
  visitHistory: VisitRecord[];
}

export interface VisitRecord {
  restaurantId: string;
  restaurantName: string;
  cuisines: string[];
  rating: number; // user's personal rating 1–5
  timestamp: number;
  lat: number;
  lon: number;
  menuLogged?: boolean;
  notes?: string;
  photoUris?: string[];
}

export interface VisitArea {
  id: string;
  label: string;
  centroid: { lat: number; lon: number };
  radiusMeters: number;
  visitIds: string[]; // restaurantIds anchoring this area
}

export interface TasteProfile {
  terms: string[]; // normalized menu terms from logged menus + liked items
  termWeights?: Record<string, number>;
  likedDishes?: Array<{ name: string; restaurantName: string }>;
  cuisineWeights: Record<string, number>; // from visit ratings, 0–1
  priceAffinity: [number, number];
}

export interface AreaRecommendation {
  area: VisitArea;
  restaurants: ScoredRestaurant[]; // excludes already-visited
}

export interface ScoredRestaurant extends Restaurant {
  recommendationScore: number; // 0–100
  scoreBreakdown: ScoreBreakdown;
  menuMatchTerms?: string[];
  matchKind?: 'menu' | 'cuisine' | 'keywords';
  dishMatches?: Array<{ likedDish: string; likedAt: string; candidateDish: string }>;
}

export interface ScoreBreakdown {
  proximityScore: number;
  ratingScore: number;
  preferenceScore: number;
  noveltyScore: number;
  priceScore: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  selected?: boolean;
}

export interface RestaurantMenu {
  restaurantId: string;
  sourceUrl: string;
  items: MenuItem[];
  lastSyncedAt: number;
}

export interface RestaurantMenuChoice {
  restaurantId: string;
  itemId: string;
  itemName: string;
  restaurantName: string;
  createdAt: number;
}
