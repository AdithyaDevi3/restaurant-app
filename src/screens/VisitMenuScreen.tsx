import { appAlert } from '../api/appAlert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { importRestaurantMenu } from '../api/menuImport';
import { MenuItem, VisitRecord } from '../types';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { deleteVisitPhoto, persistVisitPhoto } from '../api/visitPhotos';

const MAX_VISIT_PHOTOS = 5;

interface VisitMenuScreenProps {
  navigation: any;
  route: {
    params: {
      visit: VisitRecord;
    };
  };
}

export const VisitMenuScreen: React.FC<VisitMenuScreenProps> = ({ navigation, route }) => {
  const { visit } = route.params;

  const restaurantMenus = useAppStore((state) => state.restaurantMenus);
  const menuChoices = useAppStore((state) => state.menuChoices);
  const saveRestaurantMenu = useAppStore((state) => state.saveRestaurantMenu);
  const toggleMenuItemChoice = useAppStore((state) => state.toggleMenuItemChoice);
  const updateVisit = useAppStore((state) => state.updateVisit);
  const storedVisit = useAppStore((state) =>
    state.preferences.visitHistory.find(
      (item) => item.restaurantId === visit.restaurantId && item.timestamp === visit.timestamp,
    ),
  );
  const currentVisit = storedVisit ?? visit;

  const menu = restaurantMenus[visit.restaurantId];
  const items = menu?.items ?? [];
  const likedIds = new Set(
    menuChoices
      .filter((choice) => choice.restaurantId === visit.restaurantId)
      .map((choice) => choice.itemId),
  );

  const [menuUrl, setMenuUrl] = useState(menu?.sourceUrl ?? '');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [notes, setNotes] = useState(currentVisit.notes ?? '');
  const [savingPhoto, setSavingPhoto] = useState(false);

  const getLatestVisit = () =>
    useAppStore
      .getState()
      .preferences.visitHistory.find(
        (item) => item.restaurantId === visit.restaurantId && item.timestamp === visit.timestamp,
      ) ?? currentVisit;

  const markMenuLogged = () => {
    const latestVisit = getLatestVisit();
    if (!latestVisit.menuLogged) {
      updateVisit({ ...latestVisit, menuLogged: true });
    }
  };

  const saveNotes = () => {
    const nextNotes = notes.trim();
    const latestVisit = getLatestVisit();
    if (nextNotes !== (latestVisit.notes ?? '')) {
      updateVisit({ ...latestVisit, notes: nextNotes });
    }
  };

  const handleAddPhoto = async () => {
    if ((currentVisit.photoUris?.length ?? 0) >= MAX_VISIT_PHOTOS) {
      appAlert('Photo limit reached', `You can attach up to ${MAX_VISIT_PHOTOS} photos per visit.`);
      return;
    }

    setSavingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        appAlert('Photo access needed', 'Allow photo access to attach a visit photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) return;

      const uri = await persistVisitPhoto(
        result.assets[0].uri,
        `${currentVisit.restaurantId}-${currentVisit.timestamp}`,
      );
      const latestVisit = getLatestVisit();
      updateVisit({
        ...latestVisit,
        photoUris: [...(latestVisit.photoUris ?? []), uri],
      });
    } catch {
      appAlert('Photo not saved', 'RestaurantFinder could not save that photo. Please try again.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const confirmRemovePhoto = (uri: string) => {
    appAlert('Remove photo', 'Remove this photo from the visit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteVisitPhoto(uri);
          const latestVisit = getLatestVisit();
          updateVisit({
            ...latestVisit,
            photoUris: (latestVisit.photoUris ?? []).filter((photoUri) => photoUri !== uri),
          });
        },
      },
    ]);
  };

  const handleImport = async () => {
    if (!menuUrl.trim()) {
      setImportError('Enter a menu URL first');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const imported = await importRestaurantMenu(visit.restaurantId, menuUrl.trim());
      const merged = {
        ...imported,
        items: mergeItems(items, imported.items),
      };
      saveRestaurantMenu(merged);
      markMenuLogged();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import menu');
    } finally {
      setImporting(false);
    }
  };

  const handleAddManualItem = () => {
    const name = newItemName.trim();
    if (!name) return;

    const price = Number.parseFloat(newItemPrice);
    const item: MenuItem = {
      id: `manual-item-${Date.now()}`,
      name,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
    };

    saveRestaurantMenu({
      restaurantId: visit.restaurantId,
      sourceUrl: menu?.sourceUrl ?? 'manual',
      items: [...items, item],
      lastSyncedAt: Date.now(),
    });
    markMenuLogged();
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleToggleLike = (item: MenuItem) => {
    toggleMenuItemChoice({
      restaurantId: visit.restaurantId,
      itemId: item.id,
      itemName: item.name,
      restaurantName: visit.restaurantName,
      createdAt: Date.now(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {visit.restaurantName}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.subtitle}>
          Log the menu and mark what you liked — this powers your recommendations.
        </Text>

        <Text style={styles.sectionLabel}>Visit notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={saveNotes}
          placeholder="What stood out? Dishes, flavors, atmosphere…"
          placeholderTextColor={colors.disabledGray}
          multiline
          maxLength={500}
          style={[styles.input, styles.notesInput]}
        />
        <Text style={styles.noteHint}>Notes help shape your taste profile.</Text>

        <View style={styles.photoHeading}>
          <Text style={[styles.sectionLabel, styles.photoSectionLabel]}>Visit photos</Text>
          <Text style={styles.photoLimit}>
            {currentVisit.photoUris?.length ?? 0}/{MAX_VISIT_PHOTOS}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoList}
        >
          {(currentVisit.photoUris ?? []).map((uri) => (
            <TouchableOpacity key={uri} onPress={() => confirmRemovePhoto(uri)}>
              <Image source={{ uri }} style={styles.photo} />
              <View style={styles.removePhotoBadge}>
                <MaterialIcons name="close" size={14} color={colors.text} />
              </View>
            </TouchableOpacity>
          ))}
          {(currentVisit.photoUris?.length ?? 0) < MAX_VISIT_PHOTOS ? (
            <TouchableOpacity style={styles.addPhoto} onPress={handleAddPhoto} disabled={savingPhoto}>
              {savingPhoto ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <MaterialIcons name="add-photo-alternate" size={28} color={colors.accent} />
              )}
              <Text style={styles.addPhotoText}>Add photo</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <Text style={styles.sectionLabel}>Import from URL</Text>
        <View style={styles.importRow}>
          <TextInput
            value={menuUrl}
            onChangeText={setMenuUrl}
            placeholder="https://restaurant.com/menu"
            placeholderTextColor={colors.disabledGray}
            autoCapitalize="none"
            style={styles.input}
          />
          <TouchableOpacity style={styles.importButton} onPress={handleImport} disabled={importing}>
            {importing ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <MaterialIcons name="download" size={20} color={colors.background} />
            )}
          </TouchableOpacity>
        </View>
        {importError ? <Text style={styles.errorText}>{importError}</Text> : null}

        <Text style={styles.sectionLabel}>Add item manually</Text>
        <View style={styles.manualRow}>
          <TextInput
            value={newItemName}
            onChangeText={setNewItemName}
            placeholder="Dish name"
            placeholderTextColor={colors.disabledGray}
            style={[styles.input, { flex: 2 }]}
          />
          <TextInput
            value={newItemPrice}
            onChangeText={setNewItemPrice}
            placeholder="Price"
            placeholderTextColor={colors.disabledGray}
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1 }]}
          />
          <TouchableOpacity style={styles.importButton} onPress={handleAddManualItem}>
            <MaterialIcons name="add" size={20} color={colors.background} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>
          Menu items {items.length > 0 ? `(${items.length}) — tap what you liked` : ''}
        </Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No items yet. Import a menu or add dishes manually.</Text>
        ) : (
          items.map((item) => {
            const liked = likedIds.has(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, liked && styles.itemRowLiked]}
                onPress={() => handleToggleLike(item)}
              >
                <MaterialIcons
                  name={liked ? 'favorite' : 'favorite-border'}
                  size={20}
                  color={liked ? colors.errorRed : colors.disabledGray}
                />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {item.price !== undefined ? (
                  <Text style={styles.itemPrice}>
                    {item.currency ?? '$'}
                    {item.price.toFixed(2)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

function mergeItems(existing: MenuItem[], imported: MenuItem[]): MenuItem[] {
  const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));
  return [...existing, ...imported.filter((item) => !existingNames.has(item.name.toLowerCase()))];
}

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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.disabledGray,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    ...typography.captionSemibold,
    color: colors.disabledGray,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.text,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  notesInput: {
    minHeight: 96,
    marginHorizontal: spacing.lg,
    textAlignVertical: 'top',
  },
  noteHint: {
    ...typography.caption,
    color: colors.disabledGray,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  photoHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
  },
  photoSectionLabel: {
    paddingHorizontal: 0,
    marginLeft: spacing.lg,
  },
  photoLimit: {
    ...typography.caption,
    color: colors.disabledGray,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  photoList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  photo: {
    width: 104,
    height: 104,
    borderRadius: borderRadius.md,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  addPhoto: {
    width: 104,
    height: 104,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,166,35,0.06)',
  },
  addPhotoText: {
    ...typography.captionSemibold,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  importButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.errorRed,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.disabledGray,
    paddingHorizontal: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  itemRowLiked: {
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  itemName: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  itemDescription: {
    ...typography.caption,
    color: colors.disabledGray,
    marginTop: 2,
  },
  itemPrice: {
    ...typography.bodySemibold,
    color: colors.accent,
    marginLeft: spacing.sm,
  },
});
