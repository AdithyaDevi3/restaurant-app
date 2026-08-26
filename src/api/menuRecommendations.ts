import { MenuItem, Restaurant, RestaurantMenuChoice } from '../types';

export interface SimilarRestaurantRecommendation {
  restaurant: Restaurant;
  score: number;
  matchedReasons: string[];
}

export interface ItemAvailabilityRecommendation {
  itemName: string;
  restaurants: Array<{
    restaurant: Restaurant;
    score: number;
    reasons: string[];
  }>;
}

export interface MenuItemRecommendation {
  item: MenuItem;
  score: number;
  reasons: string[];
}

export interface MenuRecommendationResult {
  similarRestaurants: SimilarRestaurantRecommendation[];
  itemAvailability: ItemAvailabilityRecommendation[];
  recommendedItems: MenuItemRecommendation[];
}

export function buildMenuProfile(
  menuItems: MenuItem[],
  selectedChoices: RestaurantMenuChoice[],
): string[] {
  const selectedNames = selectedChoices.map((choice) => choice.itemName.toLowerCase());
  const menuNames = menuItems.map((item) => item.name.toLowerCase());
  return Array.from(new Set([...selectedNames, ...menuNames].flatMap(normalizeToTerms)));
}

export function recommendFromMenuContext({
  restaurant,
  candidateRestaurants,
  menuItems,
  selectedChoices,
}: {
  restaurant: Restaurant;
  candidateRestaurants: Restaurant[];
  menuItems: MenuItem[];
  selectedChoices: RestaurantMenuChoice[];
}): MenuRecommendationResult {
  const profileTerms = buildMenuProfile(menuItems, selectedChoices);

  const recommendedItems = menuItems
    .map((item) => {
      const { score, reasons } = scoreMenuItemForProfile(item, profileTerms);
      return { item, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const similarRestaurants = candidateRestaurants
    .filter((candidate) => candidate.id !== restaurant.id)
    .map((candidate) => {
      const matchedReasons: string[] = [];
      const cuisineOverlap = candidate.cuisine.filter((cuisine) =>
        restaurant.cuisine.some((itemCuisine) => itemCuisine.toLowerCase() === cuisine.toLowerCase()),
      );

      if (cuisineOverlap.length > 0) {
        matchedReasons.push(`Shared cuisine: ${cuisineOverlap.join(', ')}`);
      }

      const itemMatches = profileTerms.filter((term) => matchesRestaurantTerm(candidate, term));

      if (itemMatches.length > 0) {
        matchedReasons.push(`Matches menu interests: ${itemMatches.slice(0, 3).join(', ')}`);
      }

      const score = cuisineOverlap.length * 2 + itemMatches.length;

      return {
        restaurant: candidate,
        score,
        matchedReasons,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const itemAvailabilityMap = new Map<ItemAvailabilityRecommendation['itemName'], ItemAvailabilityRecommendation['restaurants']>();

  profileTerms.forEach((term) => {
    const itemName = prettifyItemName(term);

    const restaurants = candidateRestaurants
      .map((candidate) => {
        const { score, reasons } = scoreRestaurantForTerm(candidate, term);
        return {
          restaurant: candidate,
          score,
          reasons,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (restaurants.length > 0) {
      itemAvailabilityMap.set(itemName, restaurants);
    }
  });

  return {
    similarRestaurants,
    itemAvailability: Array.from(itemAvailabilityMap.entries()).map(([itemName, restaurants]) => ({
      itemName,
      restaurants,
    })),
    recommendedItems,
  };
}

function normalizeToTerms(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function scoreRestaurantForTerm(
  restaurant: Restaurant,
  term: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const lowerTerm = term.toLowerCase();
  const tokens = normalizeToTerms(term);
  let score = 0;

  if (restaurant.name.toLowerCase().includes(lowerTerm)) {
    score += 5;
    reasons.push('Restaurant name matches the item');
  }

  const cuisineMatches = restaurant.cuisine.filter((cuisine) =>
    tokens.some((token) => cuisine.toLowerCase().includes(token) || token.includes(cuisine.toLowerCase())),
  );
  if (cuisineMatches.length > 0) {
    score += cuisineMatches.length * 3;
    reasons.push(`Cuisine overlap: ${cuisineMatches.join(', ')}`);
  }

  const tagMatches = restaurant.tags.filter((tag) =>
    tokens.some((token) => tag.toLowerCase().includes(token) || token.includes(tag.toLowerCase())),
  );
  if (tagMatches.length > 0) {
    score += tagMatches.length * 2;
    reasons.push(`Feature match: ${tagMatches.join(', ')}`);
  }

  if (tokens.some((token) => restaurant.name.toLowerCase().includes(token))) {
    score += 2;
    reasons.push('Item keyword appears in restaurant name');
  }

  return { score, reasons };
}

function scoreMenuItemForProfile(
  item: MenuItem,
  profileTerms: string[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const lowerName = item.name.toLowerCase();
  const lowerDescription = (item.description || '').toLowerCase();
  let score = 0;

  profileTerms.forEach((term) => {
    const tokens = normalizeToTerms(term);
    if (tokens.some((token) => lowerName.includes(token))) {
      score += 3;
      reasons.push(`Matches item keyword: ${term}`);
    }

    if (tokens.some((token) => lowerDescription.includes(token))) {
      score += 2;
      reasons.push(`Described with: ${term}`);
    }

    if (item.description && item.description.toLowerCase().includes(term)) {
      score += 2;
      reasons.push(`Item description mentions ${term}`);
    }
  });

  if (item.price !== undefined && item.price <= 15) {
    score += 1;
    reasons.push('Accessible price point');
  }

  return { score, reasons };
}

function matchesRestaurantTerm(restaurant: Restaurant, term: string): boolean {
  return scoreRestaurantForTerm(restaurant, term).score > 0;
}

function prettifyItemName(term: string): string {
  return term
    .split('-')
    .map((piece) => piece[0]?.toUpperCase() + piece.slice(1))
    .join(' ')
    .trim() || term;
}