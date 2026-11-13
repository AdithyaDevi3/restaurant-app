import { RestaurantMenu, ScoredRestaurant, TasteProfile } from '../types';

const GENERIC = new Set([
  'and', 'the', 'with', 'our', 'served', 'fresh', 'house', 'style', 'from', 'for',
  'special', 'signature', 'sauce', 'chicken', 'beef', 'pork', 'vegetable', 'grilled',
  'fried', 'roasted', 'crispy', 'spicy', 'classic', 'traditional',
]);

export function dishTerms(value: string): string[] {
  return [...new Set(value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !GENERIC.has(term)))];
}

/** Match named dishes, rather than claiming that a restaurant's name proves availability. */
export function findDishMatches(
  profile: TasteProfile,
  menu: RestaurantMenu | undefined,
): NonNullable<ScoredRestaurant['dishMatches']> {
  if (!menu) return [];
  const matches: NonNullable<ScoredRestaurant['dishMatches']> = [];
  for (const liked of profile.likedDishes ?? []) {
    const terms = dishTerms(liked.name);
    if (!terms.length) continue;
    const candidate = menu.items.find((item) => {
      const candidateTerms = new Set(dishTerms(item.name));
      const overlap = terms.filter((term) => candidateTerms.has(term)).length;
      return overlap > 0 && overlap / terms.length >= 0.5;
    });
    if (candidate) matches.push({ likedDish: liked.name, likedAt: liked.restaurantName, candidateDish: candidate.name });
  }
  return matches.slice(0, 3);
}

export function hasTerm(text: string, term: string): boolean {
  return text.toLowerCase().split(/[^a-z0-9]+/).includes(term.toLowerCase());
}
