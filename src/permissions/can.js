import { useAuth } from "../context/AuthContext";
import { ROLE_PERMISSIONS } from "./policy";

// True if any of the user's roles grants `action`. Supports '*' and 'module.*'
// wildcards. This is the single seam: a future DB-backed policy can replace the
// ROLE_PERMISSIONS lookup here without touching any call site.
export function can(user, action) {
  const perms = (user?.roles || []).flatMap((r) => ROLE_PERMISSIONS[r] || []);
  return perms.some(
    (p) =>
      p === "*" ||
      p === action ||
      (p.endsWith(".*") && action.startsWith(p.slice(0, -1))),
  );
}

// Hook form: const can = useCan(); ... {can('timetable.manage') && <Button/>}
export function useCan() {
  const { user } = useAuth();
  return (action) => can(user, action);
}
