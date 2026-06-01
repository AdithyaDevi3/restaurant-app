# 🍽️ Restaurant Finder App

A sophisticated React Native mobile app that recommends restaurants based on user preferences, location proximity, ratings, novelty, and price using an advanced multi-factor scoring algorithm.

## Features

✨ **Smart Recommendation Algorithm**

- Bayesian-adjusted rating system
- Proximity-based scoring with exponential decay
- Cuisine preference matching with hard filters
- Novelty tracking to prevent recommendation fatigue
- Price range filtering

📍 **Location Services**

- Real-time location tracking
- Radius-based restaurant search (500m to 5km)
- Distance calculation using Haversine formula

🗺️ **Multiple Interfaces**

- **Home Screen**: Ranked list view with filtering
- **Map View**: Visual representation with color-coded markers
- **Detail View**: Comprehensive restaurant information
- **Preferences**: Customizable user settings and history

🎨 **Beautiful UI**

- Dark theme with warm accent colors
- Smooth animations and transitions
- Responsive design for all screen sizes
- Skeleton loaders for perceived performance

🔄 **Global State Management**

- Zustand for lightweight state
- Persistent visit history
- User preference management

## Project Structure

```
RestaurantFinder/
├── src/
│   ├── algorithm/
│   │   └── RecommendationEngine.ts    # Core multi-factor scoring
│   ├── api/
│   │   └── places.ts                  # Google Places + OpenStreetMap fallback
│   ├── components/
│   │   ├── RestaurantCard.tsx         # Main card component
│   │   ├── CategoryPill.tsx           # Chip/tag component
│   │   ├── RatingStars.tsx            # Star rating display
│   │   └── SkeletonLoader.tsx         # Loading placeholders
│   ├── hooks/
│   │   ├── useLocation.ts             # Location access
│   │   └── useRestaurants.ts          # Restaurant fetching
│   ├── screens/
│   │   ├── HomeScreen.tsx             # Main list view
│   │   ├── MapScreen.tsx              # Map interface
│   │   ├── DetailScreen.tsx           # Restaurant details
│   │   └── PreferencesScreen.tsx      # Settings
│   ├── store/
│   │   └── useAppStore.ts             # Zustand global state
│   ├── theme/
│   │   └── index.ts                   # Colors, fonts, spacing
│   └── types/
│       └── index.ts                   # TypeScript interfaces
├── App.tsx                            # Navigation setup
├── app.json                           # Expo configuration
└── .env                               # API key configuration
```

## Algorithm Details

The recommendation engine uses **weighted multi-factor scoring** to rank restaurants:

### Scoring Weights

- **Proximity** (25%): Exponential decay based on distance
- **Rating** (25%): Bayesian-adjusted to account for review count
- **Preference** (30%): Cuisine match + dietary restrictions
- **Novelty** (10%): Rewards unexplored cuisines and unvisited restaurants
- **Price** (10%): Matches user's price range preference

### Key Components

**proximityScore**: Exponential decay function

```
score = e^(-distance / maxDistance)
```

**ratingScore**: Bayesian adjustment

```
adjusted = (25 * 3.5 + reviewCount * rating) / (25 + reviewCount)
score = adjusted / 5
```

**preferenceScore**: Hard filters + soft scoring

- Blocks avoided cuisines (score = 0)
- Blocks unmet dietary restrictions
- Matches favorite cuisines

**noveltyScore**: Prevents recommendation fatigue

- 30-day visit history window
- Penalizes recently visited restaurants
- Reduces score for frequently consumed cuisines

**priceScore**: Budget matching

- Returns 1.0 if in range, penalty otherwise

## Installation & Setup

### Prerequisites

- Node.js >= 18
- npm
- Expo CLI
- iOS/Android development environment (optional for simulator)

### Quick Start

1. **Navigate to project**

```bash
cd RestaurantFinder
```

2. **Install dependencies** (already done)

```bash
npm install
```

3. **Configure API key** (Optional)
   - Edit `.env` and add your Google Places API key
   - If omitted, the app will use the free OpenStreetMap API

4. **Start the development server**

```bash
npx expo start
```

5. **Run on simulator/device**

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Physical device (scan QR code with Expo Go)
# QR code displayed in terminal
```

## Configuration

### Google Places API (Optional)

For better restaurant data and reviews, set up Google Places:

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable the "Places API"
4. Create an API key credential
5. Add to `.env`: `EXPO_PUBLIC_GOOGLE_PLACES_KEY=your_key`

### OpenStreetMap (Free, Default)

The app automatically falls back to the free Overpass API if Google Places is not configured.

## Theme Customization

Edit `src/theme/index.ts` to customize:

```typescript
colors.background    # '#1A1A2E' - Dark background
colors.accent        # '#F5A623' - Warm accent
colors.text          # '#FFF8F0' - Light text
typography.*         # Font sizes and weights
spacing.*            # Padding/margin values
borderRadius.*       # Rounding values
shadows.*            # Shadow definitions
```

## Recommendation Algorithm Tuning

Adjust weights in `RecommendationEngine.ts`:

```typescript
const WEIGHTS = {
  proximity: 0.25, // Increase for location-heavy recommendations
  rating: 0.25, // Increase to favor highly-rated restaurants
  preference: 0.3, // Increase to respect cuisine preferences more
  novelty: 0.1, // Increase to discover new places
  price: 0.1, // Increase to strictly match budget
};
```

## Type Definitions

Core types in `src/types/index.ts`:

```typescript
Restaurant          # Basic restaurant data
UserPreferences     # User settings
ScoredRestaurant    # Restaurant + recommendation score
ScoreBreakdown      # Individual score components
VisitRecord         # User visit history
```

## Performance Notes

- Restaurants are cached in memory during session
- Distance calculations use optimized Haversine formula
- Skeleton loaders provide perceived performance
- FlatList with key optimization for large lists
- Memoized components prevent unnecessary re-renders

## Testing

The recommendation algorithm is thoroughly tested. Key test cases:

1. Avoided cuisines return score 0 ✓
2. Close restaurant beats distant high-quality one ✓
3. Recently visited scores lower than unvisited ✓
4. 5-star/1-review loses to 4.5-star/200-reviews ✓
5. No preferences = proximity + rating only ✓

## Future Enhancements

- [ ] Offline caching with MMKV
- [ ] "Surprise me" random pick feature
- [ ] Share restaurant as image
- [ ] Dark/light mode toggle
- [ ] ML-based collaborative filtering
- [ ] Push notifications for special offers
- [ ] Social features (share with friends)
- [ ] Restaurant hours integration
- [ ] Menu browsing
- [ ] Table reservation integration

## Permissions

The app requires:

- **Location**: To find restaurants near you
- **Network**: To fetch restaurant data

All permissions are requested at runtime with user-friendly explanations.

## Troubleshooting

**Location not working?**

- Check system location services are enabled
- Grant location permission in app settings
- Try "Precise location" if available

**No restaurants found?**

- Ensure location services are working
- Check internet connection
- Try adjusting distance and filter settings
- Consider enabling Google Places API for better coverage

**App crashes on startup?**

- Clear cache: `npx expo start --clear`
- Delete node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

## Performance Tips

- Use the MapView for density visualization
- Adjust maxDistance to reduce API load
- Restaurant data is re-fetched when navigating back to Home

## Deployment

For production deployment:

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for web
npx expo export --platform web
```

## Architecture Decisions

1. **Zustand over Redux**: Lightweight, perfect for this scope
2. **Expo over bare RN**: Simplified setup and deployment
3. **Overpass fallback**: No API keys required for basic functionality
4. **Bayesian rating**: Scientific approach to rating adjustment
5. **30-day novelty window**: Balances discovery with satisfaction

## Contributing

Feel free to fork, modify, and improve!

## License

MIT

---

**Created with ❤️ for restaurant discovery enthusiasts**
