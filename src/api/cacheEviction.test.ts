import { enforceCacheEntryLimit } from './cacheEviction';

function fakeStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    getAllKeys: () => [...values.keys()],
    getString: (key: string) => values.get(key),
    remove: (key: string) => values.delete(key),
    keys: () => [...values.keys()].sort(),
  };
}

describe('enforceCacheEntryLimit', () => {
  it('limits only matching cache families', () => {
    const storage = fakeStorage({
      'restaurants:old': JSON.stringify({ timestamp: 10 }),
      'arealabel:new': JSON.stringify({ timestamp: 30 }),
      unrelated: JSON.stringify({ timestamp: 1 }),
    });

    enforceCacheEntryLimit(storage, ['restaurants:', 'arealabel:'], 1);

    expect(storage.keys()).toEqual(['arealabel:new', 'unrelated']);
  });

  it('evicts legacy and malformed entries first', () => {
    const storage = fakeStorage({
      'arealabel:legacy': 'Downtown',
      'restaurants:current': JSON.stringify({ timestamp: 10 }),
    });

    enforceCacheEntryLimit(storage, ['restaurants:', 'arealabel:'], 1);

    expect(storage.keys()).toEqual(['restaurants:current']);
  });
});
