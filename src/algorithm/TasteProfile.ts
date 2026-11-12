import { RestaurantMenu, RestaurantMenuChoice, TasteProfile, VisitRecord } from '../types';

function normalizeToTerms(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

const STOP_TERMS = new Set([
  'and', 'the', 'with', 'our', 'served', 'fresh', 'house', 'style', 'from', 'for',
]);

/**
 * Build the user's taste profile from everything they've logged:
 * liked menu items weigh heaviest, full logged menus contribute context,
 * and visit ratings weight cuisines (rated 4–5 boosts, 1–2 dampens).
 */
export function buildTasteProfile(
  visits: VisitRecord[],
  menus: Record<string, RestaurantMenu>,
  choices: RestaurantMenuChoice[],
): TasteProfile {
  const termCounts = new Map<string, number>();

  const addTerms = (value: string, weight: number) => {
    normalizeToTerms(value)
      .filter((term) => !STOP_TERMS.has(term))
      .forEach((term) => termCounts.set(term, (termCounts.get(term) ?? 0) + weight));
  };

  choices.forEach((choice) => addTerms(choice.itemName, 3));
  visits.forEach((visit) => {
    if (visit.notes) addTerms(visit.notes, 2);
  });
  Object.values(menus).forEach((menu) =>
    menu.items.forEach((item) => {
      addTerms(item.name, 1);
      if (item.description) addTerms(item.description, 0.5);
    }),
  );

  const terms = Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([term]) => term);

  const cuisineScores = new Map<string, { total: number; count: number }>();
  visits.forEach((visit) => {
    const ratingWeight = visit.rating > 0 ? visit.rating / 5 : 0.6; // unrated = mildly positive
    visit.cuisines.forEach((cuisine) => {
      const key = cuisine.toLowerCase();
      const entry = cuisineScores.get(key) ?? { total: 0, count: 0 };
      entry.total += ratingWeight;
      entry.count += 1;
      cuisineScores.set(key, entry);
    });
  });

  const cuisineWeights: Record<string, number> = {};
  cuisineScores.forEach((entry, cuisine) => {
    cuisineWeights[cuisine] = entry.total / entry.count;
  });

  const ratedPrices = Object.values(menus)
    .flatMap((menu) => menu.items.map((item) => item.price))
    .filter((price): price is number => typeof price === 'number' && price > 0);

  let priceAffinity: [number, number] = [1, 3];
  if (ratedPrices.length > 0) {
    const avg = ratedPrices.reduce((sum, p) => sum + p, 0) / ratedPrices.length;
    if (avg <= 12) priceAffinity = [1, 2];
    else if (avg <= 25) priceAffinity = [1, 3];
    else if (avg <= 45) priceAffinity = [2, 4];
    else priceAffinity = [3, 4];
  }

  return {
    terms,
    termWeights: Object.fromEntries(termCounts),
    likedDishes: choices.map((choice) => ({
      name: choice.itemName,
      restaurantName: choice.restaurantName,
    })),
    cuisineWeights,
    priceAffinity,
  };
}
