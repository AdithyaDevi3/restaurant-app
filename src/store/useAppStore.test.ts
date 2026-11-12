import { migrateVisitRecords, useAppStore } from './useAppStore';
import { RestaurantMenu, VisitRecord } from '../types';

const fullVisit: VisitRecord = {
  restaurantId: 'r1',
  restaurantName: 'Luigi\u2019s',
  cuisines: ['Italian'],
  rating: 5,
  timestamp: 1000,
  lat: 40.7,
  lon: -74,
  menuLogged: false,
};

const menu: RestaurantMenu = {
  restaurantId: 'legacy-1',
  sourceUrl: 'manual',
  items: [{ id: 'i1', name: 'Pizza' }],
  lastSyncedAt: 0,
};

describe('migrateVisitRecords', () => {
  it('backfills missing fields on legacy records', () => {
    const [migrated] = migrateVisitRecords([{ restaurantId: 'legacy-1', rating: 4 } as any], {});
    expect(migrated.restaurantName).toBe('Logged restaurant');
    expect(migrated.lat).toBe(0);
    expect(migrated.lon).toBe(0);
    expect(migrated.cuisines).toEqual([]);
    expect(migrated.rating).toBe(4);
  });

  it('marks menuLogged when a menu exists for the restaurant', () => {
    const [migrated] = migrateVisitRecords(
      [{ restaurantId: 'legacy-1' } as any],
      { 'legacy-1': menu },
    );
    expect(migrated.menuLogged).toBe(true);
  });

  it('preserves complete records, adding empty notes/photos defaults', () => {
    const [migrated] = migrateVisitRecords([fullVisit], {});
    expect(migrated).toEqual({ ...fullVisit, notes: '', photoUris: [] });
  });

  it('preserves existing notes and photoUris', () => {
    const withExtras = { ...fullVisit, notes: 'great pasta', photoUris: ['file:///p.jpg'] };
    const [migrated] = migrateVisitRecords([withExtras], {});
    expect(migrated.notes).toBe('great pasta');
    expect(migrated.photoUris).toEqual(['file:///p.jpg']);
  });
});

describe('useAppStore visit actions', () => {
  it('addVisit prepends to history', () => {
    const before = useAppStore.getState().preferences.visitHistory.length;
    useAppStore.getState().addVisit(fullVisit);
    const history = useAppStore.getState().preferences.visitHistory;
    expect(history).toHaveLength(before + 1);
    expect(history[0].restaurantId).toBe('r1');
  });

  it('updateVisit replaces the matching record only', () => {
    useAppStore.getState().addVisit({ ...fullVisit, restaurantId: 'r2', timestamp: 2000 });
    useAppStore.getState().updateVisit({ ...fullVisit, restaurantId: 'r2', timestamp: 2000, menuLogged: true });
    const history = useAppStore.getState().preferences.visitHistory;
    const updated = history.filter((v) => v.restaurantId === 'r2');
    expect(updated).toHaveLength(1);
    expect(updated[0].menuLogged).toBe(true);
  });

  it('removeVisit deletes by id + timestamp', () => {
    useAppStore.getState().addVisit({ ...fullVisit, restaurantId: 'r3', timestamp: 3000 });
    useAppStore.getState().removeVisit('r3', 3000);
    const remaining = useAppStore
      .getState()
      .preferences.visitHistory.filter((v) => v.restaurantId === 'r3');
    expect(remaining).toHaveLength(0);
  });

  it('toggleMenuItemChoice adds then removes a liked item', () => {
    const choice = {
      restaurantId: 'r1',
      itemId: 'i1',
      itemName: 'Pizza',
      restaurantName: 'Luigi\u2019s',
      createdAt: 1,
    };
    useAppStore.getState().toggleMenuItemChoice(choice);
    expect(
      useAppStore.getState().menuChoices.filter((c) => c.itemId === 'i1'),
    ).toHaveLength(1);
    useAppStore.getState().toggleMenuItemChoice(choice);
    expect(
      useAppStore.getState().menuChoices.filter((c) => c.itemId === 'i1'),
    ).toHaveLength(0);
  });

  it('saveRestaurantMenu persists by restaurantId', () => {
    useAppStore.getState().saveRestaurantMenu(menu);
    expect(useAppStore.getState().restaurantMenus['legacy-1'].items).toHaveLength(1);
  });

  it('restoreData replaces all persisted app collections together', () => {
    useAppStore.getState().restoreData({
      preferences: { ...useAppStore.getState().preferences, visitHistory: [fullVisit] },
      restaurantMenus: { restored: { ...menu, restaurantId: 'restored' } },
      menuChoices: [],
    });
    expect(useAppStore.getState().preferences.visitHistory).toEqual([fullVisit]);
    expect(useAppStore.getState().restaurantMenus['restored'].restaurantId).toBe('restored');
    expect(useAppStore.getState().menuChoices).toEqual([]);
  });
});
