import { clusterVisits, haversineMeters } from './AreaClustering';
import { VisitRecord } from '../types';

function visit(overrides: Partial<VisitRecord>): VisitRecord {
  return {
    restaurantId: 'r1',
    restaurantName: 'Test Place',
    cuisines: ['Italian'],
    rating: 4,
    timestamp: Date.now(),
    lat: 40.7128,
    lon: -74.006,
    ...overrides,
  };
}

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters(40.7, -74, 40.7, -74)).toBe(0);
  });

  it('computes ~111km per degree of latitude', () => {
    const d = haversineMeters(40, -74, 41, -74);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe('clusterVisits', () => {
  it('returns no areas for empty history', () => {
    expect(clusterVisits([])).toEqual([]);
  });

  it('skips legacy visits without coordinates', () => {
    expect(clusterVisits([visit({ lat: 0, lon: 0 })])).toEqual([]);
  });

  it('creates one area for a single located visit', () => {
    const areas = clusterVisits([visit({})]);
    expect(areas).toHaveLength(1);
    expect(areas[0].radiusMeters).toBeGreaterThanOrEqual(1500);
    expect(areas[0].visitIds).toEqual(['r1']);
    expect(areas[0].label).toBe('Around Test Place');
  });

  it('merges visits within 1km into one area', () => {
    const areas = clusterVisits([
      visit({ restaurantId: 'a', lat: 40.7128, lon: -74.006 }),
      visit({ restaurantId: 'b', lat: 40.7135, lon: -74.0055 }), // ~90m away
    ]);
    expect(areas).toHaveLength(1);
    expect(areas[0].visitIds).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('separates visits in distant neighborhoods', () => {
    const areas = clusterVisits([
      visit({ restaurantId: 'downtown', lat: 40.7128, lon: -74.006 }),
      visit({ restaurantId: 'uptown', lat: 40.8, lon: -73.95 }), // ~10km away
    ]);
    expect(areas).toHaveLength(2);
  });

  it('labels areas by the most recent visit', () => {
    const areas = clusterVisits([
      visit({ restaurantId: 'old', restaurantName: 'Old Spot', timestamp: 1000 }),
      visit({ restaurantId: 'new', restaurantName: 'New Spot', timestamp: 2000, lat: 40.713, lon: -74.0061 }),
    ]);
    expect(areas[0].label).toBe('Around New Spot');
  });
});
