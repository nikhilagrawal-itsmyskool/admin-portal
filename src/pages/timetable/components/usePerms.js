import { useCan } from "../../../permissions/can";
import { ACTIONS } from "../../../permissions/actions";

// Timetable UI permissions, derived from the central policy (see src/permissions).
//   canMutate — create/edit/delete/lock/clone/generate/publish → timetable.manage (god).
//   canPrint  — print class/teacher/master timetables → timetable.print (admin or god).
export function useTimetablePerms() {
  const can = useCan();
  return {
    canMutate: can(ACTIONS.TIMETABLE_MANAGE),
    canPrint: can(ACTIONS.TIMETABLE_PRINT),
  };
}
