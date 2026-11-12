import { buildTasteProfile } from './TasteProfile';
import { RestaurantMenu, RestaurantMenuChoice, VisitRecord } from '../types';

const baseVisit: VisitRecord = {
  restaurantId: 'r1',
  restaurantName: 'Pasta House',
  cuisines: ['Italian'],
  rating: 5,
  timestamp: Date.now(),
  lat: 40.7,
  lon: -74,
};

const menu: RestaurantMenu = {
  restaurantId: 'r1',
  sourceUrl: 'manual',
  lastSyncedAt: Date.now(),
  items: [
    { id: 'i1', name: 'Truffle Carbonara', price: 22 },
    { id: 'i2', name: 'Margherita Pizza', description: 'wood fired tomato basil', price: 16 },
  ],
};

const likedChoice: RestaurantMenuChoice = {
  restaurantId: 'r1',
  itemId: 'i1',
  itemName: 'Truffle Carbonara',
  restaurantName: 'Pasta House',
  createdAt: Date.now(),
};

describe('buildTasteProfile', () => {
  it('returns an empty-ish profile with no data', () => {
    const profile = buildTasteProfile([], {}, []);
    expect(profile.terms).toEqual([]);
    expect(profile.cuisineWeights).toEqual({});
    expect(profile.priceAffinity).toEqual([1, 3]);
  });

  it('extracts terms from menus and liked items', () => {
    const profile = buildTasteProfile([baseVisit], { r1: menu }, [likedChoice]);
    expect(profile.terms).toContain('truffle');
    expect(profile.terms).toContain('carbonara');
    expect(profile.terms).toContain('pizza');
  });

  it('ranks liked-item terms above unliked menu terms', () => {
    const profile = buildTasteProfile([baseVisit], { r1: menu }, [likedChoice]);
    expect(profile.terms.indexOf('truffle')).toBeLessThan(profile.terms.indexOf('pizza'));
  });

  it('uses visit notes as taste signals', () => {
    const profile = buildTasteProfile(
      [{ ...baseVisit, notes: 'Loved the smoky eggplant and tahini' }],
      {},
      [],
    );
    expect(profile.terms).toContain('smoky');
    expect(profile.terms).toContain('eggplant');
    expect(profile.terms).toContain('tahini');
  });

  it('weights cuisines by visit rating', () => {
    const profile = buildTasteProfile(
      [
        { ...baseVisit, cuisines: ['Italian'], rating: 5 },
        { ...baseVisit, restaurantId: 'r2', cuisines: ['Fast Food'], rating: 1 },
      ],
      {},
      [],
    );
    expect(profile.cuisineWeights['italian']).toBe(1);
    expect(profile.cuisineWeights['fast food']).toBeCloseTo(0.2);
  });

  it('derives price affinity from logged menu prices', () => {
    const cheapMenu: RestaurantMenu = {
      ...menu,
      items: [{ id: 'i1', name: 'Dollar Slice', price: 3 }],
    };
    const profile = buildTasteProfile([baseVisit], { r1: cheapMenu }, []);
    expect(profile.priceAffinity).toEqual([1, 2]);
  });
});
