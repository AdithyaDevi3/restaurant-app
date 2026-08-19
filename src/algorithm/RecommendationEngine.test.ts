import { RecommendationEngine } from './RecommendationEngine';
import { Restaurant, UserPreferences } from '../types';

describe('RecommendationEngine', () => {
  const basePreferences: UserPreferences = {
    favoriteCuisines: ['Italian'],
    maxDistance: 1500,
    priceRange: [1, 3],
    avoidCuisines: [],
    dietaryRestrictions: [],
    visitHistory: [],
  };

  const restaurant: Restaurant = {
    id: '1',
    name: 'Test Bistro',
    cuisine: ['Italian', 'Pizza'],
    rating: 4.5,
    priceLevel: 2,
    distance: 500,
    lat: 0,
    lon: 0,
    tags: ['vegetarian'],
    reviewCount: 120,
  };

  it('ranks restaurants and returns score breakdowns', () => {
    const ranked = RecommendationEngine.rank([restaurant], basePreferences);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].recommendationScore).toBeGreaterThan(0);
    expect(ranked[0].scoreBreakdown.preferenceScore).toBeGreaterThan(0);
  });

  it('explains strong matches with readable reasons', () => {
    const ranked = RecommendationEngine.rank([restaurant], basePreferences);
    const reasons = RecommendationEngine.explainScore(ranked[0]);

    expect(reasons).toContain('Very nearby');
    expect(reasons).toContain('Matches your taste');
    expect(reasons).toContain('In your budget');
  });
});