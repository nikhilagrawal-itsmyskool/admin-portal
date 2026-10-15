import React, { createContext, useContext, useState, useCallback } from 'react';

// Global "show admin screens" toggle. Permissions and Config menu items (marked
// admin:true in Sidebar's menuItems) are hidden by default so they don't clutter
// every module's menu; flipping this reveals them. It is purely a visibility
// preference — it never grants access; the per-item `perm`/can() check still
// governs what actually renders. Persisted per-browser in localStorage.
const KEY = 'ims.adminReveal';

const AdminRevealContext = createContext({
  reveal: false,
  setReveal: () => {},
  toggle: () => {},
});

export function AdminRevealProvider({ children }) {
  const [reveal, setRevealState] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  const persist = (v) => {
    try {
      localStorage.setItem(KEY, v ? '1' : '0');
    } catch {}
  };

  const setReveal = useCallback((v) => {
    setRevealState(v);
    persist(v);
  }, []);

  const toggle = useCallback(() => {
    setRevealState((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, []);

  return (
    <AdminRevealContext.Provider value={{ reveal, setReveal, toggle }}>
      {children}
    </AdminRevealContext.Provider>
  );
}

export function useAdminReveal() {
  return useContext(AdminRevealContext);
}
