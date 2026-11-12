import { appAlert } from '../api/appAlert';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { RatingStars } from '../components/RatingStars';
import { VisitRecord } from '../types';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { deleteVisitPhotos } from '../api/visitPhotos';

interface VisitHistoryScreenProps {
  navigation: any;
}

export const VisitHistoryScreen: React.FC<VisitHistoryScreenProps> = ({ navigation }) => {
  const visitHistory = useAppStore((state) => state.preferences.visitHistory);
  const restaurantMenus = useAppStore((state) => state.restaurantMenus);
  const removeVisit = useAppStore((state) => state.removeVisit);

  const confirmDelete = (visit: VisitRecord) => {
    appAlert('Remove visit', `Remove ${visit.restaurantName} from your history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteVisitPhotos(visit.photoUris);
          removeVisit(visit.restaurantId, visit.timestamp);
        },
      },
    ]);
  };

  const renderVisit = ({ item }: { item: VisitRecord }) => {
    const hasMenu = item.menuLogged || Boolean(restaurantMenus[item.restaurantId]);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VisitMenu', { visit: item })}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.restaurantName}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.timestamp).toLocaleDateString()}
              {item.cuisines.length > 0 ? ` · ${item.cuisines.join(', ')}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8}>
            <MaterialIcons name="delete-outline" size={22} color={colors.errorRed} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <RatingStars rating={item.rating} size={16} />
          {item.photoUris?.length ? (
            <View style={styles.photoCount}>
              <MaterialIcons name="photo-library" size={14} color={colors.disabledGray} />
              <Text style={styles.photoCountText}>{item.photoUris.length}</Text>
            </View>
          ) : null}
          <View style={[styles.menuBadge, hasMenu ? styles.menuBadgeDone : styles.menuBadgeTodo]}>
            <MaterialIcons
              name={hasMenu ? 'menu-book' : 'post-add'}
              size={14}
              color={hasMenu ? colors.successGreen : colors.accent}
            />
            <Text style={[styles.menuBadgeText, { color: hasMenu ? colors.successGreen : colors.accent }]}>
              {hasMenu ? 'Menu logged' : 'Log the menu'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Visits</Text>
          <Text style={styles.subtitle}>
            Log where you've eaten — recommendations grow from here.
          </Text>
        </View>
      </View>

      <FlatList
        data={visitHistory}
        keyExtractor={(item) => `${item.restaurantId}-${item.timestamp}`}
        renderItem={renderVisit}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="restaurant" size={48} color={colors.accent} />
            <Text style={styles.emptyTitle}>No visits yet</Text>
            <Text style={styles.emptyText}>
              Log your first restaurant visit and we'll start finding similar spots in that area.
            </Text>
          </View>
        }
      />

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a restaurant visit" style={styles.fab} onPress={() => navigation.navigate('LogVisit')}>
        <MaterialIcons name="add" size={28} color={colors.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.disabledGray,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  name: {
    ...typography.heading3,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.disabledGray,
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  menuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
    marginRight: spacing.sm,
  },
  photoCountText: {
    ...typography.caption,
    color: colors.disabledGray,
  },
  menuBadgeDone: {
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  menuBadgeTodo: {
    backgroundColor: 'rgba(245,166,35,0.12)',
  },
  menuBadgeText: {
    ...typography.captionSemibold,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.disabledGray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
