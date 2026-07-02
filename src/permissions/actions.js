// Canonical permission actions (UI-only today; see permissions.md).
// Coarse, namespaced keys: `module.area.verb`. Add a leaf here only when a role
// actually needs to branch on it; wildcards in policy.js cover breadth.
export const ACTIONS = {
  // Per-module view (see menu + read pages) / manage (add/edit/delete).
  MEDICAL_VIEW: "medical.view",
  MEDICAL_MANAGE: "medical.manage",
  LAB_VIEW: "lab.view",
  LAB_MANAGE: "lab.manage",
  FINE_VIEW: "fine.view",
  FINE_MANAGE: "fine.manage",
  UNIFORM_VIEW: "uniform.view",
  UNIFORM_MANAGE: "uniform.manage",
  SHOP_VIEW: "shop.view",
  SHOP_MANAGE: "shop.manage",
  SPORTS_VIEW: "sports.view",
  SPORTS_MANAGE: "sports.manage",
  ASSET_VIEW: "asset.view",
  ASSET_MANAGE: "asset.manage",
  LIBRARY_VIEW: "library.view",
  LIBRARY_MANAGE: "library.manage",
  SUPPLIES_VIEW: "supplies.view",
  SUPPLIES_MANAGE: "supplies.manage",
  TIMETABLE_VIEW: "timetable.view",
  TIMETABLE_PRINT: "timetable.print",
  TIMETABLE_MANAGE: "timetable.manage",
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_MANAGE: "employee.manage",
  EMPLOYEE_RESTORE: "employee.restore",
  PURCHASE_LOG_EDIT: "purchaseLog.edit",
  PURCHASE_LOG_RESTORE: "purchaseLog.restore",
  STUDENT_VIEW: "student.view",
  STUDENT_MANAGE: "student.manage",
  STUDENT_VIEW_CONTACTS: "student.contacts.view",
  ATTENDANCE_FINALIZE: "attendance.finalize",
  COMMUNICATION_SEND: "communication.send",
  COMMUNICATION_TEMPLATE_MANAGE: "communication.template.manage",
  COMMUNICATION_TEMPLATE_DELETE: "communication.template.delete",
  HIRING_VIEW: "hiring.view",
  HIRING_MANAGE: "hiring.manage",
};

// Catalog drives the generated permissions.md matrix. One line per action.
export const ACTION_CATALOG = [
  {
    action: ACTIONS.MEDICAL_VIEW,
    description: "See the Medical menu and read its pages",
  },
  {
    action: ACTIONS.MEDICAL_MANAGE,
    description: "Add/edit/delete medical items, purchases & issues",
  },
  {
    action: ACTIONS.LAB_VIEW,
    description: "See the Laboratory menu and read its pages",
  },
  {
    action: ACTIONS.LAB_MANAGE,
    description: "Add/edit/delete labs, items, purchases, issues & breakages",
  },
  {
    action: ACTIONS.FINE_VIEW,
    description: "See the Fines menu and read its pages",
  },
  {
    action: ACTIONS.FINE_MANAGE,
    description: "Add/edit/delete fine incidents",
  },
  {
    action: ACTIONS.UNIFORM_VIEW,
    description: "See the Uniform menu and read its pages",
  },
  {
    action: ACTIONS.UNIFORM_MANAGE,
    description: "Add/edit/delete uniform catalog, purchases, sets & sales",
  },
  {
    action: ACTIONS.SHOP_VIEW,
    description: "See the Shop menu and read its pages",
  },
  {
    action: ACTIONS.SHOP_MANAGE,
    description: "Add/edit/delete shop catalog, purchases, sets & sales",
  },
  {
    action: ACTIONS.SPORTS_VIEW,
    description: "See the Sports menu and read its pages",
  },
  {
    action: ACTIONS.SPORTS_MANAGE,
    description: "Add/edit/delete sports items, in-charges, issues & breakages",
  },
  {
    action: ACTIONS.ASSET_VIEW,
    description: "See the Assets menu and read its pages",
  },
  {
    action: ACTIONS.ASSET_MANAGE,
    description: "Add/edit/delete asset register, counts & types",
  },
  {
    action: ACTIONS.LIBRARY_VIEW,
    description: "See the Library menu and read its pages",
  },
  {
    action: ACTIONS.LIBRARY_MANAGE,
    description: "Add/edit/delete catalog, circulation, fines & settings",
  },
  {
    action: ACTIONS.SUPPLIES_VIEW,
    description: "See the Supplies menu and read its pages",
  },
  {
    action: ACTIONS.SUPPLIES_MANAGE,
    description: "Add/edit/delete supplies categories, items, issues & wastage",
  },
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
    action: ACTIONS.EMPLOYEE_VIEW,
    description: "See the Employees menu, search the list, open a read-only detail (incl. self)",
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
    action: ACTIONS.STUDENT_VIEW,
    description: "See the Students menu and view/search the student list",
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
  {
    action: ACTIONS.ATTENDANCE_FINALIZE,
    description:
      "Finalize a daily attendance session and edit records after finalize (marking & viewing are open to all staff)",
  },
  {
    action: ACTIONS.COMMUNICATION_SEND,
    description: "Compose, schedule, preview, send and cancel SMS/WhatsApp messages",
  },
  {
    action: ACTIONS.COMMUNICATION_TEMPLATE_MANAGE,
    description: "Create, edit and activate message templates",
  },
  {
    action: ACTIONS.COMMUNICATION_TEMPLATE_DELETE,
    description: "Delete or restore a message template",
  },
  {
    action: ACTIONS.HIRING_VIEW,
    description: "See the Hiring menu and read candidate records",
  },
  {
    action: ACTIONS.HIRING_MANAGE,
    description:
      "Add/edit/delete candidates, interview stages, files & final decisions",
  },
];
