import { useState, useCallback } from "react";

// Persists an MUI DataGrid paginationModel ({ page, pageSize }) in localStorage
// so a chosen page / rows-per-page survives component remounts (e.g. returning
// from an add/edit form) and browser restarts. `key` namespaces each list.
const KEY_PREFIX = "ims.pagination.";

export default function usePersistedPaginationModel(
  key,
  defaults = { page: 0, pageSize: 25 },
) {
  const storageKey = KEY_PREFIX + key;
  const [model, setModel] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey));
      if (
        parsed &&
        Number.isInteger(parsed.page) &&
        Number.isInteger(parsed.pageSize)
      ) {
        return parsed;
      }
    } catch {}
    return defaults;
  });

  // DataGrid's onPaginationModelChange may pass a value or an updater function.
  const update = useCallback(
    (next) => {
      setModel((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {}
        return resolved;
      });
    },
    [storageKey],
  );

  return [model, update];
}
