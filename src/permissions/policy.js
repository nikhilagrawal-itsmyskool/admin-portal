// Role → allowed actions (allow-list; default deny). UI-only today.
//   '*'            grants everything (god).
//   'module.*'     grants every action in a module.
//   'module.verb'  grants one action.
// Anything NOT listed for a role is denied — so "restore is god-only", purchase-log
// edit/restore, and timetable.manage are simply absent from admin and fall to god via '*'.
//
// Adding a role = one entry here. Adding an action = usually nothing (god '*' covers it);
// only edit the roles that should gain the new leaf.
export const ROLE_PERMISSIONS = {
  god: ["*"],
  admin: ["employee.manage", "timetable.print"],
};

// Roles to show as columns in the generated permissions.md matrix.
export const DOC_ROLES = ["god", "admin"];
