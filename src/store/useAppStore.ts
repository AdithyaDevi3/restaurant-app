import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { RestaurantMenu, RestaurantMenuChoice, UserPreferences, VisitRecord } from '../types';
import type { RestorableAppData } from '../algorithm/DataBackup';

const storage = createMMKV({ id: 'restaurant-finder-store' });
const STORAGE_KEYS = {
  preferences: 'preferences',
  restaurantMenus: 'restaurantMenus',
  menuChoices: 'menuChoices',
};

interface AppState {
  preferences: UserPreferences;
  restaurantMenus: Record<string, RestaurantMenu>;
  menuChoices: RestaurantMenuChoice[];
  setPreferences: (p: Partial<UserPreferences>) => void;
  addVisit: (record: VisitRecord) => void;
  removeVisit: (restaurantId: string, timestamp: number) => void;
  updateVisit: (record: VisitRecord) => void;
  saveRestaurantMenu: (menu: RestaurantMenu) => void;
  toggleMenuItemChoice: (choice: RestaurantMenuChoice) => void;
  restoreData: (data: RestorableAppData) => void;
}

const DEFAULT_PREFS: UserPreferences = {
  favoriteCuisines: [],
  maxDistance: 1500,
  priceRange: [1, 3],
  avoidCuisines: [],
  dietaryRestrictions: [],
  visitHistory: [],
};

function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

// Backfill pre-pivot visit records that lack name/location fields.
export function migrateVisitRecords(
  history: Array<Partial<VisitRecord> & { restaurantId: string }>,
  menus: Record<string, RestaurantMenu>,
): VisitRecord[] {
  return history.map((visit) => ({
    restaurantId: visit.restaurantId,
    restaurantName: visit.restaurantName ?? 'Logged restaurant',
    cuisines: visit.cuisines ?? [],
    rating: visit.rating ?? 0,
    timestamp: visit.timestamp ?? Date.now(),
    lat: visit.lat ?? 0,
    lon: visit.lon ?? 0,
    menuLogged: visit.menuLogged ?? Boolean(menus[visit.restaurantId]),
    notes: visit.notes ?? '',
    photoUris: visit.photoUris ?? [],
  }));
}

const initialRestaurantMenus = readJson<Record<string, RestaurantMenu>>(STORAGE_KEYS.restaurantMenus, {});
const initialMenuChoices = readJson<RestaurantMenuChoice[]>(STORAGE_KEYS.menuChoices, []);
const rawPreferences = readJson<UserPreferences>(STORAGE_KEYS.preferences, DEFAULT_PREFS);
const initialPreferences: UserPreferences = {
  ...DEFAULT_PREFS,
  ...rawPreferences,
  visitHistory: migrateVisitRecords(rawPreferences.visitHistory ?? [], initialRestaurantMenus),
};

export const useAppStore = create<AppState>((set) => ({
  preferences: initialPreferences,
  restaurantMenus: initialRestaurantMenus,
  menuChoices: initialMenuChoices,
  setPreferences: (p) =>
    set((state) => {
      const preferences = { ...state.preferences, ...p };
      writeJson(STORAGE_KEYS.preferences, preferences);
      return { preferences };
    }),
  addVisit: (record) =>
    set((state) => {
      const preferences = {
        ...state.preferences,
        visitHistory: [record, ...state.preferences.visitHistory].slice(0, 100),
      };

      writeJson(STORAGE_KEYS.preferences, preferences);
      return { preferences };
    }),
  removeVisit: (restaurantId, timestamp) =>
    set((state) => {
      const preferences = {
        ...state.preferences,
        visitHistory: state.preferences.visitHistory.filter(
          (visit) => !(visit.restaurantId === restaurantId && visit.timestamp === timestamp),
        ),
      };

      writeJson(STORAGE_KEYS.preferences, preferences);
      return { preferences };
    }),
  updateVisit: (record) =>
    set((state) => {
      const preferences = {
        ...state.preferences,
        visitHistory: state.preferences.visitHistory.map((visit) =>
          visit.restaurantId === record.restaurantId && visit.timestamp === record.timestamp
            ? record
            : visit,
        ),
      };

      writeJson(STORAGE_KEYS.preferences, preferences);
      return { preferences };
    }),
  saveRestaurantMenu: (menu) =>
    set((state) => {
      const restaurantMenus = {
        ...state.restaurantMenus,
        [menu.restaurantId]: menu,
      };

      writeJson(STORAGE_KEYS.restaurantMenus, restaurantMenus);
      return { restaurantMenus };
    }),
  toggleMenuItemChoice: (choice) =>
    set((state) => {
      const exists = state.menuChoices.some(
        (item) => item.restaurantId === choice.restaurantId && item.itemId === choice.itemId,
      );

      const menuChoices = exists
        ? state.menuChoices.filter(
            (item) => !(item.restaurantId === choice.restaurantId && item.itemId === choice.itemId),
          )
        : [choice, ...state.menuChoices];

      writeJson(STORAGE_KEYS.menuChoices, menuChoices);
      return { menuChoices };
    }),
  restoreData: (data) =>
    set(() => {
      writeJson(STORAGE_KEYS.preferences, data.preferences);
      writeJson(STORAGE_KEYS.restaurantMenus, data.restaurantMenus);
      writeJson(STORAGE_KEYS.menuChoices, data.menuChoices);
      return data;
    }),
}));
