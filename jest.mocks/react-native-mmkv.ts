// In-memory stand-in for react-native-mmkv (native module, unavailable in node).
const stores = new Map<string, Map<string, string>>();

export function createMMKV({ id }: { id: string }) {
  const data = stores.get(id) ?? new Map<string, string>();
  stores.set(id, data);

  return {
    getString: (key: string) => data.get(key),
    getAllKeys: () => [...data.keys()],
    set: (key: string, value: string) => {
      data.set(key, value);
    },
    remove: (key: string) => data.delete(key),
    clearAll: () => data.clear(),
  };
}
