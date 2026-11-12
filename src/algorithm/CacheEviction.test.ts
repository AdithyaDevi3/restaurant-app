import { selectCacheKeysToEvict } from './CacheEviction';

describe('selectCacheKeysToEvict', () => {
  it('evicts the oldest entries until the cap is met', () => {
    expect(
      selectCacheKeysToEvict(
        [
          { key: 'newest', timestamp: 30 },
          { key: 'oldest', timestamp: 10 },
          { key: 'middle', timestamp: 20 },
        ],
        2,
      ),
    ).toEqual(['oldest']);
  });

  it('uses keys for deterministic ties', () => {
    expect(
      selectCacheKeysToEvict(
        [
          { key: 'b', timestamp: 1 },
          { key: 'a', timestamp: 1 },
        ],
        1,
      ),
    ).toEqual(['a']);
  });

  it('returns nothing when the cache is within its cap', () => {
    expect(selectCacheKeysToEvict([{ key: 'only', timestamp: 1 }], 1)).toEqual([]);
  });
});
