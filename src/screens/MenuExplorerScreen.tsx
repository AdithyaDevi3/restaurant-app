import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import { recommendFromMenuContext } from '../api/menuRecommendations';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface MenuExplorerScreenProps {
  navigation: any;
}

export const MenuExplorerScreen: React.FC<MenuExplorerScreenProps> = ({ navigation }) => {
  const { coords } = useLocation();
  const { restaurants } = useRestaurants({
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
  });

  const restaurantMenus = useAppStore((state) => state.restaurantMenus);
  const menuChoices = useAppStore((state) => state.menuChoices);

  const [query, setQuery] = useState('');

  const menuEntries = useMemo(() => {
    const restaurantsWithMenus = Object.values(restaurantMenus);

    return restaurantsWithMenus
      .map((menu) => {
        const sourceRestaurant = restaurants.find((restaurant) => restaurant.id === menu.restaurantId);
        if (!sourceRestaurant) return null;

        const selectedChoices = menuChoices.filter((choice) => choice.restaurantId === menu.restaurantId);
        const recommendation = recommendFromMenuContext({
          restaurant: sourceRestaurant,
          candidateRestaurants: restaurants,
          menuItems: menu.items,
          selectedChoices,
        });

        return {
          sourceRestaurant,
          menu,
          recommendation,
        };
      })
      .filter(Boolean)
      .filter((entry) => {
        if (!query.trim()) return true;
        const lowerQuery = query.toLowerCase();
        return (
          entry!.sourceRestaurant.name.toLowerCase().includes(lowerQuery) ||
          entry!.menu.items.some((item) => item.name.toLowerCase().includes(lowerQuery)) ||
          entry!.recommendation.similarRestaurants.some((item) => item.restaurant.name.toLowerCase().includes(lowerQuery)) ||
          entry!.recommendation.itemAvailability.some((itemEntry) => itemEntry.itemName.toLowerCase().includes(lowerQuery)) ||
          entry!.recommendation.recommendedItems.some((item) => item.item.name.toLowerCase().includes(lowerQuery))
        );
      });
  }, [menuChoices, query, restaurantMenus, restaurants]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu Explorer</Text>
          <Text style={styles.subtitle}>Search imported menus, item matches, and similar restaurants.</Text>
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.disabledGray} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search restaurant, item, or match"
            placeholderTextColor={colors.disabledGray}
            style={styles.searchInput}
          />
        </View>

        {menuEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="restaurant-menu" size={48} color={colors.accent} />
            <Text style={styles.emptyTitle}>No imported menus yet</Text>
            <Text style={styles.emptyText}>
              Open a restaurant detail page, paste a menu URL, and import items to see them here.
            </Text>
          </View>
        ) : (
          menuEntries.map((entry) => (
            <View key={entry.menu.restaurantId} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Detail', {
                    restaurantId: entry.menu.restaurantId,
                  })
                }
              >
                <Text style={styles.cardTitle}>{entry.sourceRestaurant.name}</Text>
                <Text style={styles.cardMeta}>{entry.menu.items.length} imported items</Text>
              </TouchableOpacity>

              {entry.menu.items.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recommended items from this menu</Text>
                  <View style={styles.pillRow}>
                    {entry.recommendation.recommendedItems.slice(0, 6).map((recommended) => (
                      <View key={recommended.item.id} style={styles.itemCard}>
                        <Text style={styles.pillText}>{recommended.item.name}</Text>
                        {recommended.reasons.length > 0 ? (
                          <Text style={styles.itemReason}>{recommended.reasons[0]}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {entry.recommendation.similarRestaurants.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Similar restaurants</Text>
                  {entry.recommendation.similarRestaurants.slice(0, 3).map((match) => (
                    <TouchableOpacity
                      key={match.restaurant.id}
                      style={styles.resultRow}
                      onPress={() =>
                        navigation.navigate('Detail', {
                          restaurantId: match.restaurant.id,
                        })
                      }
                    >
                      <View style={styles.resultTextWrap}>
                        <Text style={styles.resultName}>{match.restaurant.name}</Text>
                        <Text style={styles.resultMeta}>{match.matchedReasons?.[0] ?? 'Similar menu profile'}</Text>
                      </View>
                      <Text style={styles.scoreText}>{match.score.toFixed(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {entry.recommendation.itemAvailability.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Where selected items appear</Text>
                  {entry.recommendation.itemAvailability.slice(0, 4).map((itemEntry) => (
                    <View key={itemEntry.itemName} style={styles.availabilityCard}>
                      <Text style={styles.availabilityName}>{itemEntry.itemName}</Text>
                      {itemEntry.restaurants.slice(0, 3).map((match) => (
                        <View key={match.restaurant.id} style={styles.availabilityMatchRow}>
                          <View style={styles.availabilityMatchTextWrap}>
                            <Text style={styles.availabilityRestaurantName}>{match.restaurant.name}</Text>
                            <Text style={styles.availabilityMeta}>
                              {match.reasons[0] ?? 'Likely serves a similar item'}
                            </Text>
                          </View>
                          <Text style={styles.availabilityScore}>{match.score.toFixed(1)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.disabledGray,
  },
  searchBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textDark,
    ...typography.body,
  },
  emptyState: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.textDark,
  },
  emptyText: {
    ...typography.body,
    color: colors.disabledGray,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.heading3,
    color: colors.textDark,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.textDark,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  itemCard: {
    flexBasis: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    gap: 4,
  },
  pillText: {
    ...typography.caption,
    color: colors.text,
  },
  itemReason: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  resultName: {
    ...typography.bodySemibold,
    color: colors.textDark,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  scoreText: {
    ...typography.bodySemibold,
    color: colors.accent,
  },
  availabilityCard: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    gap: 2,
  },
  availabilityName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  availabilityMatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  availabilityMatchTextWrap: {
    flex: 1,
  },
  availabilityRestaurantName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  availabilityMeta: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  availabilityScore: {
    ...typography.bodySemibold,
    color: colors.accent,
  },
});