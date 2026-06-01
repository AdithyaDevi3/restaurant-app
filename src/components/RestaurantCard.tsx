import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScoredRestaurant } from "../types";
import { RecommendationEngine } from "../algorithm/RecommendationEngine";
import { RatingStars } from "./RatingStars";
import { CategoryPill } from "./CategoryPill";
import { colors, spacing, borderRadius, typography, shadows } from "../theme";

interface RestaurantCardProps {
  restaurant: ScoredRestaurant;
  onPress?: () => void;
  showScore?: boolean;
}

const { width } = Dimensions.get("window");
const cardWidth = width - spacing.lg * 2;

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
  showScore = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const reasons = RecommendationEngine.explainScore(restaurant);

  const distanceKm = (restaurant.distance / 1000).toFixed(1);

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Header */}
      <View style={styles.imageContainer}>
        {restaurant.photoUrl ? (
          <Image source={{ uri: restaurant.photoUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <MaterialIcons name="restaurant" size={48} color={colors.accent} />
          </View>
        )}

        {/* Score Badge */}
        {showScore && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              {Math.round(restaurant.recommendationScore * 10) / 10}
            </Text>
          </View>
        )}

        {/* Gradient Overlay */}
        <View style={styles.overlay} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <View style={styles.ratingRow}>
              <RatingStars rating={restaurant.rating} size={14} />
              <Text style={styles.reviewCount}>
                {restaurant.reviewCount} reviews
              </Text>
            </View>
          </View>
        </View>

        {/* Cuisines */}
        <View style={styles.cuisinesContainer}>
          {restaurant.cuisine.slice(0, 2).map((c, i) => (
            <CategoryPill
              key={i}
              label={c}
              selected={false}
              disabled
              style={styles.cuisinePill}
            />
          ))}
          {restaurant.cuisine.length > 2 && (
            <Text style={styles.moreText}>
              +{restaurant.cuisine.length - 2}
            </Text>
          )}
        </View>

        {/* Distance and Price */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="location-on" size={14} color={colors.accent} />
            <Text style={styles.metaText}>{distanceKm} km away</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.priceLevel}>
              {"$".repeat(restaurant.priceLevel)}
            </Text>
          </View>
        </View>

        {/* Recommendation Reasons */}
        <TouchableOpacity
          style={styles.reasonsButton}
          onPress={() => setExpanded(!expanded)}
        >
          <View style={styles.reasonsContent}>
            <MaterialIcons
              name="lightbulb"
              size={14}
              color={colors.accent}
              style={styles.bulbIcon}
            />
            <Text style={styles.reasonsText}>
              {reasons[0]}
              {reasons.length > 1 ? ` · ${reasons.length - 1} more` : ""}
            </Text>
          </View>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={18}
            color={colors.accent}
          />
        </TouchableOpacity>

        {/* Expanded Reasons */}
        {expanded && (
          <View style={styles.expandedReasons}>
            {reasons.map((reason, i) => (
              <Text key={i} style={styles.reasonItem}>
                • {reason}
              </Text>
            ))}
          </View>
        )}

        {/* Tags */}
        {restaurant.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {restaurant.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadows.md,
  },
  imageContainer: {
    position: "relative",
    height: 180,
    backgroundColor: colors.skeletonGray,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.border,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  } as any,
  scoreBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.lg,
  },
  scoreText: {
    ...typography.bodySemibold,
    color: colors.background,
    fontSize: 16,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.heading3,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  reviewCount: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  cuisinesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cuisinePill: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  moreText: {
    ...typography.caption,
    color: colors.disabledGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    ...typography.body,
    color: colors.textDark,
  },
  priceLevel: {
    ...typography.bodySemibold,
    color: colors.accent,
    fontSize: 16,
  },
  reasonsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#FFF8F0",
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  reasonsContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bulbIcon: {
    marginRight: spacing.sm,
  },
  reasonsText: {
    ...typography.bodySemibold,
    color: colors.textDark,
    flex: 1,
  },
  expandedReasons: {
    backgroundColor: "#FFF8F0",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reasonItem: {
    ...typography.body,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagText: {
    ...typography.caption,
    color: colors.text,
    textTransform: "capitalize",
  },
});
