import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppStore } from "../store/useAppStore";
import { useRestaurants } from "../hooks/useRestaurants";
import { useLocation } from "../hooks/useLocation";
import { importRestaurantMenu } from "../api/menuImport";
import { recommendFromMenuContext } from "../api/menuRecommendations";
import { ScoredRestaurant } from "../types";
import { RatingStars } from "../components/RatingStars";
import { CategoryPill } from "../components/CategoryPill";
import { colors, spacing, typography, borderRadius, shadows } from "../theme";

interface DetailScreenProps {
  navigation: any;
  route: {
    params: {
      restaurantId: string;
    };
  };
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { restaurantId } = route.params;
  const { coords } = useLocation();
  const { restaurants } = useRestaurants({
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
  });
  const addVisit = useAppStore((state) => state.addVisit);
  const saveRestaurantMenu = useAppStore((state) => state.saveRestaurantMenu);
  const toggleMenuItemChoice = useAppStore((state) => state.toggleMenuItemChoice);
  const restaurantMenus = useAppStore((state) => state.restaurantMenus);
  const menuChoices = useAppStore((state) => state.menuChoices);

  const [ratingModal, setRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [menuUrlModal, setMenuUrlModal] = useState(false);
  const [menuUrl, setMenuUrl] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const restaurant = restaurants.find(
    (r) => r.id === restaurantId,
  ) as ScoredRestaurant;
  const storedMenu = restaurantMenus[restaurantId];
  const selectedItems = menuChoices.filter((choice) => choice.restaurantId === restaurantId);
  const menuItems = storedMenu?.items ?? [];

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Restaurant not found</Text>
      </SafeAreaView>
    );
  }

  const distanceKm = (restaurant.distance / 1000).toFixed(1);

  const handleVisit = () => {
    addVisit({
      restaurantId: restaurant.id,
      cuisines: restaurant.cuisine,
      rating: selectedRating,
      timestamp: Date.now(),
    });
    setRatingModal(false);
    setSelectedRating(0);
    navigation.goBack();
  };

  const handleDirections = () => {
    const url = `maps://0,0?q=${restaurant.lat},${restaurant.lon}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://maps.google.com/?q=${restaurant.lat},${restaurant.lon}`,
      );
    });
  };

  const handleImportMenu = async () => {
    if (!menuUrl.trim()) {
      setMenuError("Enter a menu URL first");
      return;
    }

    setMenuLoading(true);
    setMenuError(null);

    try {
      const menu = await importRestaurantMenu(restaurant.id, menuUrl.trim());
      saveRestaurantMenu(menu);
      setMenuUrlModal(false);
      setMenuUrl("");
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : "Failed to import menu");
    } finally {
      setMenuLoading(false);
    }
  };

  const menuRecommendation = recommendFromMenuContext({
    restaurant,
    candidateRestaurants: restaurants,
    menuItems,
    selectedChoices: selectedItems,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialIcons
              name="favorite-border"
              size={24}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Image */}
        {restaurant.photoUrl ? (
          <Image source={{ uri: restaurant.photoUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <MaterialIcons name="restaurant" size={64} color={colors.accent} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Title and rating */}
          <Text style={styles.title}>{restaurant.name}</Text>
          <View style={styles.ratingContainer}>
            <RatingStars rating={restaurant.rating} size={18} />
            <Text style={styles.ratingText}>
              {restaurant.rating.toFixed(1)}
            </Text>
            <Text style={styles.reviewsText}>
              ({restaurant.reviewCount} reviews)
            </Text>
          </View>

          {/* Score breakdown */}
          <View style={styles.scoreBreakdown}>
            <Text style={styles.scoreTitle}>
              Recommendation Score: {restaurant.recommendationScore}
            </Text>
            <View style={styles.scoreBar}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreName}>Proximity</Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${restaurant.scoreBreakdown.proximityScore * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreName}>Rating</Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${restaurant.scoreBreakdown.ratingScore * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreName}>Preference</Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${restaurant.scoreBreakdown.preferenceScore * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreName}>Novelty</Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${restaurant.scoreBreakdown.noveltyScore * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreName}>Price Match</Text>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${restaurant.scoreBreakdown.priceScore * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.infoText}>{distanceKm} km</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons
                name="attach-money"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.infoText}>
                {"$".repeat(restaurant.priceLevel)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons
                name="schedule"
                size={20}
                color={
                  restaurant.openNow ? colors.successGreen : colors.errorRed
                }
              />
              <Text
                style={[
                  styles.infoText,
                  {
                    color: restaurant.openNow
                      ? colors.successGreen
                      : colors.errorRed,
                  },
                ]}
              >
                {restaurant.openNow ? "Open" : "Closed"}
              </Text>
            </View>
          </View>

          {/* Cuisines */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuisines</Text>
            <View style={styles.cuisinesContainer}>
              {restaurant.cuisine.map((c, i) => (
                <CategoryPill key={i} label={c} disabled selected={false} />
              ))}
            </View>
          </View>

          {/* Tags */}
          {restaurant.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.tagsContainer}>
                {restaurant.tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={colors.successGreen}
                    />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Menu Items</Text>
              <TouchableOpacity onPress={() => setMenuUrlModal(true)}>
                <Text style={styles.linkText}>{storedMenu ? "Update URL" : "Add Menu URL"}</Text>
              </TouchableOpacity>
            </View>

            {storedMenu ? (
              <View style={styles.menuPanel}>
                <Text style={styles.menuMetaText}>Imported from {storedMenu.sourceUrl}</Text>
                <Text style={styles.menuMetaText}>Tap items to mark what you ordered.</Text>

                {menuItems.length > 0 ? (
                  menuItems.map((item) => {
                    const checked = selectedItems.some((choice) => choice.itemId === item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.menuItemRow, checked && styles.menuItemRowSelected]}
                        onPress={() =>
                          toggleMenuItemChoice({
                            restaurantId: restaurant.id,
                            itemId: item.id,
                            itemName: item.name,
                            restaurantName: restaurant.name,
                            createdAt: Date.now(),
                          })
                        }
                      >
                        <View style={styles.menuItemTextWrap}>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          {item.description ? (
                            <Text style={styles.menuItemDescription}>{item.description}</Text>
                          ) : null}
                        </View>
                        <MaterialIcons
                          name={checked ? "check-circle" : "radio-button-unchecked"}
                          size={22}
                          color={checked ? colors.successGreen : colors.border}
                        />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.menuMetaText}>No menu items found in that URL.</Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyMenuText}>
                Add a restaurant menu URL to import items and mark what you ordered.
              </Text>
            )}
          </View>

          {selectedItems.length > 0 && menuRecommendation.similarRestaurants.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Similar restaurant options</Text>
              {menuRecommendation.similarRestaurants.map(({ restaurant: related, matchedReasons }) => (
                <View key={related.id} style={styles.relatedCard}>
                  <Text style={styles.relatedName}>{related.name}</Text>
                  <Text style={styles.relatedMeta}>{related.cuisine.join(" • ")}</Text>
                  <Text style={styles.relatedMeta}>{(related.distance / 1000).toFixed(1)} km away</Text>
                  {matchedReasons.length > 0 ? (
                    <Text style={styles.relatedReason}>{matchedReasons[0]}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {selectedItems.length > 0 && menuRecommendation.itemAvailability.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Where these menu items show up</Text>
              {menuRecommendation.itemAvailability.map((entry) => (
                <View key={entry.itemName} style={styles.relatedCard}>
                  <Text style={styles.relatedName}>{entry.itemName}</Text>
                  <Text style={styles.relatedMeta}>
                    Served at: {entry.restaurants.map((item) => item.name).slice(0, 3).join(", ")}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.directionButton}
            onPress={handleDirections}
          >
            <MaterialIcons name="directions" size={20} color={colors.text} />
            <Text style={styles.directionButtonText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.visitButton}
            onPress={() => setRatingModal(true)}
          >
            <MaterialIcons
              name="check-circle"
              size={20}
              color={colors.accent}
            />
            <Text style={styles.visitButtonText}>I've Been Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={ratingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How was it?</Text>
            <Text style={styles.modalSubtitle}>Rate your experience</Text>

            <View style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    selectedRating === rating && styles.ratingButtonSelected,
                  ]}
                  onPress={() => setSelectedRating(rating)}
                >
                  <MaterialIcons
                    name="star"
                    size={32}
                    color={
                      selectedRating === rating ? colors.accent : colors.border
                    }
                  />
                  <Text style={styles.ratingButtonLabel}>{rating}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedRating === 0 && styles.disabledButton,
                ]}
                onPress={handleVisit}
                disabled={selectedRating === 0}
              >
                <Text style={styles.confirmButtonText}>Save Visit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={menuUrlModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Menu URL</Text>
            <Text style={styles.modalSubtitle}>
              Paste a menu page or JSON endpoint so we can import items.
            </Text>

            <TextInput
              value={menuUrl}
              onChangeText={setMenuUrl}
              placeholder="https://restaurant.com/menu"
              placeholderTextColor={colors.border}
              style={styles.urlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {menuError ? <Text style={styles.menuError}>{menuError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setMenuUrlModal(false)}
                disabled={menuLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleImportMenu}
                disabled={menuLoading}
              >
                {menuLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.confirmButtonText}>Import Menu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  image: {
    width: "100%",
    height: 250,
    backgroundColor: colors.skeletonGray,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.border,
  },
  content: {
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  title: {
    ...typography.heading1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ratingText: {
    ...typography.bodySemibold,
    color: colors.text,
    fontSize: 16,
  },
  reviewsText: {
    ...typography.body,
    color: colors.disabledGray,
  },
  scoreBreakdown: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scoreTitle: {
    ...typography.bodySemibold,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  scoreBar: {
    gap: spacing.md,
  },
  scoreItem: {
    gap: spacing.sm,
  },
  scoreName: {
    ...typography.caption,
    color: colors.textDark,
  },
  scoreBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
  },
  infoItem: {
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySemibold,
    color: colors.textDark,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  linkText: {
    ...typography.bodySemibold,
    color: colors.accent,
  },
  cuisinesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tagsContainer: {
    gap: spacing.sm,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tagText: {
    ...typography.body,
    color: colors.text,
    textTransform: "capitalize",
  },
  menuPanel: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  menuMetaText: {
    ...typography.bodySmall,
    color: colors.disabledGray,
  },
  menuItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemRowSelected: {
    backgroundColor: "rgba(245, 166, 35, 0.12)",
  },
  menuItemTextWrap: {
    flex: 1,
    gap: 2,
  },
  menuItemName: {
    ...typography.bodySemibold,
    color: colors.textDark,
  },
  menuItemDescription: {
    ...typography.bodySmall,
    color: colors.disabledGray,
  },
  emptyMenuText: {
    ...typography.bodySmall,
    color: colors.disabledGray,
  },
  relatedCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  relatedName: {
    ...typography.bodySemibold,
    color: colors.textDark,
    marginBottom: 2,
  },
  relatedMeta: {
    ...typography.bodySmall,
    color: colors.disabledGray,
  },
  relatedReason: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 4,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textDark,
    backgroundColor: colors.cardBackground,
  },
  menuError: {
    ...typography.bodySmall,
    color: colors.errorRed,
  },
  directionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  directionButtonText: {
    ...typography.bodySemibold,
    color: colors.text,
    fontSize: 16,
  },
  visitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  visitButtonText: {
    ...typography.bodySemibold,
    color: colors.accent,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.heading2,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.disabledGray,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  ratingButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
  },
  ratingButton: {
    alignItems: "center",
    gap: spacing.xs,
  },
  ratingButtonSelected: {
    transform: [{ scale: 1.1 }],
  },
  ratingButtonLabel: {
    ...typography.caption,
    color: colors.textDark,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.bodySemibold,
    color: colors.textDark,
    textAlign: "center",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  confirmButtonText: {
    ...typography.bodySemibold,
    color: colors.text,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
