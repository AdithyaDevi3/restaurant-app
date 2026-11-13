import { createMMKV } from 'react-native-mmkv';
import { getCachedCandidateMenu, setCachedCandidateMenu } from './candidateMenuCache';
import { getCachedRestaurants, setCachedRestaurants } from './restaurantCache';

describe('recommendation cache boundaries', () => {
  it('does not reuse restaurant results from a different search center in the same neighborhood', () => {
    setCachedRestaurants(40.7101, -74.0001, 1000, []);
    expect(getCachedRestaurants(40.714, -74.004, 1000)).toBe(null);
    expect(getCachedRestaurants(40.7101, -74.0001, 1000)).toEqual([]);
  });

  it('rejects menu evidence cached by the old homepage-heading parser', () => {
    const storage = createMMKV({ id: 'candidate-menu-cache' });
    storage.set('candidate-menu:old-parser', JSON.stringify({
      sourceUrl: 'https://example.com', timestamp: Date.now(), menu: {
        restaurantId: 'old-parser', sourceUrl: 'https://example.com', lastSyncedAt: Date.now(),
        items: [{ id: 'heading', name: 'Best carbonara in town' }],
      },
    }));
    expect(getCachedCandidateMenu('old-parser', 'https://example.com').status).toBe('miss');
  });

  it('retains menu evidence parsed with the current parser', () => {
    const menu = { restaurantId: 'current-parser', sourceUrl: 'https://example.com/menu', lastSyncedAt: Date.now(),
      items: [{ id: 'dish', name: 'Carbonara' }] };
    setCachedCandidateMenu(menu.restaurantId, menu.sourceUrl, menu);
    expect(getCachedCandidateMenu(menu.restaurantId, menu.sourceUrl)).toEqual({ status: 'hit', menu });
  });
});
