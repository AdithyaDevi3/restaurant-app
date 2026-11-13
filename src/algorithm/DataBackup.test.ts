import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createBackupPayload,
  mergeBackupData,
  parseBackupJson,
  RestorableAppData,
} from './DataBackup';

const current: RestorableAppData = {
  preferences: {
    favoriteCuisines: ['Italian'],
    maxDistance: 1500,
    priceRange: [1, 3],
    avoidCuisines: [],
    dietaryRestrictions: [],
    visitHistory: [{
      restaurantId: 'r1', restaurantName: 'Luigi’s', cuisines: ['Italian'], rating: 5,
      timestamp: 1000, lat: 40.7, lon: -74, notes: 'old', photoUris: ['file:///photo.jpg'],
    }],
  },
  restaurantMenus: {},
  menuChoices: [],
};

describe('data backups', () => {
  it('excludes device-local photo URIs from exports', () => {
    const backup = createBackupPayload(current);
    expect(backup.preferences.visitHistory[0].photoUris).toEqual([]);
  });

  it('parses a supported backup and rejects unrelated JSON', () => {
    const parsed = parseBackupJson(JSON.stringify(createBackupPayload(current)));
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(BACKUP_VERSION);

    let rejected = false;
    try {
      parseBackupJson('{"hello":"world"}');
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });

  it('merges duplicates, updates imported data, and preserves local photos', () => {
    const backup = createBackupPayload({
      ...current,
      preferences: {
        ...current.preferences,
        favoriteCuisines: ['Thai'],
        visitHistory: [
          { ...current.preferences.visitHistory[0], notes: 'restored', photoUris: [] },
          { restaurantId: 'r2', restaurantName: 'Thai Place', cuisines: ['Thai'], rating: 4,
            timestamp: 2000, lat: 40.8, lon: -74.1 },
        ],
      },
    });

    const merged = mergeBackupData(current, backup);
    expect(merged.preferences.favoriteCuisines).toEqual(['Thai']);
    expect(merged.preferences.visitHistory).toHaveLength(2);
    const luigis = merged.preferences.visitHistory.filter((visit) => visit.restaurantId === 'r1')[0];
    expect(luigis.notes).toBe('restored');
    expect(luigis.photoUris).toEqual(['file:///photo.jpg']);
  });
});
