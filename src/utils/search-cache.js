export const DEFAULT_SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;

export function createSearchCache(now = () => Date.now()) {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);

      if (!entry) {
        return null;
      }

      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }

      return structuredClone(entry.value);
    },

    set(key, value, ttlMs = DEFAULT_SEARCH_CACHE_TTL_MS) {
      entries.set(key, {
        value: structuredClone(value),
        expiresAt: now() + ttlMs
      });
    },

    delete(key) {
      entries.delete(key);
    },

    clear() {
      entries.clear();
    }
  };
}
