import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { clusterVisits } from '../algorithm/AreaClustering';
import { colors, typography, spacing, borderRadius } from '../theme';

export function MapScreen() {
  const visits = useAppStore((state) => state.preferences.visitHistory);
  const areas = clusterVisits(visits);
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>Your food neighborhoods</Text>
    <Text style={styles.body}>Explore your saved areas on OpenStreetMap. Use For You for nearby restaurants matched to your liked dishes.</Text>
    {areas.length === 0 ? <Text style={styles.body}>Add a restaurant to start your map.</Text> : areas.map((area) => (
      <View key={area.id} style={styles.card}>
        <Text style={styles.heading}>{area.label}</Text>
        <Text style={styles.body}>{area.visitIds.length} saved visit{area.visitIds.length === 1 ? '' : 's'}</Text>
        <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${area.centroid.lat}&mlon=${area.centroid.lon}#map=15/${area.centroid.lat}/${area.centroid.lon}`)}>
          <Text style={styles.link}>Open neighborhood map ↗</Text>
        </TouchableOpacity>
      </View>
    ))}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.lg },
  title: { ...typography.heading2, color: colors.text }, heading: { ...typography.heading3, color: colors.text },
  body: { ...typography.body, color: colors.disabledGray },
  card: { padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: borderRadius.md, gap: spacing.sm },
  link: { ...typography.bodySemibold, color: colors.accent },
});
