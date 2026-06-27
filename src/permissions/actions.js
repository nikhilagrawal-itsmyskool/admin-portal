// Canonical permission actions (UI-only today; see permissions.md).
// Coarse, namespaced keys: `module.area.verb`. Add a leaf here only when a role
// actually needs to branch on it; wildcards in policy.js cover breadth.
export const ACTIONS = {
  TIMETABLE_VIEW: "timetable.view",
  TIMETABLE_PRINT: "timetable.print",
  TIMETABLE_MANAGE: "timetable.manage",
  EMPLOYEE_MANAGE: "employee.manage",
  EMPLOYEE_RESTORE: "employee.restore",
  PURCHASE_LOG_EDIT: "purchaseLog.edit",
  PURCHASE_LOG_RESTORE: "purchaseLog.restore",
  STUDENT_MANAGE: "student.manage",
  STUDENT_VIEW_CONTACTS: "student.contacts.view",
};

// Catalog drives the generated permissions.md matrix. One line per action.
export const ACTION_CATALOG = [
  {
    action: ACTIONS.TIMETABLE_VIEW,
    description: "View timetable pages (open to all signed-in users)",
  },
  {
    action: ACTIONS.TIMETABLE_PRINT,
    description: "Print class / teacher / master timetables",
  },
  {
    action: ACTIONS.TIMETABLE_MANAGE,
    description:
      "Create/edit/delete subjects, class setup, grid config (lock/clone), wings, constraints; generate & publish",
  },
  {
    action: ACTIONS.EMPLOYEE_MANAGE,
    description: "Add, edit, delete employees; view & reset passwords",
  },
  {
    action: ACTIONS.EMPLOYEE_RESTORE,
    description: "Restore a deleted employee",
  },
  {
    action: ACTIONS.PURCHASE_LOG_EDIT,
    description:
      "Edit a purchase log entry (medical, lab, sports, supplies, …)",
  },
  {
    action: ACTIONS.PURCHASE_LOG_RESTORE,
    description: "Restore a deleted purchase log entry",
  },
  {
    action: ACTIONS.STUDENT_MANAGE,
    description:
      "Admit/edit/delete students, manage guardians & houses, assign house, promote/graduate",
  },
  {
    action: ACTIONS.STUDENT_VIEW_CONTACTS,
    description: "View unmasked parent/guardian phone, WhatsApp & email",
  },
];
