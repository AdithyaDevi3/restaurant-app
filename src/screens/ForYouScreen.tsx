import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAreaRecommendations } from '../hooks/useAreaRecommendations';
import { useLocation } from '../hooks/useLocation';
import { useAppStore } from '../store/useAppStore';
import { AreaRecommendationEngine } from '../algorithm/AreaRecommendationEngine';
import { RestaurantCard } from '../components/RestaurantCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { colors, spacing, typography, borderRadius } from '../theme';
import { AreaSearch } from '../components/AreaSearch';
import { SearchArea } from '../api/areaSearch';

export const ForYouScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const menuChoices = useAppStore((state) => state.menuChoices);
  const [scope, setScope] = useState('near-me');
  const [customArea, setCustomArea] = useState<SearchArea | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(3000);
  const location = useLocation(scope === 'near-me' && menuChoices.length > 0);
  const { recommendations, areas, loading, error, refresh } = useAreaRecommendations({
    coords: scope === 'near-me' ? location.coords : scope === 'custom' ? customArea : null,
    locationLabel: scope === 'custom' ? customArea?.label : 'Near you',
    areaId: scope === 'near-me' ? undefined : scope,
    radiusMeters,
  });
  const restaurants = recommendations.flatMap((entry) => entry.restaurants);
  const busy = loading || (scope === 'near-me' && location.loading);
  const locationError = scope === 'near-me' ? location.error : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />
      }>
        <Text style={styles.eyebrow}>YOUR NEXT GOOD MEAL</Text>
        <Text style={styles.title}>More of what you love.</Text>
        <Text style={styles.subtitle}>New restaurants nearby, inspired by the dishes you liked.</Text>
        {menuChoices.length === 0 ? (
          <View style={styles.panel}>
            <MaterialIcons name="favorite-border" size={40} color={colors.accent} />
            <Text style={styles.heading}>Start with a dish you loved</Text>
            <Text style={styles.body}>Add a restaurant and a favorite dish. We’ll use your taste to find new places to try.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => navigation.navigate('Visits', { screen: 'LogVisit' })}>
              <Text style={styles.buttonText}>Add a restaurant & dish</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.panel}>
              <Text style={styles.heading}>Where would you like to eat?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {[{ id: 'near-me', label: 'Near me' }, ...(customArea ? [{ id: 'custom', label: customArea.label }] : []), ...areas].map((area) => (
                  <TouchableOpacity key={area.id} accessibilityRole="button" accessibilityState={{ selected: scope === area.id }}
                    onPress={() => setScope(area.id)} style={[styles.chip, scope === area.id && styles.selected]}>
                    <Text style={[styles.chipText, scope === area.id && styles.selectedText]}>{area.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <AreaSearch onSelect={(area) => { setCustomArea(area); setScope('custom'); }} />
              <Text style={styles.label}>SEARCH RADIUS</Text>
              <View style={styles.chips}>
                {[1000, 3000, 5000].map((radius) => (
                  <TouchableOpacity key={radius} accessibilityRole="button" accessibilityState={{ selected: radiusMeters === radius }}
                    onPress={() => setRadiusMeters(radius)} style={[styles.chip, radiusMeters === radius && styles.selected]}>
                    <Text style={[styles.chipText, radiusMeters === radius && styles.selectedText]}>{radius / 1000} km</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>INSPIRED BY YOUR LIKED DISHES</Text>
              <Text style={styles.body}>{[...new Set(menuChoices.map((choice) => choice.itemName))].slice(0, 6).join(' · ')}</Text>
            </View>
            {locationError ? (
              <View style={styles.panel}>
                <Text style={styles.heading}>Choose a location</Text>
                <Text style={styles.body}>{locationError}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={location.refresh}>
                  <Text style={styles.buttonText}>Try my location again</Text>
                </TouchableOpacity>
              </View>
            ) : busy ? (
              <View accessibilityLabel="Finding restaurants" style={styles.panel}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.body}>Loading open restaurant data and checking menus… The first search in a new area can take a minute.</Text>
                <SkeletonLoader />
              </View>
            ) : error ? (
              <View style={styles.panel}>
                <Text style={styles.heading}>Couldn’t load suggestions</Text>
                <Text style={styles.body}>{error}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={refresh}><Text style={styles.buttonText}>Try again</Text></TouchableOpacity>
              </View>
            ) : restaurants.length === 0 ? (
              <View style={styles.panel}>
                <Text style={styles.heading}>No similar places found here yet</Text>
                <Text style={styles.body}>Try a wider radius or another area. Adding more liked dishes and restaurant ratings can also help.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.heading}>{restaurants.length} new places to try</Text>
                <Text style={styles.body}>Menu matches appear first. Cuisine suggestions have no confirmed dish match. Menus may change.</Text>
                {recommendations.map((entry) => entry.restaurants.map((restaurant) => (
                  <View key={restaurant.id} style={styles.result}>
                    <Text style={styles.badge}>{restaurant.matchKind === 'menu' ? 'MENU DISH MATCH' : restaurant.matchKind === 'cuisine' ? 'SIMILAR CUISINE' : 'FOOD KEYWORD MATCH'}</Text>
                    <RestaurantCard restaurant={restaurant} reasons={AreaRecommendationEngine.explain(restaurant, entry.area)}
                      onPress={() => navigation.navigate('Detail', { restaurantId: restaurant.id, restaurant })} />
                  </View>
                )))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  page: { width: '100%', maxWidth: 840, alignSelf: 'center', padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  eyebrow: { ...typography.captionSemibold, color: colors.accent, letterSpacing: 2, marginTop: spacing.xl },
  title: { ...typography.heading1, color: colors.text },
  subtitle: { ...typography.body, color: colors.disabledGray, marginBottom: spacing.md },
  panel: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255,255,255,0.06)', gap: spacing.md },
  heading: { ...typography.heading3, color: colors.text },
  body: { ...typography.body, color: colors.disabledGray },
  label: { ...typography.captionSemibold, color: colors.disabledGray, marginTop: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.disabledGray, borderRadius: 24, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...typography.bodySemibold, color: colors.text },
  selectedText: { color: colors.background },
  button: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  buttonText: { ...typography.bodySemibold, color: colors.background },
  result: { gap: spacing.sm, marginTop: spacing.md },
  badge: { ...typography.captionSemibold, color: colors.accent, letterSpacing: 1 },
});
