import {
  RestaurantMenu,
  RestaurantMenuChoice,
  UserPreferences,
  VisitRecord,
} from '../types';

export const BACKUP_FORMAT = 'restaurantfinder-backup';
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  preferences: UserPreferences;
  restaurantMenus: Record<string, RestaurantMenu>;
  menuChoices: RestaurantMenuChoice[];
}

export interface RestorableAppData {
  preferences: UserPreferences;
  restaurantMenus: Record<string, RestaurantMenu>;
  menuChoices: RestaurantMenuChoice[];
}

export function createBackupPayload(data: RestorableAppData): BackupPayload {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    preferences: {
      ...data.preferences,
      visitHistory: data.preferences.visitHistory.map((visit) => ({
        ...visit,
        photoUris: [],
      })),
    },
    restaurantMenus: data.restaurantMenus,
    menuChoices: data.menuChoices,
  };
}

export function parseBackupJson(raw: string): BackupPayload {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isRecord(value) || value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) {
    throw new Error('This is not a supported RestaurantFinder backup.');
  }

  const preferences = sanitizePreferences(value.preferences);
  const restaurantMenus = sanitizeMenus(value.restaurantMenus);
  const menuChoices = sanitizeChoices(value.menuChoices);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
    preferences,
    restaurantMenus,
    menuChoices,
  };
}

export function mergeBackupData(
  current: RestorableAppData,
  backup: BackupPayload,
): RestorableAppData {
  const visits = new Map<string, VisitRecord>();
  current.preferences.visitHistory.forEach((visit) => visits.set(visitKey(visit), visit));
  backup.preferences.visitHistory.forEach((visit) => {
    const existing = visits.get(visitKey(visit));
    visits.set(visitKey(visit), {
      ...visit,
      photoUris: existing?.photoUris ?? [],
    });
  });

  const choices = new Map<string, RestaurantMenuChoice>();
  current.menuChoices.forEach((choice) => choices.set(choiceKey(choice), choice));
  backup.menuChoices.forEach((choice) => choices.set(choiceKey(choice), choice));

  return {
    preferences: {
      favoriteCuisines: backup.preferences.favoriteCuisines,
      maxDistance: backup.preferences.maxDistance,
      priceRange: backup.preferences.priceRange,
      avoidCuisines: backup.preferences.avoidCuisines,
      dietaryRestrictions: backup.preferences.dietaryRestrictions,
      visitHistory: Array.from(visits.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100),
    },
    restaurantMenus: { ...current.restaurantMenus, ...backup.restaurantMenus },
    menuChoices: Array.from(choices.values()).sort((a, b) => b.createdAt - a.createdAt),
  };
}

function sanitizePreferences(value: unknown): UserPreferences {
  if (!isRecord(value) || !Array.isArray(value.visitHistory)) {
    throw new Error('The backup is missing preference or visit data.');
  }

  const visits = value.visitHistory.filter(isVisitRecord).slice(0, 100).map((visit) => ({
    ...visit,
    photoUris: [],
  }));
  if (visits.length !== Math.min(value.visitHistory.length, 100)) {
    throw new Error('The backup contains an invalid visit record.');
  }

  const priceRange = value.priceRange;
  if (
    !Array.isArray(priceRange) ||
    priceRange.length !== 2 ||
    !priceRange.every((item) => typeof item === 'number' && item >= 1 && item <= 4) ||
    priceRange[0] > priceRange[1]
  ) {
    throw new Error('The backup contains an invalid price range.');
  }

  return {
    favoriteCuisines: stringArray(value.favoriteCuisines),
    maxDistance: finiteNumber(value.maxDistance, 1500, 500, 5000),
    priceRange: [priceRange[0], priceRange[1]],
    avoidCuisines: stringArray(value.avoidCuisines),
    dietaryRestrictions: stringArray(value.dietaryRestrictions),
    visitHistory: visits,
  };
}

function sanitizeMenus(value: unknown): Record<string, RestaurantMenu> {
  if (!isRecord(value)) throw new Error('The backup contains invalid menu data.');

  const entries = Object.entries(value).slice(0, 500);
  if (!entries.every(([, menu]) => isRestaurantMenu(menu))) {
    throw new Error('The backup contains an invalid restaurant menu.');
  }
  const validatedEntries = entries as Array<[string, RestaurantMenu]>;
  return Object.fromEntries(
    validatedEntries.map(([, menu]) => [menu.restaurantId, menu]),
  ) as Record<string, RestaurantMenu>;
}

function sanitizeChoices(value: unknown): RestaurantMenuChoice[] {
  if (!Array.isArray(value) || !value.every(isMenuChoice)) {
    throw new Error('The backup contains invalid liked-dish data.');
  }
  return value.slice(0, 5000);
}

function isVisitRecord(value: unknown): value is VisitRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.restaurantId === 'string' &&
    typeof value.restaurantName === 'string' &&
    Array.isArray(value.cuisines) &&
    value.cuisines.every((item) => typeof item === 'string') &&
    isFiniteNumber(value.rating) &&
    value.rating >= 0 &&
    value.rating <= 5 &&
    isFiniteNumber(value.timestamp) &&
    isFiniteNumber(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    isFiniteNumber(value.lon) &&
    value.lon >= -180 &&
    value.lon <= 180 &&
    (value.notes === undefined || typeof value.notes === 'string') &&
    (value.menuLogged === undefined || typeof value.menuLogged === 'boolean')
  );
}

function isRestaurantMenu(value: unknown): value is RestaurantMenu {
  if (!isRecord(value) || !Array.isArray(value.items)) return false;
  return (
    typeof value.restaurantId === 'string' &&
    typeof value.sourceUrl === 'string' &&
    isFiniteNumber(value.lastSyncedAt) &&
    value.items.length <= 100 &&
    value.items.every((item) =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      (item.description === undefined || typeof item.description === 'string') &&
      (item.price === undefined || isFiniteNumber(item.price)) &&
      (item.currency === undefined || typeof item.currency === 'string'),
    )
  );
}

function isMenuChoice(value: unknown): value is RestaurantMenuChoice {
  return (
    isRecord(value) &&
    typeof value.restaurantId === 'string' &&
    typeof value.itemId === 'string' &&
    typeof value.itemName === 'string' &&
    typeof value.restaurantName === 'string' &&
    isFiniteNumber(value.createdAt)
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return [];
  return value.slice(0, 100);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  return isFiniteNumber(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function visitKey(visit: VisitRecord): string {
  return `${visit.restaurantId}:${visit.timestamp}`;
}

function choiceKey(choice: RestaurantMenuChoice): string {
  return `${choice.restaurantId}:${choice.itemId}`;
}
