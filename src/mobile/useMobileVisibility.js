import { useState, useEffect, useCallback } from "react";
import { useCan } from "../permissions/can";
import { assemblyService } from "../services/assemblyService";
import { examinationService } from "../services/examinationService";
import { MOBILE_FEATURES } from "./mobileFeatures";

// Shared visibility predicate for the mobile surfaces (home tiles, hub screens, the
// mobile sidebar). A feature shows when the user's role grants its `perm` AND — for the
// assembly duty tiles — the runtime `derived` role matches. Admins (assembly.manage)
// bypass the derived gate; everyone else waits on /me/assembly/duties (isHouseMember /
// isEvaluator), fetched once here. Plain teachers resolve to both-false cheaply.
export function useMobileVisibility(enabled = true) {
  const can = useCan();
  const isAdmin = can("assembly.manage");
  // Assembly duty tiles (houseMember / evaluator): assembly.manage admins bypass the gate.
  const needsRoles =
    enabled && !isAdmin && MOBILE_FEATURES.some((f) => f.derived === "houseMember" || f.derived === "evaluator");
  // Class-teacher tiles (Co-Scholastic): resolved from the caller's class_teacher rows.
  const needsClassTeacher = enabled && MOBILE_FEATURES.some((f) => f.derived === "classTeacher");
  const [roles, setRoles] = useState(needsRoles ? null : {});
  const [isClassTeacher, setIsClassTeacher] = useState(needsClassTeacher ? null : false);

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

  useEffect(() => {
    let alive = true;
    if (needsClassTeacher) {
      examinationService
        .myReportClasses()
        .then((r) => alive && setIsClassTeacher((r?.classes?.length ?? 0) > 0))
        .catch(() => alive && setIsClassTeacher(false));
    }
    return () => {
      alive = false;
    };
  }, [needsClassTeacher]);

  const visible = useCallback(
    (f) => {
      if (f.perm && !can(f.perm)) return false;
      // Negative gate (mirrors the desktop sidebar): hide a tile from anyone who HAS
      // this action — e.g. hide the self-service "Leave" hub from an oversight user
      // (leave.manage) who never applies for their own leave.
      if (f.notPerm && can(f.notPerm)) return false;
      // Class-teacher tile (Co-Scholastic): only actual class teachers; NOT bypassed by
      // assembly.manage. Hidden until /me/report/classes resolves.
      if (f.derived === "classTeacher") return isClassTeacher === true;
      if (f.derived) {
        if (isAdmin) return true;
        if (!roles) return false; // hide derived tiles until roles resolve
        return f.derived === "houseMember" ? roles.isHouseMember : roles.isEvaluator;
      }
      return true;
    },
    [can, isAdmin, roles, isClassTeacher],
  );

  return {
    visible,
    ready: (!needsRoles || !!roles) && (!needsClassTeacher || isClassTeacher !== null),
  };
}
