export interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  rating: number; // 0–5
  priceLevel: 1 | 2 | 3 | 4;
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
  cuisines: string[];
  rating: number; // user's personal rating 1–5
  timestamp: number;
}

export interface ScoredRestaurant extends Restaurant {
  recommendationScore: number; // 0–100
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  proximityScore: number;
  ratingScore: number;
  preferenceScore: number;
  noveltyScore: number;
  priceScore: number;
}
