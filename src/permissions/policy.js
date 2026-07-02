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
  admin: [
    "medical.*",
    "lab.*",
    "fine.*",
    "uniform.*",
    "shop.*",
    "sports.*",
    "asset.*",
    "library.*",
    "supplies.*",
    "employee.view",
    "employee.manage",
    "timetable.view",
    "timetable.print",
    "student.view",
    "student.manage",
    "student.contacts.view",
    "attendance.finalize",
    "communication.send",
    "communication.template.manage",
    "hiring.view",
    "hiring.manage",
  ],
  // Standard teaching staff: view-only across the modules they can reach.
  teacher: [
    "sports.view",
    "asset.view",
    "library.view",
    "supplies.view",
    "timetable.view", // Published timetable only (menu gates the rest)
    "student.view",
    "employee.view",
  ],
  // Each in-charge === admin, but scoped to its own module.
  "medical-incharge": ["medical.*"],
  "lab-incharge": ["lab.*"],
  "sports-incharge": ["sports.*"],
  "assets-incharge": ["asset.*"],
  "library-incharge": ["library.*"],
  "supplies-incharge": ["supplies.*"],
  "hiring-incharge": ["hiring.*"],
};

// Roles to show as columns in the generated permissions.md matrix.
export const DOC_ROLES = [
  "god",
  "admin",
  "teacher",
  "medical-incharge",
  "lab-incharge",
  "sports-incharge",
  "assets-incharge",
  "library-incharge",
  "supplies-incharge",
  "hiring-incharge",
];
