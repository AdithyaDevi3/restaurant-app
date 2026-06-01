import { create } from 'zustand';
import { UserPreferences, VisitRecord } from '../types';

interface AppState {
  preferences: UserPreferences;
  setPreferences: (p: Partial<UserPreferences>) => void;
  addVisit: (record: VisitRecord) => void;
}

const DEFAULT_PREFS: UserPreferences = {
  favoriteCuisines: [],
  maxDistance: 1500,
  priceRange: [1, 3],
  avoidCuisines: [],
  dietaryRestrictions: [],
  visitHistory: [],
};

export const useAppStore = create<AppState>((set) => ({
  preferences: DEFAULT_PREFS,
  setPreferences: (p) =>
    set((state) => ({ preferences: { ...state.preferences, ...p } })),
  addVisit: (record) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        visitHistory: [record, ...state.preferences.visitHistory].slice(0, 100),
      },
    })),
}));
