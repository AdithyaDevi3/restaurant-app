import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Restaurant } from '../types';
import { colors, spacing, typography } from '../theme';

export function PlaceAttribution({ restaurant }: { restaurant?: Restaurant }) {
  if (!restaurant?.sourceProvider) return null;
  const overture = restaurant.sourceProvider === 'overture';
  return <View style={styles.container}>
    <Text accessibilityRole="link" onPress={() => Linking.openURL(overture
      ? 'https://docs.overturemaps.org/attribution/' : 'https://www.openstreetmap.org/copyright')}
      style={styles.source}>{overture ? `Overture Maps · ${restaurant.sourceDate ?? 'open data'}` : '© OpenStreetMap contributors'}</Text>

  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.cardBackground, borderRadius: 4, alignSelf: 'flex-start' },
  source: { ...typography.caption, color: '#5E5E5E' },
});
