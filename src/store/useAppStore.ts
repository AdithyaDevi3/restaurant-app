import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { RestaurantMenu, RestaurantMenuChoice, UserPreferences, VisitRecord } from '../types';

const storage = new MMKV({ id: 'restaurant-finder-store' });
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
  saveRestaurantMenu: (menu: RestaurantMenu) => void;
  toggleMenuItemChoice: (choice: RestaurantMenuChoice) => void;
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

const initialPreferences = readJson<UserPreferences>(STORAGE_KEYS.preferences, DEFAULT_PREFS);
const initialRestaurantMenus = readJson<Record<string, RestaurantMenu>>(STORAGE_KEYS.restaurantMenus, {});
const initialMenuChoices = readJson<RestaurantMenuChoice[]>(STORAGE_KEYS.menuChoices, []);

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
}));
