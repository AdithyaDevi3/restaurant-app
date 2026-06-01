# 📄 File Reference Guide

Complete reference for all files created in the Restaurant Finder app implementation.

## 🏗️ Architecture Files

### `App.tsx` (70 lines)

**Purpose**: Main application entry point with navigation setup
**Contains**:

- NavigationContainer setup
- Bottom tab navigator (Home, Map, Preferences)
- Stack navigators for each tab
- Material Design icon mapping

**Key Routes**:

- `Home` → HomeStack → HomeScreen/DetailScreen
- `Map` → MapStack → MapScreen/DetailScreen
- `Preferences` → PreferencesStack → PreferencesScreen

---

## 🎯 Type Definitions

### `src/types/index.ts` (45 lines)

**Purpose**: Central TypeScript interface definitions
**Defines**:

```typescript
- Restaurant          # Base restaurant data
- UserPreferences     # User settings and history
- VisitRecord         # Visit history entry
- ScoredRestaurant    # Restaurant + recommendation score
- ScoreBreakdown      # Individual scoring components
```

**Used By**: All other modules

---

## 🧠 Algorithm

### `src/algorithm/RecommendationEngine.ts` (150+ lines)

**Purpose**: Core recommendation engine with multi-factor scoring
**Main Class**: `RecommendationEngine`
**Methods**:

- `rank()` - Main entry point, scores and sorts restaurants
- `proximityScore()` - Distance-based scoring (exponential decay)
- `ratingScore()` - Bayesian-adjusted rating (accounts for review count)
- `preferenceScore()` - Cuisine matching with dietary filters
- `noveltyScore()` - Prevents recommendation fatigue (30-day window)
- `priceScore()` - Budget range matching
- `explainScore()` - Human-readable recommendations

**Weights**:

- Proximity: 25%
- Rating: 25%
- Preference: 30%
- Novelty: 10%
- Price: 10%

---

## 🌐 Data & API

### `src/api/places.ts` (250+ lines)

**Purpose**: Restaurant data fetching and mapping
**Functions**:

- `fetchNearbyRestaurants()` - Main entry point (tries Google first, falls back to Overpass)
- `fetchFromGooglePlaces()` - Google Places API integration
- `fetchFromOverpassAPI()` - Free OpenStreetMap Overpass API
- Helper functions for cuisine/tag extraction and price estimation

**Fallback Logic**:

1. If `EXPO_PUBLIC_GOOGLE_PLACES_KEY` is set, use Google Places
2. On failure or not set, use Overpass API (free, no key)

### `src/hooks/useLocation.ts` (25 lines)

**Purpose**: Real-time location access
**Returns**:

```typescript
{
  coords: { lat, lon } | null,
  error: string | null,
  loading: boolean
}
```

**Requests**: ForegroundPermissionsAsync on mount

### `src/hooks/useRestaurants.ts` (70 lines)

**Purpose**: Fetch and rank restaurants
**Parameters**:

```typescript
{
  lat: number | null,
  lon: number | null,
  radiusMeters?: number (default 1500)
}
```

**Returns**:

```typescript
{
  restaurants: Restaurant[],    // Sorted by distance
  loading: boolean,
  error: string | null,
  refetch: () => void
}
```

**Distance Calculation**: Haversine formula

---

## 💾 State Management

### `src/store/useAppStore.ts` (20 lines)

**Purpose**: Global state with Zustand
**Interface**:

```typescript
interface AppState {
  preferences: UserPreferences;
  setPreferences: (p: Partial<UserPreferences>) => void;
  addVisit: (record: VisitRecord) => void;
}
```

**Default Preferences**:

- maxDistance: 1500m
- priceRange: [1, 3]
- visitHistory: [] (max 100 items)

---

## 🎨 Theme System

### `src/theme/index.ts` (60 lines)

**Purpose**: Design system constants
**Exports**:

- `colors` - Color palette
- `spacing` - Size scale (xs 4px → xxl 32px)
- `borderRadius` - Rounding values
- `typography` - Font sizes and weights
- `shadows` - Shadow definitions (sm, md, lg)

**Design Approach**: Dark theme with warm accent

- Background: #1A1A2E
- Accent: #F5A623
- Text: #FFF8F0

---

## 🧩 UI Components

### `src/components/RestaurantCard.tsx` (300+ lines)

**Purpose**: Main restaurant list card
**Props**:

```typescript
{
  restaurant: ScoredRestaurant,
  onPress?: () => void,
  showScore?: boolean
}
```

**Features**:

- Image header with placeholder
- Score badge (top-right)
- Name and rating
- Cuisines display
- Distance and price
- Expandable "Why Recommended?" section
- Feature tags

### `src/components/CategoryPill.tsx` (50 lines)

**Purpose**: Reusable selection chip
**Props**:

```typescript
{
  label: string,
  onPress?: () => void,
  selected?: boolean,
  disabled?: boolean
}
```

### `src/components/RatingStars.tsx` (50 lines)

**Purpose**: Visual star rating display
**Props**:

```typescript
{
  rating: number (0-5),
  size?: number (default 16),
  color?: string
}
```

**Features**: Full, half, and empty stars

### `src/components/SkeletonLoader.tsx` (100 lines)

**Purpose**: Animated loading placeholders
**Exports**:

- `SkeletonLoader` - Individual animated skeleton
- `SkeletonCard` - Pre-composed card skeleton

**Animation**: Shimmer effect (1.5s loop)

---

## 📱 Screen Components

### `src/screens/HomeScreen.tsx` (250+ lines)

**Purpose**: Main list view with filtering
**Features**:

- Location display
- Cuisine filter pills (8 cuisines)
- "Open Now" toggle
- FlatList with lazy rendering
- Skeleton loaders during fetch
- Empty state handling
- Settings button (navigates to Preferences)

**Data Flow**:

1. Get location → Fetch restaurants
2. Filter by cuisine, distance, price, openNow
3. Rank with RecommendationEngine
4. Display in FlatList

### `src/screens/MapScreen.tsx` (200+ lines)

**Purpose**: Interactive map view
**Features**:

- MapView centered on user location
- Restaurant markers with scores
- Color-coded by score (green/orange/yellow)
- Bottom sheet with tapped restaurant preview
- Legend explaining colors
- Tap marker to see preview

**Marker Colors**:

- Green (#4CAF50): 80+
- Amber (#F5A623): 60-80
- Orange (#FF9800): <60

### `src/screens/DetailScreen.tsx` (350+ lines)

**Purpose**: Full restaurant details
**Features**:

- Restaurant image or placeholder
- Rating and review count
- Score breakdown chart (5 factors)
- Info row (distance, price, open status)
- Cuisines and features list
- "Get Directions" button (opens native maps)
- "I've Been Here" button with rating modal
- Back and favorite buttons

**Modal**: Rating selector (1-5 stars) before saving visit

### `src/screens/PreferencesScreen.tsx` (350+ lines)

**Purpose**: User settings and preferences
**Features**:

- Favorite cuisines selector (12 options)
- Avoid cuisines list
- Distance slider (500m - 5km)
- Price range dual slider ($ → $$$$)
- Dietary restrictions checkboxes
- Visit history preview
- Auto-persisting to Zustand store

---

## ⚙️ Configuration Files

### `app.json`

**Purpose**: Expo app configuration
**Key Settings**:

- Permissions for location access (iOS + Android)
- Dark theme (`userInterfaceStyle: "dark"`)
- Plugin configuration for expo-location
- Android permissions array
- iOS infoPlist entry

### `.env`

**Purpose**: Environment variables
**Variables**:

- `EXPO_PUBLIC_GOOGLE_PLACES_KEY` - Optional Google Places API key

**Format**: Exposed variables must start with `EXPO_PUBLIC_`

### `tsconfig.json`

**Purpose**: TypeScript configuration
**Settings**:

- Extends `expo/tsconfig.base`
- Strict mode enabled
- All type checking enabled

---

## 📚 Documentation Files

### `README.md` (Full documentation)

**Sections**:

- Features overview
- Project structure explanation
- Installation & setup
- Configuration guides
- Theme customization
- Algorithm tuning
- Type definitions
- Performance notes
- Testing info
- Future enhancements
- Troubleshooting

### `QUICK_START.md` (Getting started guide)

**Sections**:

- What was implemented
- How to run the app
- Feature walkthrough
- API configuration
- Project statistics
- File structure
- Next steps

### `IMPLEMENTATION_SUMMARY.md` (Technical summary)

**Sections**:

- Complete build checklist
- Implementation statistics
- Key features list
- File structure
- Verification checklist
- Technology stack
- Production readiness

---

## 📦 Dependencies (20+ packages)

**Navigation**:

- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `@react-navigation/stack`

**UI & Maps**:

- `react-native-maps`
- `@expo/vector-icons`
- `react-native-reanimated`
- `react-native-gesture-handler`

**State & Storage**:

- `zustand`
- `react-native-mmkv`

**Location & API**:

- `expo-location`
- `axios`

**Utilities**:

- `date-fns`
- `react-native-screens`
- `react-native-safe-area-context`
- `expo-haptics`

---

## 🎯 How to Use This Guide

**Finding a specific feature?**

1. Check the component name in the list above
2. Look at the "Features" and "Props" sections
3. File path shown clearly at top

**Understanding the data flow?**

1. Start with types in `src/types/index.ts`
2. Check the algorithm in `RecommendationEngine.ts`
3. See how screens use the data

**Customizing the app?**

1. Colors/fonts → edit `src/theme/index.ts`
2. Algorithm weights → edit `RecommendationEngine.ts`
3. UI styling → edit individual component StyleSheets

---

## ✅ Completeness

All 15 required files have been created:

- 1 main app file
- 8 screen/component files
- 2 hook files
- 1 algorithm file
- 1 API file
- 1 store file
- 1 theme file
- 1 types file

Plus documentation and configuration files.

**Total Code**: 2000+ lines of production-ready TypeScript
