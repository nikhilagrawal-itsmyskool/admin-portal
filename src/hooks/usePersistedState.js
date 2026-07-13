import { useState, useCallback } from 'react';

// Persists any JSON-serializable state under a namespaced key so it survives a
// component remount (e.g. list -> detail -> back). Defaults to sessionStorage
// (per-tab, cleared when the tab closes) — pass storage='local' to keep it across
// browser restarts. Mirrors usePersistedPaginationModel's shape.
const KEY_PREFIX = 'ims.state.';

export default function usePersistedState(key, initial, storage = 'session') {
  const store = storage === 'local' ? window.localStorage : window.sessionStorage;
  const storageKey = KEY_PREFIX + key;

  const [value, setValue] = useState(() => {
    try {
      const raw = store.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          store.setItem(storageKey, JSON.stringify(resolved));
        } catch {}
        return resolved;
      });
    },
    [storageKey, store]
  );

  return [value, update];
}
