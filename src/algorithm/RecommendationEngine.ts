import { Restaurant, UserPreferences, ScoredRestaurant, ScoreBreakdown, VisitRecord } from '../types';

// ─── WEIGHTS (must sum to 1.0) ───────────────────────────────────────────────
const WEIGHTS = {
  proximity:   0.25,   // How close is it?
  rating:      0.25,   // How highly rated?
  preference:  0.30,   // Does it match user taste profile?
  novelty:     0.10,   // Has the user been here / had this cuisine recently?
  price:       0.10,   // Does it fit their budget?
};

export class RecommendationEngine {

  /**
   * Main entry point — scores and sorts a list of restaurants
   */
  static rank(
    restaurants: Restaurant[],
    prefs: UserPreferences
  ): ScoredRestaurant[] {
    return restaurants
      .map(r => this.score(r, prefs))
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  private static score(r: Restaurant, prefs: UserPreferences): ScoredRestaurant {
    const breakdown: ScoreBreakdown = {
      proximityScore:  this.proximityScore(r.distance, prefs.maxDistance),
      ratingScore:     this.ratingScore(r.rating, r.reviewCount ?? 0),
      preferenceScore: this.preferenceScore(r, prefs),
      noveltyScore:    this.noveltyScore(r, prefs.visitHistory),
      priceScore:      this.priceScore(r.priceLevel, prefs.priceRange),
    };

    const total =
      breakdown.proximityScore  * WEIGHTS.proximity  +
      breakdown.ratingScore     * WEIGHTS.rating     +
      breakdown.preferenceScore * WEIGHTS.preference +
      breakdown.noveltyScore    * WEIGHTS.novelty    +
      breakdown.priceScore      * WEIGHTS.price;

    return {
      ...r,
      recommendationScore: Math.round(total * 100) / 100,
      scoreBreakdown: breakdown,
    };
  }

  // ─── FACTOR FUNCTIONS (each returns 0.0–1.0) ───────────────────────────────

  /** Closer = better. Uses inverse exponential decay. */
  private static proximityScore(distanceMeters: number, maxDistance: number): number {
    if (distanceMeters > maxDistance) return 0;
    // Exponential decay: score=1 at 0m, score≈0.37 at maxDistance
    return Math.exp(-distanceMeters / maxDistance);
  }

  /**
   * Bayesian-adjusted rating: blends the restaurant's rating with a
   * global prior (3.5) weighted by review count, so a 5-star place
   * with 2 reviews doesn't outrank a 4.5-star with 500 reviews.
   */
  private static ratingScore(rating: number, reviewCount: number): number {
    const PRIOR_RATING = 3.5;
    const PRIOR_WEIGHT = 25;   // equivalent review weight of the prior
    const adjusted =
      (PRIOR_WEIGHT * PRIOR_RATING + reviewCount * rating) /
      (PRIOR_WEIGHT + reviewCount);
    return adjusted / 5;       // normalize to 0–1
  }

  /** Cuisine match + dietary filter penalty + avoid-list penalty */
  private static preferenceScore(r: Restaurant, prefs: UserPreferences): number {
    // Hard block: user explicitly avoids this cuisine
    const isAvoided = r.cuisine.some(c =>
      prefs.avoidCuisines.map(x => x.toLowerCase()).includes(c.toLowerCase())
    );
    if (isAvoided) return 0;

    // Hard block: dietary restrictions not met
    const restrictionsMet = prefs.dietaryRestrictions.every(d =>
      r.tags.map(t => t.toLowerCase()).includes(d.toLowerCase())
    );
    if (prefs.dietaryRestrictions.length > 0 && !restrictionsMet) return 0;

    // Soft score: cuisine overlap with favorites
    if (prefs.favoriteCuisines.length === 0) return 0.5; // neutral if no prefs set
    const matches = r.cuisine.filter(c =>
      prefs.favoriteCuisines.map(x => x.toLowerCase()).includes(c.toLowerCase())
    ).length;
    return Math.min(matches / prefs.favoriteCuisines.length, 1);
  }

  /**
   * Novelty: reward places the user hasn't visited and cuisines they
   * haven't had recently. Prevents the algorithm from always returning
   * the same restaurants.
   */
  private static noveltyScore(r: Restaurant, history: VisitRecord[]): number {
    const recentHistory = history.filter(v => {
      const daysSince = (Date.now() - v.timestamp) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;   // look at last 30 days
    });

    // If user visited this exact restaurant recently, penalize
    const visitedRecently = recentHistory.some(v => v.restaurantId === r.id);
    if (visitedRecently) return 0.1;

    // If user has had this cuisine a lot recently, reduce novelty score
    const cuisineFrequency = recentHistory.reduce((acc, v) => {
      v.cuisines.forEach((c: string) => { acc[c] = (acc[c] ?? 0) + 1; });
      return acc;
    }, {} as Record<string, number>);

    const maxFrequency = Math.max(...Object.values(cuisineFrequency).map(v => v as number), 1);
    const cuisineOverlap = r.cuisine.reduce((sum, c) =>
      sum + (cuisineFrequency[c] ?? 0), 0
    );

    // High overlap = low novelty score
    return 1 - Math.min(cuisineOverlap / (maxFrequency * r.cuisine.length + 1), 0.9);
  }

  /** Price level match score */
  private static priceScore(
    priceLevel: number,
    [minPrice, maxPrice]: [number, number]
  ): number {
    if (priceLevel >= minPrice && priceLevel <= maxPrice) return 1;
    const distance = priceLevel < minPrice
      ? minPrice - priceLevel
      : priceLevel - maxPrice;
    return Math.max(0, 1 - distance * 0.4);
  }

  // ─── EXPLANATION HELPER ────────────────────────────────────────────────────

  /** Returns a human-readable reason string for the UI ("Great match · Nearby · Highly rated") */
  static explainScore(s: ScoredRestaurant): string[] {
    const reasons: string[] = [];
    const b = s.scoreBreakdown;
    if (b.proximityScore > 0.7) reasons.push('Very nearby');
    else if (b.proximityScore > 0.4) reasons.push('Nearby');
    if (b.ratingScore > 0.8) reasons.push('Highly rated');
    if (b.preferenceScore > 0.7) reasons.push('Matches your taste');
    if (b.noveltyScore > 0.8) reasons.push("You haven't tried this");
    if (b.priceScore === 1) reasons.push('In your budget');
    return reasons.length > 0 ? reasons : ['Good option nearby'];
  }
}
