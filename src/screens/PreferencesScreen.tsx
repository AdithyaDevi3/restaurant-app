import { appAlert } from '../api/appAlert';
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppStore } from "../store/useAppStore";
import { CategoryPill } from "../components/CategoryPill";
import { colors, spacing, typography, borderRadius, shadows } from "../theme";
import { createBackupPayload, mergeBackupData } from "../algorithm/DataBackup";
import { pickBackupFile, shareBackupFile } from "../api/dataBackupFiles";

interface PreferencesScreenProps {
  navigation: any;
}

const ALL_CUISINES = [
  "Italian",
  "Japanese",
  "Mexican",
  "Thai",
  "Chinese",
  "Indian",
  "French",
  "Mediterranean",
  "Korean",
  "Vietnamese",
  "Spanish",
  "Portuguese",
];

const DIETARY_RESTRICTIONS = [
  "Vegan",
  "Vegetarian",
  "Gluten-free",
  "Halal",
  "Kosher",
];

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({
  navigation,
}) => {
  const preferences = useAppStore((state) => state.preferences);
  const setPreferences = useAppStore((state) => state.setPreferences);
  const restaurantMenus = useAppStore((state) => state.restaurantMenus);
  const menuChoices = useAppStore((state) => state.menuChoices);
  const restoreData = useAppStore((state) => state.restoreData);
  const [backupAction, setBackupAction] = useState<"export" | "import" | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setBackupAction("export");
    setBackupStatus(null);
    try {
      await shareBackupFile(createBackupPayload({ preferences, restaurantMenus, menuChoices }));
      setBackupStatus("Backup ready to share. Visit photos are not included.");
    } catch (error) {
      appAlert("Export failed", error instanceof Error ? error.message : "Could not export data.");
    } finally {
      setBackupAction(null);
    }
  };

  const handleImport = async () => {
    setBackupAction("import");
    setBackupStatus(null);
    try {
      const backup = await pickBackupFile();
      if (!backup) return;

      const merged = mergeBackupData({ preferences, restaurantMenus, menuChoices }, backup);
      appAlert(
        "Import backup?",
        `This will merge ${backup.preferences.visitHistory.length} visits and ${Object.keys(backup.restaurantMenus).length} menus with data already on this device. Visit photos are not included.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            onPress: () => {
              restoreData(merged);
              setBackupStatus(`Imported ${backup.preferences.visitHistory.length} visits.`);
            },
          },
        ],
      );
    } catch (error) {
      appAlert("Import failed", error instanceof Error ? error.message : "Could not import data.");
    } finally {
      setBackupAction(null);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    const updated = preferences.favoriteCuisines.includes(cuisine)
      ? preferences.favoriteCuisines.filter((c) => c !== cuisine)
      : [...preferences.favoriteCuisines, cuisine];
    setPreferences({ favoriteCuisines: updated });
  };

  const toggleAvoidCuisine = (cuisine: string) => {
    const updated = preferences.avoidCuisines.includes(cuisine)
      ? preferences.avoidCuisines.filter((c) => c !== cuisine)
      : [...preferences.avoidCuisines, cuisine];
    setPreferences({ avoidCuisines: updated });
  };

  const toggleDietary = (restriction: string) => {
    const updated = preferences.dietaryRestrictions.includes(
      restriction.toLowerCase(),
    )
      ? preferences.dietaryRestrictions.filter(
          (d) => d !== restriction.toLowerCase(),
        )
      : [...preferences.dietaryRestrictions, restriction.toLowerCase()];
    setPreferences({ dietaryRestrictions: updated });
  };

  const handleDistanceChange = (value: number) => {
    setPreferences({ maxDistance: Math.round(value) });
  };

  const handlePriceChange = (which: "min" | "max", value: number) => {
    const [min, max] = preferences.priceRange;
    if (which === "min") {
      setPreferences({
        priceRange: [Math.max(1, value), max] as [number, number],
      });
    } else {
      setPreferences({
        priceRange: [min, Math.min(4, value)] as [number, number],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Your Preferences</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Favorite Cuisines */}
        <Section title="Favorite Cuisines">
          <View style={styles.cuisineGrid}>
            {ALL_CUISINES.map((cuisine) => (
              <CategoryPill
                key={cuisine}
                label={cuisine}
                selected={preferences.favoriteCuisines.includes(cuisine)}
                onPress={() => toggleCuisine(cuisine)}
                style={styles.cuisinePill}
              />
            ))}
          </View>
        </Section>

        {/* Cuisines to Avoid */}
        <Section title="Cuisines to Avoid">
          <View style={styles.cuisineGrid}>
            {ALL_CUISINES.map((cuisine) => (
              <CategoryPill
                key={`avoid-${cuisine}`}
                label={cuisine}
                selected={preferences.avoidCuisines.includes(cuisine)}
                onPress={() => toggleAvoidCuisine(cuisine)}
                style={styles.cuisinePill}
              />
            ))}
          </View>
        </Section>

        {/* Distance */}
        <Section title="Explore Search Distance">
          <Text style={styles.sliderCaption}>
            Only affects the Explore tab. For You recommendations use the area around each
            visit you've logged.
          </Text>
          <Text style={styles.sliderValue}>
            {(preferences.maxDistance / 1000).toFixed(1)} km
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={5000}
            step={100}
            value={preferences.maxDistance}
            onValueChange={handleDistanceChange}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0.5 km</Text>
            <Text style={styles.sliderLabel}>5 km</Text>
          </View>
        </Section>

        {/* Price Range */}
        <Section title="Price Range">
          <View style={styles.priceContainer}>
            <View style={styles.priceSlider}>
              <Text style={styles.priceLabel}>
                Minimum: {"$".repeat(preferences.priceRange[0])}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={4}
                step={1}
                value={preferences.priceRange[0]}
                onValueChange={(v: number) => handlePriceChange("min", v)}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
            </View>

            <View style={styles.priceSlider}>
              <Text style={styles.priceLabel}>
                Maximum: {"$".repeat(preferences.priceRange[1])}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={4}
                step={1}
                value={preferences.priceRange[1]}
                onValueChange={(v: number) => handlePriceChange("max", v)}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
            </View>
          </View>
        </Section>

        {/* Dietary Restrictions */}
        <Section title="Dietary Restrictions">
          <View style={styles.dietaryContainer}>
            {DIETARY_RESTRICTIONS.map((restriction) => (
              <TouchableOpacity
                key={restriction}
                style={[
                  styles.dietaryItem,
                  preferences.dietaryRestrictions.includes(
                    restriction.toLowerCase(),
                  ) && styles.dietaryItemSelected,
                ]}
                onPress={() => toggleDietary(restriction)}
              >
                <MaterialIcons
                  name={
                    preferences.dietaryRestrictions.includes(
                      restriction.toLowerCase(),
                    )
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={20}
                  color={
                    preferences.dietaryRestrictions.includes(
                      restriction.toLowerCase(),
                    )
                      ? colors.accent
                      : colors.border
                  }
                />
                <Text
                  style={[
                    styles.dietaryText,
                    preferences.dietaryRestrictions.includes(
                      restriction.toLowerCase(),
                    ) && styles.dietaryTextSelected,
                  ]}
                >
                  {restriction}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Visit History */}
        <Section title="Visit History">
          <View style={styles.historyContainer}>
            <Text style={styles.historyCount}>
              {preferences.visitHistory.length} restaurants visited
            </Text>
            {preferences.visitHistory.length > 0 && (
              <View style={styles.historyPreview}>
                {preferences.visitHistory.slice(0, 5).map((visit, i) => (
                  <View key={i} style={styles.historyItem}>
                    <View style={styles.historyRating}>
                      {[...Array(5)].map((_, j) => (
                        <MaterialIcons
                          key={j}
                          name={j < visit.rating ? "star" : "star-outline"}
                          size={12}
                          color={
                            j < visit.rating ? colors.accent : colors.border
                          }
                        />
                      ))}
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(visit.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Section>

        <Section title="Backup & Restore">
          <Text style={styles.backupDescription}>
            Export visits, preferences, menus, notes, and liked dishes as JSON. Photos stay on this
            device and are not included in backups.
          </Text>
          <View style={styles.backupActions}>
            <TouchableOpacity
              style={styles.backupButton}
              onPress={handleExport}
              disabled={backupAction !== null}
            >
              {backupAction === "export" ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <MaterialIcons name="ios-share" size={20} color={colors.background} />
              )}
              <Text style={styles.backupButtonText}>Export JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backupButton, styles.importButton]}
              onPress={handleImport}
              disabled={backupAction !== null}
            >
              {backupAction === "import" ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <MaterialIcons name="file-download" size={20} color={colors.accent} />
              )}
              <Text style={[styles.backupButtonText, styles.importButtonText]}>Import JSON</Text>
            </TouchableOpacity>
          </View>
          {backupStatus ? <Text style={styles.backupStatus}>{backupStatus}</Text> : null}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cuisinePill: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  sliderCaption: {
    ...typography.caption,
    color: colors.disabledGray,
    marginBottom: spacing.sm,
  },
  sliderValue: {
    ...typography.heading3,
    color: colors.accent,
    marginBottom: spacing.md,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  sliderLabel: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  priceContainer: {
    gap: spacing.md,
  },
  priceSlider: {
    gap: spacing.md,
  },
  priceLabel: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  dietaryContainer: {
    gap: spacing.md,
  },
  dietaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
  },
  dietaryItemSelected: {
    backgroundColor: "rgba(245, 166, 35, 0.1)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dietaryText: {
    ...typography.body,
    color: colors.textDark,
  },
  dietaryTextSelected: {
    color: colors.accent,
    ...typography.bodySemibold,
  },
  historyContainer: {
    gap: spacing.md,
  },
  historyCount: {
    ...typography.bodySemibold,
    color: colors.accent,
  },
  historyPreview: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  historyItem: {
    gap: spacing.sm,
  },
  historyRating: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  historyDate: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  backupDescription: {
    ...typography.body,
    color: colors.disabledGray,
    marginBottom: spacing.md,
  },
  backupActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  backupButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    ...shadows.sm,
  },
  backupButtonText: {
    ...typography.bodySemibold,
    color: colors.background,
  },
  importButton: {
    backgroundColor: "rgba(245, 166, 35, 0.08)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  importButtonText: {
    color: colors.accent,
  },
  backupStatus: {
    ...typography.caption,
    color: colors.successGreen,
    marginTop: spacing.md,
  },
});
