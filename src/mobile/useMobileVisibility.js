import { useState, useEffect, useCallback } from "react";
import { useCan } from "../permissions/can";
import { assemblyService } from "../services/assemblyService";
import { MOBILE_FEATURES } from "./mobileFeatures";

// Shared visibility predicate for the mobile surfaces (home tiles, hub screens, the
// mobile sidebar). A feature shows when the user's role grants its `perm` AND — for the
// assembly duty tiles — the runtime `derived` role matches. Admins (assembly.manage)
// bypass the derived gate; everyone else waits on /me/assembly/duties (isHouseMember /
// isEvaluator), fetched once here. Plain teachers resolve to both-false cheaply.
export function useMobileVisibility(enabled = true) {
  const can = useCan();
  const isAdmin = can("assembly.manage");
  const needsRoles = enabled && !isAdmin && MOBILE_FEATURES.some((f) => f.derived);
  const [roles, setRoles] = useState(needsRoles ? null : {});

  useEffect(() => {
    let alive = true;
    if (needsRoles) {
      assemblyService
        .myRoles()
        .then((r) => alive && setRoles(r))
        .catch(() => alive && setRoles({}));
    }
    return () => {
      alive = false;
    };
  }, [needsRoles]);

  const visible = useCallback(
    (f) => {
      if (f.perm && !can(f.perm)) return false;
      // Negative gate (mirrors the desktop sidebar): hide a tile from anyone who HAS
      // this action — e.g. hide the self-service "Leave" hub from an oversight user
      // (leave.manage) who never applies for their own leave.
      if (f.notPerm && can(f.notPerm)) return false;
      if (f.derived) {
        if (isAdmin) return true;
        if (!roles) return false; // hide derived tiles until roles resolve
        return f.derived === "houseMember" ? roles.isHouseMember : roles.isEvaluator;
      }
      return true;
    },
    [can, isAdmin, roles],
  );

  return { visible, ready: !needsRoles || !!roles };
}
