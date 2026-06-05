import React, { useMemo, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../hooks/useLocation";
import { useRestaurants } from "../hooks/useRestaurants";
import { useAppStore } from "../store/useAppStore";
import { RecommendationEngine } from "../algorithm/RecommendationEngine";
import { RestaurantCard } from "../components/RestaurantCard";
import { SkeletonCard } from "../components/SkeletonLoader";
import { CategoryPill } from "../components/CategoryPill";
import { colors, spacing, typography, borderRadius } from "../theme";

interface HomeScreenProps {
  navigation: any;
}

const CUISINES = [
  "Italian",
  "Japanese",
  "Mexican",
  "Thai",
  "Chinese",
  "Indian",
  "French",
  "Mediterranean",
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const {
    coords,
    loading: locationLoading,
    error: locationError,
  } = useLocation();
  const { restaurants, loading, error, refetch } = useRestaurants({
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
  });

  const preferences = useAppStore((state) => state.preferences);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [filterOpenNow, setFilterOpenNow] = useState(false);

  // Score and rank restaurants here
  const rankedRestaurants = useMemo(() => {
    let filtered = restaurants;

    // Apply filters here
    if (selectedCuisine) {
      filtered = filtered.filter((r) =>
        r.cuisine
          .map((c) => c.toLowerCase())
          .includes(selectedCuisine.toLowerCase()),
      );
    }

    if (filterOpenNow) {
      filtered = filtered.filter((r) => r.openNow === true);
    }

    // Apply distance filter
    filtered = filtered.filter((r) => r.distance <= preferences.maxDistance);

    // Apply price filter
    filtered = filtered.filter(
      (r) =>
        r.priceLevel >= preferences.priceRange[0] &&
        r.priceLevel <= preferences.priceRange[1],
    );

    // Score and rank
    return RecommendationEngine.rank(filtered, preferences);
  }, [restaurants, preferences, selectedCuisine, filterOpenNow]);

  const handlePressRestaurant = (restaurantId: string) => {
    navigation.navigate("Detail", { restaurantId });
  };

  const renderEmpty = () => {
    if (locationError) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="location-off" size={48} color={colors.accent} />
          <Text style={styles.emptyText}>{locationError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {}}>
            <Text style={styles.retryButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error" size={48} color={colors.errorRed} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!locationLoading && rankedRestaurants.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons
            name="restaurant"
            size={48}
            color={colors.disabledGray}
          />
          <Text style={styles.emptyText}>No restaurants found nearby</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      );
    }

    return null;
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Find Your Spot</Text>
          {coords && (
            <Text style={styles.subtitle}>
              Nearby at {coords.lat.toFixed(2)}, {coords.lon.toFixed(2)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate("Preferences")}
        >
          <MaterialIcons name="tune" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {CUISINES.map((cuisine) => (
          <CategoryPill
            key={cuisine}
            label={cuisine}
            selected={selectedCuisine === cuisine}
            onPress={() =>
              setSelectedCuisine(selectedCuisine === cuisine ? null : cuisine)
            }
          />
        ))}
      </ScrollView>

      {/* Open Now Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterOpenNow && styles.filterChipActive]}
          onPress={() => setFilterOpenNow(!filterOpenNow)}
        >
          <MaterialIcons
            name="schedule"
            size={16}
            color={filterOpenNow ? colors.text : colors.textDark}
          />
          <Text
            style={[
              styles.filterChipText,
              filterOpenNow && styles.filterChipTextActive,
            ]}
          >
            Open Now
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading || locationLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={rankedRestaurants}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => handlePressRestaurant(item.id)}
              showScore
            />
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.heading1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.accent,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  filtersContainer: {
    flexGrow: 0,
    backgroundColor: colors.background,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    ...typography.bodySemibold,
    color: colors.textDark,
  },
  filterChipTextActive: {
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.heading2,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.body,
    color: colors.disabledGray,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.bodySemibold,
    color: colors.text,
  },
});
