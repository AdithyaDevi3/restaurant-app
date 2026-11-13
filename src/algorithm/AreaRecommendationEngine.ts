import {
  Restaurant,
  RestaurantMenu,
  ScoredRestaurant,
  ScoreBreakdown,
  TasteProfile,
  UserPreferences,
  VisitArea,
  VisitRecord,
} from '../types';
import { haversineMeters } from './AreaClustering';
import { dishTerms, findDishMatches, hasTerm } from './DishSimilarity';

// Taste match dominates — the whole point is "more like what you've logged".
const WEIGHTS = {
  proximity: 0.2, // distance to the area centroid, not the user's GPS
  rating: 0.2,
  taste: 0.4,
  novelty: 0.1,
  price: 0.1,
};

export class AreaRecommendationEngine {
  /**
   * Score candidate restaurants for one visit area against the taste profile.
   * Already-visited restaurants are excluded.
   */
  static rankForArea(
    candidates: Restaurant[],
    area: VisitArea,
    profile: TasteProfile,
    visits: VisitRecord[],
    prefs: Pick<UserPreferences, 'avoidCuisines' | 'dietaryRestrictions'>,
    candidateMenus: Record<string, RestaurantMenu> = {},
  ): ScoredRestaurant[] {
    const visitedIds = new Set(visits.map((v) => v.restaurantId));
    const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

    return candidates
      .filter((candidate) => !visitedIds.has(candidate.id))
      .filter((candidate) => !visits.some((visit) => nameKey(visit.restaurantName) === nameKey(candidate.name)
        && haversineMeters(visit.lat, visit.lon, candidate.lat, candidate.lon) < 100))
      .filter((candidate) => this.meetsHardPreferences(candidate, prefs))
      .filter((candidate) => haversineMeters(area.centroid.lat, area.centroid.lon, candidate.lat, candidate.lon) <= area.radiusMeters)
      .map((candidate) => this.score(candidate, area, profile, candidateMenus[candidate.id]))
      .filter((scored) => scored.matchKind !== undefined)
      .sort((a, b) => Number(b.matchKind === 'menu') - Number(a.matchKind === 'menu') || b.recommendationScore - a.recommendationScore);
  }

  private static score(
    r: Restaurant,
    area: VisitArea,
    profile: TasteProfile,
    candidateMenu?: RestaurantMenu,
  ): ScoredRestaurant {
    const distance = haversineMeters(area.centroid.lat, area.centroid.lon, r.lat, r.lon);

    const taste = this.tasteScore(r, profile, candidateMenu);
    const breakdown: ScoreBreakdown = {
      proximityScore: this.proximityScore(distance, area.radiusMeters),
      ratingScore: this.ratingScore(r.rating, r.reviewCount ?? 0),
      preferenceScore: taste.score,
      noveltyScore: 1, // visited restaurants are excluded upstream
      priceScore: r.priceLevelKnown === false ? 0.5 : this.priceScore(r.priceLevel, profile.priceAffinity),
    };

    const total =
      breakdown.proximityScore * WEIGHTS.proximity +
      breakdown.ratingScore * WEIGHTS.rating +
      breakdown.preferenceScore * WEIGHTS.taste +
      breakdown.noveltyScore * WEIGHTS.novelty +
      breakdown.priceScore * WEIGHTS.price;

    return {
      ...r,
      distance,
      recommendationScore: Math.round(total * 10000) / 100, // 0–100
      scoreBreakdown: breakdown,
      menuMatchTerms: taste.menuMatchTerms,
      matchKind: taste.matchKind,
      dishMatches: taste.dishMatches,
    };
  }

  private static proximityScore(distanceMeters: number, radiusMeters: number): number {
    if (distanceMeters > radiusMeters * 2) return 0;
    return Math.exp(-distanceMeters / radiusMeters);
  }

  private static ratingScore(rating: number, reviewCount: number): number {
    const PRIOR_RATING = 3.5;
    const PRIOR_WEIGHT = 25;
    const adjusted = (PRIOR_WEIGHT * PRIOR_RATING + reviewCount * rating) / (PRIOR_WEIGHT + reviewCount);
    return adjusted / 5;
  }

  private static meetsHardPreferences(
    r: Restaurant,
    prefs: Pick<UserPreferences, 'avoidCuisines' | 'dietaryRestrictions'>,
  ): boolean {
    const cuisines = new Set(r.cuisine.map((c) => c.toLowerCase()));
    if (prefs.avoidCuisines.some((cuisine) => cuisines.has(cuisine.toLowerCase()))) {
      return false;
    }

    const tags = new Set(r.tags.map((tag) => tag.toLowerCase()));
    return prefs.dietaryRestrictions.every((restriction) => tags.has(restriction.toLowerCase()));
  }

  /** Cuisine-weight and menu-term match after hard preferences have been applied. */
  private static tasteScore(
    r: Restaurant,
    profile: TasteProfile,
    candidateMenu?: RestaurantMenu,
  ): { score: number; menuMatchTerms: string[]; matchKind?: ScoredRestaurant['matchKind']; dishMatches: ScoredRestaurant['dishMatches'] } {
    const cuisines = r.cuisine.map((c) => c.toLowerCase());

    const weights = cuisines
      .map((c) => profile.cuisineWeights[c])
      .filter((w): w is number => w !== undefined);
    const cuisineScore = weights.length > 0 ? Math.max(...weights) : 0;

    const metadataHaystack = `${r.name} ${r.cuisine.join(' ')} ${r.tags.join(' ')}`.toLowerCase();
    const interestTerms = profile.likedDishes?.length
      ? [...new Set(profile.likedDishes.flatMap((dish) => dishTerms(dish.name)))] : profile.terms;
    const metadataHits = interestTerms.filter((term) => hasTerm(metadataHaystack, term));
    const menuHaystack = candidateMenu?.items
      .map((item) => `${item.name} ${item.description ?? ''}`)
      .join(' ')
      .toLowerCase() ?? '';
    const menuMatchTerms = interestTerms.filter((term) => hasTerm(menuHaystack, term)).slice(0, 4);
    const matchedTerms = new Set([...metadataHits, ...menuMatchTerms]);
    const weightedHits = [...matchedTerms].reduce((sum, term) => sum + (profile.termWeights?.[term] ?? 1), 0);
    const termScore = Math.min(weightedHits / 8, 1);
    const dishMatches = findDishMatches(profile, candidateMenu);
    const matchKind = dishMatches.length ? 'menu' : cuisineScore >= 0.6 ? 'cuisine'
      : metadataHits.length || menuMatchTerms.length ? 'keywords' : undefined;

    return {
      score: Math.min(profile.likedDishes?.length
        ? cuisineScore * 0.3 + termScore * 0.6 + (dishMatches.length ? 0.6 : matchedTerms.size > 0 ? 0.15 : 0)
        : cuisineScore * 0.6 + termScore * 0.4 + (matchedTerms.size > 0 ? 0.1 : 0), 1),
      menuMatchTerms,
      matchKind,
      dishMatches,
    };
  }

  private static priceScore(priceLevel: number, [minPrice, maxPrice]: [number, number]): number {
    if (priceLevel >= minPrice && priceLevel <= maxPrice) return 1;
    const gap = priceLevel < minPrice ? minPrice - priceLevel : priceLevel - maxPrice;
    return Math.max(0, 1 - gap * 0.4);
  }

  static explain(s: ScoredRestaurant, area: VisitArea): string[] {
    const reasons: string[] = [];
    const b = s.scoreBreakdown;
    reasons.push(`In the ${area.label} area`);
    if (s.dishMatches?.length) {
      const match = s.dishMatches[0];
      reasons.push(`Menu lists ${match.candidateDish} — similar to ${match.likedDish} you liked at ${match.likedAt}`);
    } else if (s.matchKind === 'cuisine') {
      reasons.push('Similar cuisine to restaurants you enjoyed; dish availability unconfirmed');
    } else {
      reasons.push('Matches your food keywords; dish availability unconfirmed');
    }
    if (b.ratingScore > 0.8) reasons.push('Highly rated');
    if (b.priceScore === 1) reasons.push('Fits your usual spend');
    return reasons;
  }
}
