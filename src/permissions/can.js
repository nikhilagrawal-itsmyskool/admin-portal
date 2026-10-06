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
export function baseGrants(role, action) {
  return (ROLE_PERMISSIONS[role] || []).some(
    (p) =>
      p === "*" ||
      p === action ||
      (p.endsWith(".*") && action.startsWith(p.slice(0, -1))),
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
  if (rs.some((r) => hasOverride(r, action, "grant"))) return true; // explicit grant wins
  return rs.some((r) => !hasOverride(r, action, "revoke") && baseGrants(r, action)); // default, unless revoked
}

// Hook form: const can = useCan(); ... {can('timetable.manage') && <Button/>}
export function useCan() {
  const { user } = useAuth();
  return (action) => can(user, action);
}
