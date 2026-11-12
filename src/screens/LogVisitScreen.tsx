import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useLocation } from '../hooks/useLocation';
import { useRestaurants } from '../hooks/useRestaurants';
import { Restaurant, VisitRecord } from '../types';
import { AreaSearch } from '../components/AreaSearch';
import { PlaceAttribution } from '../components/PlaceAttribution';
import { SearchArea } from '../api/areaSearch';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface LogVisitScreenProps {
  navigation: any;
}

export const LogVisitScreen: React.FC<LogVisitScreenProps> = ({ navigation }) => {
  const location = useLocation();
  const [chosenArea, setChosenArea] = useState<SearchArea | null>(null);
  const coords = chosenArea ?? location.coords;
  const { restaurants, loading, error: restaurantError } = useRestaurants({
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
    radiusMeters: 3000,
  });
  const addVisit = useAppStore((state) => state.addVisit);
  const saveRestaurantMenu = useAppStore((state) => state.saveRestaurantMenu);
  const toggleMenuItemChoice = useAppStore((state) => state.toggleMenuItemChoice);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [manualName, setManualName] = useState('');
  const [rating, setRating] = useState(0);
  const [likedDishes, setLikedDishes] = useState('');
  const [manualCuisine, setManualCuisine] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!query.trim()) return restaurants.slice(0, 15);
    const lower = query.toLowerCase();
    return restaurants.filter((r) => r.name.toLowerCase().includes(lower)).slice(0, 15);
  }, [query, restaurants]);

  const canSave = (selected || (manualName.trim().length > 1 && coords)) && rating > 0;

  const handleSave = () => {
    if (!canSave) return;

    const timestamp = Date.now();
    const dishes = [...new Set(likedDishes.split(/\n|,/).map((dish) => dish.trim()).filter(Boolean))].slice(0, 20);
    const visit: VisitRecord = {
      restaurantId: selected?.id ?? `manual-${timestamp}`,
      restaurantName: selected?.name ?? manualName.trim(),
      cuisines: selected?.cuisine ?? manualCuisine.split(',').map((cuisine) => cuisine.trim()).filter(Boolean),
      rating, timestamp, lat: selected?.lat ?? coords!.lat, lon: selected?.lon ?? coords!.lon,
      menuLogged: dishes.length > 0,
    };
    try {
      if (dishes.length) {
        const existingMenu = useAppStore.getState().restaurantMenus[visit.restaurantId];
        const items = dishes.map((name, index) => existingMenu?.items.find((item) => item.name.toLowerCase() === name.toLowerCase())
          ?? { id: `liked-${timestamp}-${index}`, name });
        saveRestaurantMenu({ restaurantId: visit.restaurantId, sourceUrl: existingMenu?.sourceUrl ?? 'manual',
          lastSyncedAt: timestamp, items: [...(existingMenu?.items ?? []), ...items.filter((item) => !existingMenu?.items.some((old) => old.id === item.id))] });
        for (const item of items) {
          if (!useAppStore.getState().menuChoices.some((choice) => choice.restaurantId === visit.restaurantId && choice.itemId === item.id)) {
            toggleMenuItemChoice({ restaurantId: visit.restaurantId, restaurantName: visit.restaurantName, itemId: item.id, itemName: item.name, createdAt: timestamp });
          }
        }
      }
      addVisit(visit);
      navigation.replace('VisitMenu', { visit });
    } catch { setSaveError('Could not save. Your browser or device storage may be full.'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Log a Visit</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color={colors.disabledGray} />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSelected(null);
          }}
          placeholder="Search nearby restaurants"
          placeholderTextColor={colors.disabledGray}
          style={styles.searchInput}
        />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <AreaSearch onSelect={(area) => { setChosenArea(area); setSelected(null); }} />
        <Text style={styles.emptyText}>{chosenArea ? `Searching around ${chosenArea.label}` : location.error ?? 'Nearby restaurants use your current location.'}</Text>
      </View>
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<View>
            {loading || (location.loading && !chosenArea) ? <ActivityIndicator color={colors.accent} /> : null}
            <PlaceAttribution restaurant={matches[0]} />
          </View>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultRow, selected?.id === item.id && styles.resultRowSelected]}
              onPress={() => {
                setSelected(item);
                setManualName('');
              }}
            >
              <MaterialIcons
                name={selected?.id === item.id ? 'check-circle' : 'restaurant'}
                size={20}
                color={selected?.id === item.id ? colors.successGreen : colors.accent}
              />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultMeta}>
                  {item.cuisine.join(', ')} · {(item.distance / 1000).toFixed(1)} km away
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{restaurantError && coords ? 'Restaurant search is unavailable — you can still add a restaurant manually.' : loading ? '' : 'No nearby matches — add it manually below.'}</Text>
          }
          ListFooterComponent={
            <View style={styles.manualBox}>
              <Text style={styles.sectionLabel}>Can't find it? Add manually</Text>
              <TextInput
                value={manualName}
                onChangeText={(text) => {
                  setManualName(text);
                  if (text.trim()) setSelected(null);
                }}
                placeholder="Restaurant name (uses your selected area)"
                placeholderTextColor={colors.disabledGray}
                style={styles.manualInput}
              />

              {!selected ? <TextInput value={manualCuisine} onChangeText={setManualCuisine}
                accessibilityLabel="Cuisine" placeholder="Cuisine, e.g. Italian (optional)" placeholderTextColor={colors.disabledGray} style={[styles.manualInput, { marginTop: spacing.sm }]} /> : null}
              <Text style={styles.sectionLabel}>Dishes you liked</Text>
              <TextInput value={likedDishes} onChangeText={setLikedDishes} accessibilityLabel="Dishes you liked"
                placeholder="Truffle carbonara, margherita pizza…" placeholderTextColor={colors.disabledGray}
                multiline maxLength={1000} style={styles.manualInput} />
              <Text style={styles.emptyText}>Separate dishes with commas or new lines. These are saved as liked dishes.</Text>

              <Text style={styles.sectionLabel}>Your rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} accessibilityRole="button" accessibilityLabel={`Rate ${star} stars`} onPress={() => setRating(star)}>
                    <MaterialIcons
                      name={star <= rating ? 'star' : 'star-border'}
                      size={36}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save Visit</Text>
              </TouchableOpacity>
              {saveError ? <Text style={styles.emptyText}>{saveError}</Text> : null}
              {!coords && !selected ? <Text style={styles.emptyText}>Choose a city or neighborhood above to save the restaurant’s area.</Text> : null}
            </View>
          }
        />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: {
    ...typography.heading3,
    color: colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    padding: spacing.md,
  },
  list: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  resultRowSelected: {
    backgroundColor: 'rgba(76,175,80,0.15)',
  },
  resultName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  emptyText: {
    ...typography.body,
    color: colors.disabledGray,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  manualBox: {
    marginTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.captionSemibold,
    color: colors.disabledGray,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  manualInput: {
    color: colors.text,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    ...typography.bodySemibold,
    color: colors.background,
  },
});
