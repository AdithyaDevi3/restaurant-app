/** Share in-flight reads so mounting two screens does not duplicate provider traffic. */
export function createReadCache({ limit = 150, now = Date.now } = {}) {
  const entries = new Map();
  const pending = new Map();
  return async function cached(key, ttl, load) {
    const hit = entries.get(key);
    if (hit && hit.until > now()) return hit.value;
    if (pending.has(key)) return pending.get(key);
    const task = Promise.resolve().then(load).then((value) => {
      entries.delete(key);
      entries.set(key, { value, until: now() + ttl });
      while (entries.size > limit) entries.delete(entries.keys().next().value);
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}
