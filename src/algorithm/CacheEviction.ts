export interface TimestampedCacheKey {
  key: string;
  timestamp: number;
}

/** Select the oldest entries that must be removed to satisfy a cache cap. */
export function selectCacheKeysToEvict(
  entries: TimestampedCacheKey[],
  maxEntries: number,
): string[] {
  const overflow = entries.length - Math.max(0, maxEntries);
  if (overflow <= 0) return [];

  return [...entries]
    .sort((a, b) => a.timestamp - b.timestamp || a.key.localeCompare(b.key))
    .slice(0, overflow)
    .map((entry) => entry.key);
}
