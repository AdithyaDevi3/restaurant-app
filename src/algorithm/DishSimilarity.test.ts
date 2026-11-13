import { findDishMatches } from './DishSimilarity';
import { RestaurantMenu, TasteProfile } from '../types';

const profile: TasteProfile = { terms: [], cuisineWeights: {}, priceAffinity: [1, 3],
  likedDishes: [{ name: 'Spicy miso ramen', restaurantName: 'Ramen House' }] };
const menu = (name: string): RestaurantMenu => ({ restaurantId: 'new', sourceUrl: 'https://example.com/menu', lastSyncedAt: 1, items: [{ id: '1', name }] });
describe('liked dish similarity', () => {
  it('retains both dish names and the original restaurant as evidence', () => {
    expect(findDishMatches(profile, menu('Miso Ramen'))).toEqual([
      { likedDish: 'Spicy miso ramen', likedAt: 'Ramen House', candidateDish: 'Miso Ramen' },
    ]);
  });
  it('does not match dishes just because both contain chicken or spicy', () => {
    expect(findDishMatches({ ...profile, likedDishes: [{ name: 'Spicy chicken curry', restaurantName: 'Curry House' }] }, menu('Spicy chicken sandwich'))).toHaveLength(0);
  });
  it('does not claim a dish when no menu is available', () => {
    expect(findDishMatches(profile, undefined)).toHaveLength(0);
  });
});
