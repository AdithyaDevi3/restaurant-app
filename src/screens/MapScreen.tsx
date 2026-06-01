import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocation } from "../hooks/useLocation";
import { useRestaurants } from "../hooks/useRestaurants";
import { useAppStore } from "../store/useAppStore";
import { RecommendationEngine } from "../algorithm/RecommendationEngine";
import { RestaurantCard } from "../components/RestaurantCard";
import { colors, spacing, typography, borderRadius } from "../theme";

interface MapScreenProps {
  navigation: any;
}

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const { coords, loading: locationLoading } = useLocation();
  const { restaurants } = useRestaurants({
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
  });
  const preferences = useAppStore((state) => state.preferences);

  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  // Rank restaurants
  const rankedRestaurants = useMemo(() => {
    return RecommendationEngine.rank(restaurants, preferences);
  }, [restaurants, preferences]);

  const getMarkerColor = (score: number): string => {
    if (score >= 80) return colors.successGreen;
    if (score >= 60) return colors.accent;
    return colors.warningOrange;
  };

  const selectedRestaurant = rankedRestaurants.find(
    (r) => r.id === selectedMarker,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={
            coords
              ? {
                  latitude: coords.lat,
                  longitude: coords.lon,
                  latitudeDelta: LATITUDE_DELTA,
                  longitudeDelta: LONGITUDE_DELTA,
                }
              : undefined
          }
        >
          {/* User location */}
          {coords && (
            <Marker
              coordinate={{ latitude: coords.lat, longitude: coords.lon }}
              title="Your Location"
              pinColor={colors.accent}
            />
          )}

          {/* Restaurant markers */}
          {rankedRestaurants.map((restaurant) => (
            <Marker
              key={restaurant.id}
              coordinate={{
                latitude: restaurant.lat,
                longitude: restaurant.lon,
              }}
              title={restaurant.name}
              pinColor={getMarkerColor(restaurant.recommendationScore)}
              onPress={() => setSelectedMarker(restaurant.id)}
            >
              <View style={styles.markerBubble}>
                <Text style={styles.markerScore}>
                  {Math.round(restaurant.recommendationScore * 10) / 10}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Bottom card preview */}
      {selectedRestaurant && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHandle} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <View style={styles.previewCard}>
              <RestaurantCard
                restaurant={selectedRestaurant}
                onPress={() =>
                  navigation.navigate("Detail", {
                    restaurantId: selectedRestaurant.id,
                  })
                }
                showScore
              />
            </View>
          </ScrollView>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.successGreen }]}
          />
          <Text style={styles.legendText}>Excellent (80+)</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.accent }]}
          />
          <Text style={styles.legendText}>Good (60-80)</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.warningOrange },
            ]}
          />
          <Text style={styles.legendText}>Fair (&lt;60)</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  markerScore: {
    ...typography.bodySemibold,
    color: colors.background,
    fontSize: 12,
  },
  previewContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: 350,
  },
  previewHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  previewCard: {
    paddingRight: spacing.lg,
  },
  legend: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.caption,
    color: colors.textDark,
  },
});
