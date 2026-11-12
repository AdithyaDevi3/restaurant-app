import { AreaRecommendationEngine } from './AreaRecommendationEngine';
import { Restaurant, RestaurantMenu, TasteProfile, VisitArea, VisitRecord } from '../types';

const area: VisitArea = {
  id: 'area-1',
  label: 'Around Pasta House',
  centroid: { lat: 40.7128, lon: -74.006 },
  radiusMeters: 1500,
  visitIds: ['visited-1'],
};

const profile: TasteProfile = {
  terms: ['pasta', 'carbonara', 'pizza'],
  cuisineWeights: { italian: 1 },
  priceAffinity: [1, 3],
};

const visits: VisitRecord[] = [
  {
    restaurantId: 'visited-1',
    restaurantName: 'Pasta House',
    cuisines: ['Italian'],
    rating: 5,
    timestamp: Date.now(),
    lat: 40.7128,
    lon: -74.006,
  },
];

const prefs = { avoidCuisines: [] as string[], dietaryRestrictions: [] as string[] };

function candidate(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: 'c1',
    name: 'Nonna Pasta Bar',
    cuisine: ['Italian'],
    rating: 4.5,
    reviewCount: 200,
    priceLevel: 2,
    distance: 0,
    lat: 40.713,
    lon: -74.0065,
    tags: [],
    ...overrides,
  };
}

describe('AreaRecommendationEngine.rankForArea', () => {
  it('excludes already-visited restaurants', () => {
    const results = AreaRecommendationEngine.rankForArea(
      [candidate({ id: 'visited-1' })],
      area,
      profile,
      visits,
      prefs,
    );
    expect(results).toHaveLength(0);
  });

  it('scores a strong taste match highly', () => {
    const [top] = AreaRecommendationEngine.rankForArea([candidate({})], area, profile, visits, prefs);
    expect(top.recommendationScore).toBeGreaterThan(50);
    expect(top.scoreBreakdown.preferenceScore).toBeGreaterThan(0.6);
  });

  it('hard-filters avoided cuisines', () => {
    const results = AreaRecommendationEngine.rankForArea(
      [candidate({})],
      area,
      profile,
      visits,
      { avoidCuisines: ['Italian'], dietaryRestrictions: [] },
    );
    expect(results).toHaveLength(0);
  });

  it('excludes the same visited restaurant when free providers use different IDs', () => {
    expect(AreaRecommendationEngine.rankForArea([
      candidate({ id: 'overture-other-id', name: 'Pasta House' }),
    ], area, profile, visits, prefs)).toHaveLength(0);
  });

  it('does not claim that an unknown public-data price fits the user’s spend', () => {
    const [result] = AreaRecommendationEngine.rankForArea([
      candidate({ priceLevelKnown: false }),
    ], area, profile, visits, prefs);
    expect(result.scoreBreakdown.priceScore).toBe(0.5);
    expect(AreaRecommendationEngine.explain(result, area).includes('Fits your usual spend')).toBe(false);
  });

  it('hard-filters unmet dietary restrictions', () => {
    const results = AreaRecommendationEngine.rankForArea(
      [candidate({ tags: [] })],
      area,
      profile,
      visits,
      { avoidCuisines: [], dietaryRestrictions: ['vegan'] },
    );
    expect(results).toHaveLength(0);
  });

  it('keeps candidates that match every dietary restriction case-insensitively', () => {
    const results = AreaRecommendationEngine.rankForArea(
      [candidate({ tags: ['Vegan', 'Gluten-Free'] })],
      area,
      profile,
      visits,
      { avoidCuisines: [], dietaryRestrictions: ['vegan', 'gluten-free'] },
    );

    expect(results).toHaveLength(1);
  });

  it('drops candidates far outside the area', () => {
    const results = AreaRecommendationEngine.rankForArea(
      [candidate({ lat: 41.5, lon: -75 })],
      area,
      profile,
      visits,
      prefs,
    );
    expect(results).toHaveLength(0);
  });

  it('ranks closer matching candidates above distant weak ones', () => {
    const results = AreaRecommendationEngine.rankForArea(
      [
        candidate({ id: 'far-weak', name: 'Burger Barn', cuisine: ['Fast Food'], lat: 40.725, lon: -74.02 }),
        candidate({ id: 'near-strong' }),
      ],
      area,
      profile,
      visits,
      prefs,
    );
    expect(results[0].id).toBe('near-strong');
  });

  it('recomputes distance relative to the area centroid', () => {
    const [top] = AreaRecommendationEngine.rankForArea(
      [candidate({ distance: 99999 })],
      area,
      profile,
      visits,
      prefs,
    );
    expect(top.distance).toBeLessThan(100);
  });

  it('uses fetched candidate menu terms to improve taste scoring', () => {
    const weakCandidate = candidate({ id: 'menu-match', name: 'Corner Kitchen', cuisine: ['American'] });
    const candidateMenu: RestaurantMenu = {
      restaurantId: 'menu-match',
      sourceUrl: 'https://example.com/menu',
      lastSyncedAt: Date.now(),
      items: [{ id: 'dish-1', name: 'Truffle carbonara' }],
    };

    const withoutMenu = AreaRecommendationEngine.rankForArea(
      [weakCandidate], area, profile, visits, prefs,
    );
    const [withMenu] = AreaRecommendationEngine.rankForArea(
      [weakCandidate], area, profile, visits, prefs, { 'menu-match': candidateMenu },
    );

    expect(withoutMenu).toHaveLength(0);
    expect(withMenu.scoreBreakdown.preferenceScore).toBeGreaterThan(0);
    expect(withMenu.menuMatchTerms).toContain('carbonara');
    expect(AreaRecommendationEngine.explain(withMenu, area).join(' ')).toContain('dish availability unconfirmed');
  });

  it('puts a named liked-dish match ahead of a high-rated cuisine-only suggestion', () => {
    const taste = { ...profile, likedDishes: [{ name: 'Truffle carbonara', restaurantName: 'Pasta House' }] };
    const results = AreaRecommendationEngine.rankForArea([
      candidate({ id: 'cuisine-only', rating: 5, reviewCount: 5000 }),
      candidate({ id: 'dish', name: 'Corner Kitchen', cuisine: ['American'], rating: 3, reviewCount: 5 }),
    ], area, taste, visits, prefs, {
      dish: { restaurantId: 'dish', sourceUrl: 'https://example.com/menu', lastSyncedAt: 1,
        items: [{ id: 'i1', name: 'Carbonara' }] },
    });
    expect(results[0].id).toBe('dish');
    expect(results[0].matchKind).toBe('menu');
    expect(results[0].dishMatches?.[0].likedDish).toBe('Truffle carbonara');
    expect(AreaRecommendationEngine.explain(results[0], area).join(' ')).toContain('you liked at Pasta House');
    expect(results[1].matchKind).toBe('cuisine');
  });

  it('excludes unrelated nearby restaurants even when their rating is high', () => {
    expect(AreaRecommendationEngine.rankForArea([
      candidate({ name: 'Sushi Counter', cuisine: ['Japanese'], rating: 5, reviewCount: 5000 }),
    ], area, profile, visits, prefs)).toHaveLength(0);
  });

  it('prioritizes a liked-dish keyword over cuisine alone at otherwise equal restaurants', () => {
    const taste: TasteProfile = { ...profile, terms: ['pizza'], termWeights: { pizza: 4 },
      likedDishes: [{ name: 'Pizza', restaurantName: 'Pasta House' }] };
    const results = AreaRecommendationEngine.rankForArea([
      candidate({ id: 'cuisine', name: 'Italian Kitchen', cuisine: ['Italian'] }),
      candidate({ id: 'dish-keyword', name: 'Pizza Kitchen', cuisine: ['Pizza'] }),
    ], area, taste, visits, prefs);
    expect(results[0].id).toBe('dish-keyword');
    expect(results[0].matchKind).toBe('keywords');
    expect(results[0].dishMatches).toHaveLength(0);
  });

  it('does not treat matching restaurant names as menu evidence', () => {
    const taste = { ...profile, likedDishes: [{ name: 'Carbonara', restaurantName: 'Pasta House' }] };
    const [result] = AreaRecommendationEngine.rankForArea([
      candidate({ name: 'Carbonara Kitchen' }),
    ], area, taste, visits, prefs);
    expect(result.matchKind).toBe('cuisine');
    expect(result.dishMatches).toHaveLength(0);
  });

  it('enforces the exact selected radius rather than merely reducing distance scores', () => {
    expect(AreaRecommendationEngine.rankForArea([
      candidate({ lat: 40.73 }),
    ], { ...area, radiusMeters: 1000 }, profile, visits, prefs)).toHaveLength(0);
  });
});

describe('AreaRecommendationEngine.explain', () => {
  it('always names the area', () => {
    const [top] = AreaRecommendationEngine.rankForArea([candidate({})], area, profile, visits, prefs);
    const reasons = AreaRecommendationEngine.explain(top, area);
    expect(reasons[0]).toContain('Around Pasta House');
  });
});
