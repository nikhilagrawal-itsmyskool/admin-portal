import { useCallback, useState } from "react";
import usePersistedState from "./usePersistedState";
import { useAuth } from "../context/AuthContext";

// Per-user, per-surface tile personalisation: a custom order (per group) + a set of hidden
// tiles, persisted in localStorage so it survives across sessions on this device. Drives the
// long-press "edit mode" (jiggle → drag to reorder → tap ✕ to hide → Reset to restore all).
//
// `surface` isolates the two tile surfaces ("mobile" | "dashboard") so a user can arrange them
// independently. Stored shape: { groups: { [groupId]: string[] }, hidden: string[] } keyed by
// the tile's stable id (mobile: tile.id — path or hub key; dashboard: module.title).
export default function useTileLayout(surface) {
  const { user } = useAuth();
  const userId = user?.id || "anon";
  const [data, setData] = usePersistedState(
    `tiles.${surface}.${userId}`,
    { groups: {}, hidden: [] },
    "local",
  );
  const [editMode, setEditMode] = useState(false);

  const enterEdit = useCallback(() => {
    setEditMode(true);
    // Little haptic nudge on touch devices, mirroring the OS home-screen feel.
    try {
      navigator.vibrate?.(15);
    } catch {}
  }, []);
  const exitEdit = useCallback(() => setEditMode(false), []);

  const hiddenCount = (data.hidden || []).length;

  // Apply the saved layout to a group's natural-ordered items: drop hidden ones, then sort by
  // the user's saved order. Items with no saved position (newly granted features) keep their
  // natural order after the known ones, so nothing silently vanishes.
  const applyLayout = useCallback(
    (groupId, items, getId) => {
      const hiddenSet = new Set(data.hidden || []);
      const visible = items.filter((it) => !hiddenSet.has(getId(it)));
      const order = data.groups?.[groupId];
      if (!order || !order.length) return visible;
      const pos = new Map(order.map((id, i) => [id, i]));
      return visible
        .map((it, i) => ({ it, i }))
        .sort((a, b) => {
          const pa = pos.has(getId(a.it)) ? pos.get(getId(a.it)) : order.length + a.i;
          const pb = pos.has(getId(b.it)) ? pos.get(getId(b.it)) : order.length + b.i;
          return pa - pb;
        })
        .map((x) => x.it);
    },
    [data],
  );

  const setGroupOrder = useCallback(
    (groupId, orderedIds) => {
      setData((prev) => ({
        ...prev,
        groups: { ...(prev.groups || {}), [groupId]: orderedIds },
      }));
    },
    [setData],
  );

  const hide = useCallback(
    (id) => {
      setData((prev) => {
        const hidden = prev.hidden || [];
        if (hidden.includes(id)) return prev;
        return { ...prev, hidden: [...hidden, id] };
      });
    },
    [setData],
  );

  const reset = useCallback(() => {
    setData({ groups: {}, hidden: [] });
  }, [setData]);

  return {
    editMode,
    enterEdit,
    exitEdit,
    isCustomised: hiddenCount > 0 || Object.keys(data.groups || {}).length > 0,
    hiddenCount,
    applyLayout,
    setGroupOrder,
    hide,
    reset,
  };
}
