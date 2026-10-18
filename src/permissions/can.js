import { useAuth } from "../context/AuthContext";
import { ROLE_PERMISSIONS } from "./policy";

// God's live overrides (fetched from GET /auth/permissions/effective). Empty until loaded, so
// behaviour is identical to the static file policy (fail-safe). setPermissionOverrides() is called
// once after login; the grid page also refreshes it after a toggle. Mirrors the backend
// shared/lib/authz-policy.ts can() exactly: effective = fileDefaults + grants − revokes.
let OVERRIDES = [];
export function setPermissionOverrides(list) {
  OVERRIDES = Array.isArray(list) ? list : [];
}
export function getPermissionOverrides() {
  return OVERRIDES;
}

// Does the FILE default (ignoring overrides) grant `action` to this single role?
// Null-safe: a missing/invalid action is simply "not granted" — never throws (a single
// undefined perm must not white-screen the app).
export function baseGrants(role, action) {
  if (typeof action !== "string") return false;
  return (ROLE_PERMISSIONS[role] || []).some(
    (p) =>
      typeof p === "string" &&
      (p === "*" ||
        p === action ||
        (p.endsWith(".*") && action.startsWith(p.slice(0, -1)))),
  );
}
const hasOverride = (role, action, effect) =>
  OVERRIDES.some(
    (o) => o.role === role && o.action === action && o.effect === effect,
  );

// True if any of the user's roles grants `action`. File defaults + god's grant/revoke overrides.
export function can(user, action) {
  const rs = user?.roles || [];
  if (rs.some((r) => (ROLE_PERMISSIONS[r] || []).includes("*"))) return true; // god — never overridable
  if (typeof action !== "string") return false; // null-safe: unknown/missing action is not granted
  if (rs.some((r) => hasOverride(r, action, "grant"))) return true; // explicit grant wins
  return rs.some((r) => !hasOverride(r, action, "revoke") && baseGrants(r, action)); // default, unless revoked
}

// Hook form: const can = useCan(); ... {can('timetable.grid.manage') && <Button/>}
export function useCan() {
  const { user } = useAuth();
  return (action) => can(user, action);
}
