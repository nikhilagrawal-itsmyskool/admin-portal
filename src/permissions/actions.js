// Canonical permission actions (UI-only today; see permissions.md).
// Coarse, namespaced keys: `module.area.verb`. Add a leaf here only when a role
// actually needs to branch on it; wildcards in policy.js cover breadth.
export const ACTIONS = {
  // Per-module view (see menu + read pages) / manage (add/edit/delete).
  // Medical inventory (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + medical-incharge hold the medical.* wildcard; teachers get the two read leaves.
  MEDICAL_INVENTORY_VIEW: "medical.inventory.view",
  MEDICAL_INVENTORY_MANAGE: "medical.inventory.manage",
  MEDICAL_PURCHASE_VIEW: "medical.purchase.view",
  MEDICAL_PURCHASE_MANAGE: "medical.purchase.manage",
  MEDICAL_ISSUE_VIEW: "medical.issue.view",
  MEDICAL_ISSUE_MANAGE: "medical.issue.manage",
  // Lab inventory (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + lab-incharge hold the lab.* wildcard; teachers get the two read leaves.
  LAB_SETUP_VIEW: "lab.setup.view",
  LAB_SETUP_MANAGE: "lab.setup.manage",
  LAB_INVENTORY_VIEW: "lab.inventory.view",
  LAB_INVENTORY_MANAGE: "lab.inventory.manage",
  LAB_PURCHASE_VIEW: "lab.purchase.view",
  LAB_PURCHASE_MANAGE: "lab.purchase.manage",
  LAB_ISSUE_VIEW: "lab.issue.view",
  LAB_ISSUE_MANAGE: "lab.issue.manage",
  LAB_BREAKAGE_VIEW: "lab.breakage.view",
  LAB_BREAKAGE_MANAGE: "lab.breakage.manage",
  // Disciplinary fines (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin holds the fine.* wildcard; no teacher access.
  FINE_INCIDENT_VIEW: "fine.incident.view",
  FINE_INCIDENT_MANAGE: "fine.incident.manage",
  FINE_COLLECTION_VIEW: "fine.collection.view",
  FINE_COLLECTION_MANAGE: "fine.collection.manage",
  // Fees — module.resource.action, NO fee.* wildcard (mirrors shared/lib/authz-policy.ts).
  FEE_REPORT_VIEW: "fee.report.view",
  FEE_COLLECT: "fee.collect.collect",
  FEE_STRUCTURE_MANAGE: "fee.structure.manage",
  FEE_CONCESSION_MANAGE: "fee.concession.manage", // create/edit/delete concession schemes (god-only)
  FEE_CONCESSION_ASSIGN: "fee.concession.assign", // add/remove students to a concession
  FEE_WAIVER_MANAGE: "fee.waiver.manage",         // god-only
  FEE_LATEFEE_MANAGE: "fee.latefee.manage",       // god-only
  FEE_TRANSPORT_MANAGE: "fee.transport.manage",   // god-only
  FEE_STUDENT_MANAGE: "fee.student.manage",       // withdraw / exam-only
  FEE_MANAGER_VIEW: "fee.manager.view",           // Collection Desk (manager gets this + exempt only)
  FEE_FINE_EXEMPT: "fee.fine.exempt",             // exempt a late fine (manager + god)
  FEE_RECEIPT_VERIFY: "fee.receipt.verify",       // Scan & Verify (admin + god)
  FEE_MIGRATION_IMPORT: "fee.migration.import",   // bulk import (god-only)
  // Uniform store (strict module.resource.action). Mirror of backend authz-policy.ts. admin wildcard; no teacher.
  UNIFORM_INVENTORY_VIEW: "uniform.inventory.view",
  UNIFORM_INVENTORY_MANAGE: "uniform.inventory.manage",
  UNIFORM_PURCHASE_VIEW: "uniform.purchase.view",
  UNIFORM_PURCHASE_MANAGE: "uniform.purchase.manage",
  UNIFORM_SET_VIEW: "uniform.set.view",
  UNIFORM_SET_MANAGE: "uniform.set.manage",
  UNIFORM_SALE_VIEW: "uniform.sale.view",
  UNIFORM_SALE_MANAGE: "uniform.sale.manage",
  // Shop / sets store (strict module.resource.action). admin wildcard; no teacher.
  SHOP_INVENTORY_VIEW: "shop.inventory.view",
  SHOP_INVENTORY_MANAGE: "shop.inventory.manage",
  SHOP_PURCHASE_VIEW: "shop.purchase.view",
  SHOP_PURCHASE_MANAGE: "shop.purchase.manage",
  SHOP_SET_VIEW: "shop.set.view",
  SHOP_SET_MANAGE: "shop.set.manage",
  SHOP_SALE_VIEW: "shop.sale.view",
  SHOP_SALE_MANAGE: "shop.sale.manage",
  // Sports equipment (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + sports-incharge hold the sports.* wildcard; teachers get the two read leaves.
  SPORTS_SETUP_VIEW: "sports.setup.view",
  SPORTS_SETUP_MANAGE: "sports.setup.manage",
  SPORTS_INVENTORY_VIEW: "sports.inventory.view",
  SPORTS_INVENTORY_MANAGE: "sports.inventory.manage",
  SPORTS_PURCHASE_VIEW: "sports.purchase.view",
  SPORTS_PURCHASE_MANAGE: "sports.purchase.manage",
  SPORTS_ISSUE_VIEW: "sports.issue.view",
  SPORTS_ISSUE_MANAGE: "sports.issue.manage",
  SPORTS_BREAKAGE_VIEW: "sports.breakage.view",
  SPORTS_BREAKAGE_MANAGE: "sports.breakage.manage",
  // Physical asset register (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + assets-incharge hold the asset.* wildcard; no teacher access.
  ASSET_REGISTER_VIEW: "asset.register.view",
  ASSET_REGISTER_MANAGE: "asset.register.manage",
  ASSET_TYPE_VIEW: "asset.type.view",
  ASSET_TYPE_MANAGE: "asset.type.manage",
  // Library (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + library-incharge hold the library.* wildcard; teachers get catalog.view (browse).
  LIBRARY_CATALOG_VIEW: "library.catalog.view",
  LIBRARY_CATALOG_MANAGE: "library.catalog.manage",
  LIBRARY_CIRCULATION_VIEW: "library.circulation.view",
  LIBRARY_CIRCULATION_MANAGE: "library.circulation.manage",
  LIBRARY_FINE_VIEW: "library.fine.view",
  LIBRARY_FINE_MANAGE: "library.fine.manage",
  LIBRARY_CONFIG_VIEW: "library.config.view",
  LIBRARY_CONFIG_MANAGE: "library.config.manage",
  // School supplies / consumables (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + supplies-incharge hold the supplies.* wildcard; teachers get inventory.view + issue.view.
  SUPPLIES_CATEGORY_VIEW: "supplies.category.view",
  SUPPLIES_CATEGORY_MANAGE: "supplies.category.manage",
  SUPPLIES_INVENTORY_VIEW: "supplies.inventory.view",
  SUPPLIES_INVENTORY_MANAGE: "supplies.inventory.manage",
  SUPPLIES_PURCHASE_VIEW: "supplies.purchase.view",
  SUPPLIES_PURCHASE_MANAGE: "supplies.purchase.manage",
  SUPPLIES_ISSUE_VIEW: "supplies.issue.view",
  SUPPLIES_ISSUE_MANAGE: "supplies.issue.manage",
  SUPPLIES_WASTAGE_VIEW: "supplies.wastage.view",
  SUPPLIES_WASTAGE_MANAGE: "supplies.wastage.manage",
  TIMETABLE_VIEW: "timetable.view",
  TIMETABLE_PRINT: "timetable.print",
  TIMETABLE_MANAGE: "timetable.manage",
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_MANAGE: "employee.manage",
  EMPLOYEE_RESTORE: "employee.restore",
  // Force an employee to sign out and back in (bumps the login's session version). God-only by
  // default (listed on no role; god's '*' covers it) — grant to admin from the Permissions grid.
  EMPLOYEE_SESSION_RESET: "employee.session.reset",
  PURCHASE_LOG_EDIT: "purchaseLog.edit",
  PURCHASE_LOG_RESTORE: "purchaseLog.restore",
  STUDENT_VIEW: "student.view",
  STUDENT_MANAGE: "student.manage",
  STUDENT_VIEW_CONTACTS: "student.contacts.view",
  // Attendance (module.resource.action). session.mark = take roll-call (roster/sessions/save +
  // read config); session.finalize = finalize & edit records; record.view = read a student's own
  // attendance history (the 360 card — teachers + admin); config.manage = the per-school Attendance
  // Config screen (half-day policy), god-only by default (god grants admin via the grid if wanted).
  ATTENDANCE_MARK: "attendance.session.mark",
  ATTENDANCE_FINALIZE: "attendance.session.finalize",
  ATTENDANCE_RECORD_VIEW: "attendance.record.view",
  ATTENDANCE_CONFIG_MANAGE: "attendance.config.manage",
  COMMUNICATION_SEND: "communication.send",
  COMMUNICATION_TEMPLATE_MANAGE: "communication.template.manage",
  COMMUNICATION_TEMPLATE_DELETE: "communication.template.delete",
  // Recruitment/hiring (strict module.resource.action). Mirror of backend authz-policy.ts.
  // admin + hiring-incharge; no teacher.
  HIRING_CANDIDATE_VIEW: "hiring.candidate.view",
  HIRING_CANDIDATE_MANAGE: "hiring.candidate.manage",
  TRANSPORT_VIEW: "transport.view",
  TRANSPORT_MANAGE: "transport.manage",
  TRANSPORT_ATTENDANCE_MARK: "transport.attendance.mark",
  TRANSPORT_ATTENDANCE_FINALIZE: "transport.attendance.finalize",
  TRANSFER_VIEW: "transfer.view",
  TRANSFER_MANAGE: "transfer.manage",
  SYLLABUS_VIEW: "syllabus.view",
  SYLLABUS_MANAGE: "syllabus.manage",
  SYLLABUS_PROGRESS_MARK: "syllabus.progress.mark",
  ASSEMBLY_VIEW: "assembly.view",
  ASSEMBLY_MANAGE: "assembly.manage",
  // Daily homework (strict module.resource.action). Mirror of backend authz-policy.ts.
  HOMEWORK_DAY_VIEW: "homework.day.view",
  HOMEWORK_DAY_POST: "homework.day.post",
  HOMEWORK_DAY_MANAGE: "homework.day.manage",
  ACADEMIC_CALENDAR_VIEW: "academic-calendar.view",
  ACADEMIC_CALENDAR_MANAGE: "academic-calendar.manage",
  // Examination — strict module.resource.action convention; no exam.* wildcard (explicit role lists
  // in policy.js) so god-only leaves aren't swallowed. Mirror of backend authz-policy.ts.
  EXAM_VIEW: "exam.schedule.view",
  EXAM_MANAGE: "exam.schedule.manage",
  EXAM_PROGRESS_VIEW: "exam.progress.view",
  EXAM_REPORTCARD_MANAGE: "exam.reportcard.manage",
  EXAM_FORMAT_MANAGE: "exam.format.manage",
  EXAM_REMARK_MANAGE: "exam.remark.manage",
  EXAM_MAPPING_MANAGE: "exam.mapping.manage",
  EXAM_MARKS_OVERRIDE: "exam.marks.override",
  EXAM_MARKS_LOCK: "exam.marks.lock",
  EXAM_CLASS_EXCLUDE: "exam.class.exclude",
  EXAM_DUES_OVERRIDE: "exam.dues.override",
  // God-only: edit the role→permission overrides from the Permissions grid.
  AUTHZ_MANAGE: "authz.manage",
  // Developmental programmes (Spoken English & Life Communication, …). view = the
  // teacher Class→Month→Theme reader + catalog (teacher/admin); manage = author units
  // + re-upload source docs (admin/god/programme-incharge).
  PROGRAMME_VIEW: "programme.view",
  PROGRAMME_MANAGE: "programme.manage",
  // Voice/LLM student assistant. Granted to NO role -> god-only (god's '*' covers it).
  ASSISTANT_USE: "assistant.use",
  // Staff leave (strict module.resource.action). Mirror of backend authz-policy.ts.
  // calendar.view (shared who's-on-leave) + application.apply (self-service) are teacher/admin;
  // all oversight/config/biometric/deduction are GOD ONLY for now (god opens cells per-role
  // via the Permissions grid — no live "director" role yet).
  LEAVE_CALENDAR_VIEW: "leave.calendar.view",
  LEAVE_APPLICATION_APPLY: "leave.application.apply",
  LEAVE_APPLICATION_VIEW: "leave.application.view",
  LEAVE_APPLICATION_APPROVE: "leave.application.approve",
  LEAVE_CONFIG_VIEW: "leave.config.view",
  LEAVE_CONFIG_MANAGE: "leave.config.manage",
  LEAVE_ATTENDANCE_VIEW: "leave.attendance.view",
  LEAVE_ATTENDANCE_MANAGE: "leave.attendance.manage",
  LEAVE_DEDUCTION_VIEW: "leave.deduction.view",
  LEAVE_DEDUCTION_MANAGE: "leave.deduction.manage",
  // Home-visit feedback / complaints. view = read category lookup (teachers, to record);
  // record = log + assign to a teacher (teachers); respond = the assigned teacher's reply
  // (teachers, own items only); review = director dashboard + complete/reopen. `review` is
  // deliberately OUTSIDE any namespace admin inherits, so it is god-only until a real
  // `education-director` role is introduced (grant it feedback.review then).
  FEEDBACK_VIEW: "feedback.view",
  FEEDBACK_RECORD: "feedback.record",
  FEEDBACK_RESPOND: "feedback.respond",
  FEEDBACK_REVIEW: "feedback.review",
  // Director's Cockpit / School Pulse — the at-a-glance heartbeat landing. Granted to the
  // `director` role (god's '*' covers it). Read-only; drill-downs deep-link into the real
  // screens, each gated by its own action.
  COCKPIT_VIEW: "cockpit.view",
  // Clubs & Activities (per-school display name e.g. "Saturday Activities"). Strict
  // module.resource.action across setup | activity | plan; no club.* wildcard. Mirror of
  // backend authz-policy.ts.
  CLUB_SETUP_VIEW: "club.setup.view",
  CLUB_SETUP_MANAGE: "club.setup.manage",
  CLUB_ACTIVITY_VIEW: "club.activity.view",
  CLUB_ACTIVITY_MANAGE: "club.activity.manage",
  CLUB_ACTIVITY_APPROVE: "club.activity.approve",
  CLUB_ACTIVITY_REVIEW: "club.activity.review",
  CLUB_PLAN_VIEW: "club.plan.view",
  CLUB_PLAN_MANAGE: "club.plan.manage",
  CLUB_PLAN_PUBLISH: "club.plan.publish",
  CLUB_PLAN_CONDUCT: "club.plan.conduct",
};

// Catalog drives the generated permissions.md matrix. One line per action.
export const ACTION_CATALOG = [
  {
    action: ACTIONS.MEDICAL_INVENTORY_VIEW,
    description: "View medical inventory items & stock (teacher/admin/medical-incharge)",
  },
  {
    action: ACTIONS.MEDICAL_INVENTORY_MANAGE,
    description: "Add / edit / delete medical inventory items",
  },
  {
    action: ACTIONS.MEDICAL_PURCHASE_VIEW,
    description: "View medical purchases, batches, expiring stock & bills",
  },
  {
    action: ACTIONS.MEDICAL_PURCHASE_MANAGE,
    description: "Record / edit / delete medical purchases, batches & bills",
  },
  {
    action: ACTIONS.MEDICAL_ISSUE_VIEW,
    description: "View the medical issue log (what has been issued)",
  },
  {
    action: ACTIONS.MEDICAL_ISSUE_MANAGE,
    description: "Record / edit / delete medical issues",
  },
  {
    action: ACTIONS.LAB_SETUP_VIEW,
    description: "View the Labs registry & lookups",
  },
  {
    action: ACTIONS.LAB_SETUP_MANAGE,
    description: "Create / edit / delete labs (the Labs registry)",
  },
  {
    action: ACTIONS.LAB_INVENTORY_VIEW,
    description: "View lab inventory items & stock (teacher/admin/lab-incharge)",
  },
  {
    action: ACTIONS.LAB_INVENTORY_MANAGE,
    description: "Add / edit / delete lab inventory items",
  },
  {
    action: ACTIONS.LAB_PURCHASE_VIEW,
    description: "View lab purchases, batches, alerts & bills",
  },
  {
    action: ACTIONS.LAB_PURCHASE_MANAGE,
    description: "Record / edit / delete lab purchases, batches & bills",
  },
  {
    action: ACTIONS.LAB_ISSUE_VIEW,
    description: "View the lab issue log (what has been issued)",
  },
  {
    action: ACTIONS.LAB_ISSUE_MANAGE,
    description: "Record / edit / delete / return lab issues",
  },
  {
    action: ACTIONS.LAB_BREAKAGE_VIEW,
    description: "View the lab breakage log",
  },
  {
    action: ACTIONS.LAB_BREAKAGE_MANAGE,
    description: "Record / edit / delete lab breakages",
  },
  {
    action: ACTIONS.FINE_INCIDENT_VIEW,
    description: "View fine incidents, evidence, notes & lookups",
  },
  {
    action: ACTIONS.FINE_INCIDENT_MANAGE,
    description: "Create / edit / delete fine incidents, evidence & notes",
  },
  {
    action: ACTIONS.FINE_COLLECTION_VIEW,
    description: "View fine collections & receipts",
  },
  {
    action: ACTIONS.FINE_COLLECTION_MANAGE,
    description: "Record fine collection",
  },
  {
    action: ACTIONS.FEE_REPORT_VIEW,
    description: "See the Fees menu, read dues/reports/receipts & a student's fee ledger",
  },
  {
    action: ACTIONS.FEE_COLLECT,
    description: "Collect fees, issue/cancel receipts, apply advance & record refunds",
  },
  {
    action: ACTIONS.FEE_STRUCTURE_MANAGE,
    description: "Add/edit fee heads, cycles, structure & run charge generation",
  },
  {
    action: ACTIONS.FEE_CONCESSION_MANAGE,
    description: "Create/edit/delete concession schemes (god-only)",
  },
  {
    action: ACTIONS.FEE_CONCESSION_ASSIGN,
    description: "Add/remove students to a concession & mid-year concession changes",
  },
  {
    action: ACTIONS.FEE_WAIVER_MANAGE,
    description: "Create/remove waivers, incl. the Collect write-off (god-only)",
  },
  {
    action: ACTIONS.FEE_LATEFEE_MANAGE,
    description: "Create/edit late-fee rules & apply fines (god-only)",
  },
  {
    action: ACTIONS.FEE_TRANSPORT_MANAGE,
    description: "Add/edit transport fee slabs (god-only)",
  },
  {
    action: ACTIONS.FEE_STUDENT_MANAGE,
    description: "Withdraw a student & mark exam-only",
  },
  {
    action: ACTIONS.FEE_MANAGER_VIEW,
    description: "Read-only Collection Desk (simplified manager view)",
  },
  {
    action: ACTIONS.FEE_FINE_EXEMPT,
    description: "Exempt a student's late fine (manager + god only)",
  },
  {
    action: ACTIONS.FEE_RECEIPT_VERIFY,
    description: "Scan & Verify receipts (admin + god only)",
  },
  { action: ACTIONS.UNIFORM_INVENTORY_VIEW, description: "View uniform items & stock" },
  { action: ACTIONS.UNIFORM_INVENTORY_MANAGE, description: "Add / edit / delete uniform items & sizes" },
  { action: ACTIONS.UNIFORM_PURCHASE_VIEW, description: "View uniform purchases & bills" },
  { action: ACTIONS.UNIFORM_PURCHASE_MANAGE, description: "Record / edit / delete uniform purchases & bills" },
  { action: ACTIONS.UNIFORM_SET_VIEW, description: "View uniform sets" },
  { action: ACTIONS.UNIFORM_SET_MANAGE, description: "Create / edit / delete uniform sets" },
  { action: ACTIONS.UNIFORM_SALE_VIEW, description: "View uniform sales & returns" },
  { action: ACTIONS.UNIFORM_SALE_MANAGE, description: "Record sales, payments & returns" },
  { action: ACTIONS.SHOP_INVENTORY_VIEW, description: "View shop items & stock" },
  { action: ACTIONS.SHOP_INVENTORY_MANAGE, description: "Add / edit / delete shop items" },
  { action: ACTIONS.SHOP_PURCHASE_VIEW, description: "View shop purchases, intake & bills" },
  { action: ACTIONS.SHOP_PURCHASE_MANAGE, description: "Record / edit / delete shop purchases, intake & bills" },
  { action: ACTIONS.SHOP_SET_VIEW, description: "View shop sets & stock" },
  { action: ACTIONS.SHOP_SET_MANAGE, description: "Create / edit / delete shop sets" },
  { action: ACTIONS.SHOP_SALE_VIEW, description: "View shop sales & assignments" },
  { action: ACTIONS.SHOP_SALE_MANAGE, description: "Record / assign shop sales" },
  {
    action: ACTIONS.SPORTS_SETUP_VIEW,
    description: "View sport in-charges & lookups",
  },
  {
    action: ACTIONS.SPORTS_SETUP_MANAGE,
    description: "Set sport in-charges",
  },
  {
    action: ACTIONS.SPORTS_INVENTORY_VIEW,
    description: "View sports equipment items & stock (teacher/admin/sports-incharge)",
  },
  {
    action: ACTIONS.SPORTS_INVENTORY_MANAGE,
    description: "Add / edit / delete sports equipment items",
  },
  {
    action: ACTIONS.SPORTS_PURCHASE_VIEW,
    description: "View sports purchases, batches & bills",
  },
  {
    action: ACTIONS.SPORTS_PURCHASE_MANAGE,
    description: "Record / edit / delete sports purchases, batches & bills",
  },
  {
    action: ACTIONS.SPORTS_ISSUE_VIEW,
    description: "View the sports issue log (what has been issued)",
  },
  {
    action: ACTIONS.SPORTS_ISSUE_MANAGE,
    description: "Record / edit / delete / return sports issues",
  },
  {
    action: ACTIONS.SPORTS_BREAKAGE_VIEW,
    description: "View the sports breakage log",
  },
  {
    action: ACTIONS.SPORTS_BREAKAGE_MANAGE,
    description: "Record / edit / delete sports breakages",
  },
  {
    action: ACTIONS.ASSET_REGISTER_VIEW,
    description: "View the asset register (tree), counts, responsibility & movements",
  },
  {
    action: ACTIONS.ASSET_REGISTER_MANAGE,
    description: "Add / edit / delete / move / individualize assets & set responsibility",
  },
  {
    action: ACTIONS.ASSET_TYPE_VIEW,
    description: "View the per-school asset-type master",
  },
  {
    action: ACTIONS.ASSET_TYPE_MANAGE,
    description: "Create / edit / delete asset types",
  },
  {
    action: ACTIONS.LIBRARY_CATALOG_VIEW,
    description: "Browse the catalog — works, titles, copies, labels (teacher/admin/library-incharge)",
  },
  {
    action: ACTIONS.LIBRARY_CATALOG_MANAGE,
    description: "Create / edit catalog works, titles, copies; print labels",
  },
  {
    action: ACTIONS.LIBRARY_CIRCULATION_VIEW,
    description: "View issues / returns / renewals (loans)",
  },
  {
    action: ACTIONS.LIBRARY_CIRCULATION_MANAGE,
    description: "Issue / return / renew books",
  },
  {
    action: ACTIONS.LIBRARY_FINE_VIEW,
    description: "View overdue / lost library fines",
  },
  {
    action: ACTIONS.LIBRARY_FINE_MANAGE,
    description: "Collect / waive library fines",
  },
  {
    action: ACTIONS.LIBRARY_CONFIG_VIEW,
    description: "Read circulation policy + per-school lookups",
  },
  {
    action: ACTIONS.LIBRARY_CONFIG_MANAGE,
    description: "Edit circulation policy + lookups (the Settings screen)",
  },
  {
    action: ACTIONS.SUPPLIES_CATEGORY_VIEW,
    description: "View supply categories",
  },
  {
    action: ACTIONS.SUPPLIES_CATEGORY_MANAGE,
    description: "Create / edit / delete supply categories",
  },
  {
    action: ACTIONS.SUPPLIES_INVENTORY_VIEW,
    description: "View supply items & stock (teacher/admin/supplies-incharge)",
  },
  {
    action: ACTIONS.SUPPLIES_INVENTORY_MANAGE,
    description: "Add / edit / delete / merge supply items",
  },
  {
    action: ACTIONS.SUPPLIES_PURCHASE_VIEW,
    description: "View supply purchases, batches & bills",
  },
  {
    action: ACTIONS.SUPPLIES_PURCHASE_MANAGE,
    description: "Record / edit / delete supply purchases, batches & bills",
  },
  {
    action: ACTIONS.SUPPLIES_ISSUE_VIEW,
    description: "View the supply issue log (what has been issued)",
  },
  {
    action: ACTIONS.SUPPLIES_ISSUE_MANAGE,
    description: "Record / edit / delete / return supply issues",
  },
  {
    action: ACTIONS.SUPPLIES_WASTAGE_VIEW,
    description: "View the supply wastage log",
  },
  {
    action: ACTIONS.SUPPLIES_WASTAGE_MANAGE,
    description: "Record / edit / delete supply wastage",
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
    action: ACTIONS.EMPLOYEE_SESSION_RESET,
    description: "Force an employee to sign out and back in (e.g. after a role change) — god-only by default",
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
    action: ACTIONS.ATTENDANCE_RECORD_VIEW,
    description:
      "View a single student's attendance history on the 360 view (teachers + admin)",
  },
  {
    action: ACTIONS.ATTENDANCE_MARK,
    description:
      "Take daily roll-call: open a session, load the roster, mark & save statuses (admin + class teachers)",
  },
  {
    action: ACTIONS.ATTENDANCE_FINALIZE,
    description:
      "Finalize a daily attendance session and edit records after finalize (marking & viewing are open to all staff)",
  },
  {
    action: ACTIONS.ATTENDANCE_CONFIG_MANAGE,
    description:
      "Manage the per-school Attendance Config (how a half-day counts toward attendance %) — god-only by default",
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
    action: ACTIONS.HIRING_CANDIDATE_VIEW,
    description: "View candidates, stages, files & lookups",
  },
  {
    action: ACTIONS.HIRING_CANDIDATE_MANAGE,
    description:
      "Add/edit/delete candidates, interview stages, files & final decisions",
  },
  {
    action: ACTIONS.TRANSPORT_VIEW,
    description: "See the Transport menu and read its pages",
  },
  {
    action: ACTIONS.TRANSPORT_MANAGE,
    description:
      "Add/edit/delete stops, vehicles, routes, route stops & student assignments",
  },
  {
    action: ACTIONS.TRANSPORT_ATTENDANCE_MARK,
    description:
      "Reach the bus-attendance screens and mark attendance — for admin/god/transport-incharge on any route, and a transport-attendance teacher only on routes they're staffed on",
  },
  {
    action: ACTIONS.TRANSPORT_ATTENDANCE_FINALIZE,
    description:
      "Finalize a transport (bus) attendance session and edit records after finalize (admin/god/transport-incharge only)",
  },
  {
    action: ACTIONS.TRANSFER_VIEW,
    description: "See the Transfer menu and search/read transfer certificate records",
  },
  {
    action: ACTIONS.TRANSFER_MANAGE,
    description: "Apply for and issue transfer certificates (issuing withdraws the student)",
  },
  {
    action: ACTIONS.SYLLABUS_VIEW,
    description: "See the Syllabus menu and read subjects, plans and progress",
  },
  {
    action: ACTIONS.SYLLABUS_MANAGE,
    description: "Add/edit/delete syllabus subjects, plans and their topic entries",
  },
  {
    action: ACTIONS.SYLLABUS_PROGRESS_MARK,
    description: "Mark syllabus topics covered/pending for a class section",
  },
  {
    action: ACTIONS.ASSEMBLY_VIEW,
    description: "See the Assembly menu and read plans, special assemblies and themes",
  },
  {
    action: ACTIONS.ASSEMBLY_MANAGE,
    description: "Add/edit/delete/publish assembly plans, nodes, special assemblies & themes",
  },
  {
    action: ACTIONS.HOMEWORK_DAY_VIEW,
    description: "View any class's homework days + the class-teacher mapping & audit (oversight)",
  },
  {
    action: ACTIONS.HOMEWORK_DAY_POST,
    description: "Post, edit, remove and publish/unpublish a class's daily homework photos",
  },
  {
    action: ACTIONS.HOMEWORK_DAY_MANAGE,
    description: "Oversight edits + override which teacher is the homework class-teacher",
  },
  {
    action: ACTIONS.ACADEMIC_CALENDAR_VIEW,
    description: "See the Academic Calendar menu and read the year's entries & holidays",
  },
  {
    action: ACTIONS.ACADEMIC_CALENDAR_MANAGE,
    description: "Add/edit/delete calendar entries, holidays & columns, and import from Excel",
  },
  {
    action: ACTIONS.EXAM_VIEW,
    description: "See the Examinations menu and read exam schedules, datesheets & invigilator assignments",
  },
  {
    action: ACTIONS.EXAM_MANAGE,
    description: "Create/edit/delete/publish examinations, datesheet papers & invigilator assignments",
  },
  {
    action: ACTIONS.PROGRAMME_VIEW,
    description: "See the Programmes menu and read a programme's monthly units (Class → Month → Theme)",
  },
  {
    action: ACTIONS.PROGRAMME_MANAGE,
    description: "Author programme units and re-upload class-module source documents",
  },
  {
    action: ACTIONS.ASSISTANT_USE,
    description: "Use the voice/LLM student assistant (god-only)",
  },
  {
    action: ACTIONS.LEAVE_CALENDAR_VIEW,
    description: "See the shared who's-on-leave calendar + a listed person's coverage handover (teacher/admin)",
  },
  {
    action: ACTIONS.LEAVE_APPLICATION_APPLY,
    description: "Apply for / cancel your own leave and see your own attendance & penalty (teacher/admin)",
  },
  {
    action: ACTIONS.LEAVE_APPLICATION_VIEW,
    description: "Oversight read: one application's full detail, audit, uploaded attachment, balance & summary (god-only)",
  },
  {
    action: ACTIONS.LEAVE_APPLICATION_APPROVE,
    description: "Approve / reject leave applications (god-only)",
  },
  {
    action: ACTIONS.LEAVE_CONFIG_VIEW,
    description: "Read the leave policy config + leave-type master (god-only)",
  },
  {
    action: ACTIONS.LEAVE_CONFIG_MANAGE,
    description: "Edit the leave policy config + leave types (god-only)",
  },
  {
    action: ACTIONS.LEAVE_ATTENDANCE_VIEW,
    description: "View biometric attendance, the day view & employee↔device mapping (god-only)",
  },
  {
    action: ACTIONS.LEAVE_ATTENDANCE_MANAGE,
    description: "Mark & import biometric attendance (file / TimeWatch) and enroll device mappings (god-only)",
  },
  {
    action: ACTIONS.LEAVE_DEDUCTION_VIEW,
    description: "View deduction (LOP) runs and an employee's deductions (god-only)",
  },
  {
    action: ACTIONS.LEAVE_DEDUCTION_MANAGE,
    description: "Run / finalize deduction (LOP) batches (god-only)",
  },
  {
    action: ACTIONS.FEEDBACK_VIEW,
    description: "Read the feedback category lookup (needed to record a home-visit feedback)",
  },
  {
    action: ACTIONS.FEEDBACK_RECORD,
    description: "Record a home-visit feedback for a student and assign it to a teacher (teachers)",
  },
  {
    action: ACTIONS.FEEDBACK_RESPOND,
    description: "See feedback assigned to you and add your response comment (teachers, own items only)",
  },
  {
    action: ACTIONS.FEEDBACK_REVIEW,
    description: "Open the feedback dashboard, see the teacher-wise breakup, and complete/reopen feedback (education director; god-only for now)",
  },
  {
    action: ACTIONS.COCKPIT_VIEW,
    description: "See the Director's Cockpit / School Pulse heartbeat (director + god)",
  },
  {
    action: ACTIONS.CLUB_SETUP_VIEW,
    description: "See the Clubs & Activities menu, clubs and programme settings",
  },
  {
    action: ACTIONS.CLUB_SETUP_MANAGE,
    description: "Create/edit clubs, their configuration, enabled blocks & programme settings",
  },
  {
    action: ACTIONS.CLUB_ACTIVITY_VIEW,
    description: "See the activity bank (clubs' versioned activities)",
  },
  {
    action: ACTIONS.CLUB_ACTIVITY_MANAGE,
    description: "Edit activity content, create revision drafts, materials, resources & bulk import",
  },
  {
    action: ACTIONS.CLUB_ACTIVITY_APPROVE,
    description: "Release/trial/supersede an activity version and suspend/archive an activity",
  },
  {
    action: ACTIONS.CLUB_ACTIVITY_REVIEW,
    description: "Work the activity review queue — keep as is / create revision / suspend / archive",
  },
  {
    action: ACTIONS.CLUB_PLAN_VIEW,
    description: "See the weekly plan board and published plans",
  },
  {
    action: ACTIONS.CLUB_PLAN_MANAGE,
    description: "Build and edit a draft weekly plan — slots, groups, assignments, copy previous",
  },
  {
    action: ACTIONS.CLUB_PLAN_PUBLISH,
    description: "Publish a plan, make after-publish changes, cancel an assignment, close/reopen",
  },
  {
    action: ACTIONS.CLUB_PLAN_CONDUCT,
    description: "Open your own club assignment guide and submit quick closure / report a safety issue",
  },
];
