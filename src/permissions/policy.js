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
    "fee.report.view",
    "fee.collect.collect",
    "fee.structure.manage",
    "fee.concession.assign",
    "fee.student.manage",
    "fee.manager.view",
    "uniform.*",
    "shop.*",
    "sports.*",
    "asset.*",
    "library.*",
    "supplies.*",
    "employee.record.view",
    "employee.record.manage",
    "timetable.grid.view",
    "timetable.grid.print",
    "student.record.view",
    "student.record.manage",
    "student.contacts.view",
    "attendance.session.mark",
    "attendance.session.finalize",
    "attendance.record.view",
    // attendance.config.manage is god-only by default (not here); god grants admin via the
    // Permissions grid if a school wants it. Mirrors the god-first convention.
    "communication.message.send",
    "communication.template.manage",
    "hiring.candidate.view",
    "hiring.candidate.manage",
    "transport.setup.view",
    "transport.setup.manage",
    "transport.attendance.mark",
    "transport.attendance.finalize",
    "transfer.certificate.view",
    "transfer.certificate.manage",
    "syllabus.plan.view",
    "syllabus.plan.manage",
    "syllabus.progress.mark",
    "programme.unit.view",
    "programme.unit.teach",
    "programme.source.view",
    // programme.unit.manage + programme.source.manage are god-only (authoring stays god-first);
    // god grants admin/incharge via the Permissions grid.
    "assembly.plan.view",
    "assembly.plan.manage",
    "assembly.week.view",
    "assembly.week.manage",
    "assembly.week.conduct",
    "assembly.grading.view",
    "assembly.grading.manage",
    "assembly.house.view",
    "assembly.house.manage",
    // assembly.config.manage is god-only (house/grading setConfig).
    "homework.day.view",
    "homework.day.post",
    "homework.day.manage",
    "outreach.moment.view",
    "outreach.moment.post",
    "outreach.moment.manage",
    "academic-calendar.view",
    "academic-calendar.manage",
    // Examination (explicit, no wildcard): run exams + report cards, view progress. NOT config/scheme/
    // remark/mapping, NOT marks-override/lock/class-exclude, NOT dues-override (god-only).
    "exam.schedule.view",
    "exam.schedule.manage",
    "exam.progress.view",
    "exam.reportcard.manage",
    "fee.receipt.verify", // Scan & Verify (admin + god only; NOT fee incharges)
    "leave.calendar.view", // See the shared who's-on-leave calendar
    "leave.application.apply", // Self-service own leave; oversight/config/biometric/deduction are god-only for now
    "documents.sign", // Read & sign own documents; authoring (documents.manage) is god-only
    // Clubs & Activities: NONE by default (locked to god). god grants admin via the grid.
  ],
  // Standard teaching staff: view-only across the modules they can reach.
  // No transport access by default — bus attendance needs the `transport-attendance`
  // role below (and route assignment), not plain `teacher`.
  teacher: [
    "medical.inventory.view", // See medicine stock
    "medical.issue.view", // See what has been issued
    "lab.inventory.view", // See lab stock
    "lab.issue.view", // See what lab items have been issued
    "sports.inventory.view", // See sports equipment stock
    "sports.issue.view", // See what sports items have been issued
    "library.catalog.view", // Browse the library catalog
    "supplies.inventory.view", // See supply stock
    "supplies.issue.view", // See what supplies have been issued
    "timetable.grid.view", // Published timetable only (menu gates the rest)
    "student.record.view",
    "student.contacts.view", // Teachers may see un-masked parent/student & staff numbers
    "attendance.record.view", // Read a student's attendance history on the 360 view
    "employee.record.view",
    "syllabus.plan.view", // Read plans; class teachers also mark coverage for their section
    "syllabus.progress.mark",
    "programme.unit.view", // Read the Spoken English & Life Communication monthly units
    "programme.unit.teach", // Mark a unit taught while conducting the programme
    "programme.source.view", // Download the class-module reference docs
    "assembly.plan.view", // Read the assembly plan for their wing
    "assembly.week.conduct", // Run their assigned assembly week (/me; scoped in-handler by house/evaluator)
    "academic-calendar.view", // Read the school's academic calendar
    "leave.calendar.view", // See the shared who's-on-leave calendar
    "leave.application.apply", // Apply for own leave; see own attendance & penalty
    "documents.sign", // Read & sign the staff policies shared with them
    // Feedback/complaints: any teacher may record + assign, and respond to items
    // assigned to them. Reviewing/completing (feedback.ticket.review) is god-only.
    "feedback.ticket.view",
    "feedback.ticket.record",
    "feedback.ticket.respond",
    "club.plan.conduct", // Run own club assignment (guide) + quick closure on the PWA
  ],
  // Class teacher: a teacher additionally allowed to MARK attendance (any class, so they
  // can cover for an absent colleague) and to POST their class's daily homework photos.
  // Finalizing attendance stays admin/god; the class→teacher homework mapping override
  // (homework.day.manage) stays admin/god. Additive to the `teacher` role.
  "class-teacher": ["attendance.session.mark", "homework.day.post"],
  // Moments in-charge: owns the parent-facing Moments feed end to end — compose to any
  // audience (whole school / grade / class), publish/unpublish. Admin-scoped-to-module, like
  // the other *-incharge roles. NOT class-teacher related; the PWA Moments screen is for
  // god / admin / moments-incharge only.
  "moments-incharge": ["outreach.moment.view", "outreach.moment.post", "outreach.moment.manage"],
  // Club in-charge: READ-ONLY by default across the three club resources (clubs, bank, plans).
  // Authoring/approve/review/planning are god-first; god grants more via the Permissions grid.
  "club-incharge": ["club.setup.view", "club.activity.view", "club.plan.view"],
  // Each in-charge === admin, but scoped to its own module.
  "medical-incharge": ["medical.*"],
  "lab-incharge": ["lab.*"],
  "fees-incharge": ["fee.report.view", "fee.collect.collect", "fee.structure.manage", "fee.concession.assign", "fee.student.manage", "fee.manager.view"],
  "sports-incharge": ["sports.*"],
  "assets-incharge": ["asset.*"],
  "library-incharge": ["library.*"],
  "supplies-incharge": ["supplies.*"],
  "hiring-incharge": ["hiring.*"],
  "transport-incharge": ["transport.*"],
  "syllabus-incharge": ["syllabus.*"],
  // Explicit (not programme.*) so authoring (unit.manage/source.manage) + config.manage stay god-first.
  "programme-incharge": ["programme.unit.view", "programme.unit.teach", "programme.source.view"],
  // Explicit (not assembly.*) so assembly.config.manage stays god-first.
  "assembly-incharge": ["assembly.plan.view", "assembly.plan.manage", "assembly.week.view", "assembly.week.manage", "assembly.week.conduct", "assembly.grading.view", "assembly.grading.manage", "assembly.house.view", "assembly.house.manage"],
  // Exam incharge === admin, but scoped to the examination module.
  // Exam office: run exams + view progress, but NOT report cards, config, mapping, or god-only overrides.
  "exam-incharge": ["exam.schedule.view", "exam.schedule.manage", "exam.progress.view"],
  // Route-scoped teacher: reach the bus-attendance screens and mark attendance,
  // but only for routes they are staffed on (accompanying teacher / helper /
  // route incharge). The route filtering is enforced in the attendance pages;
  // finalize stays admin/god/transport-incharge only.
  "transport-attendance": ["transport.attendance.mark"],
  // Collection-desk manager: a locked, read-only fee-collection view, plus the one-tap
  // late-fine exemption (the counter escape hatch — clerks can't skip/forgive fines).
  manager: ["fee.manager.view", "fee.fine.exempt"],
  // Education director: lands on the Cockpit / School Pulse and reviews the school's
  // heartbeat. Read-oriented oversight across the pulse domains (feedback review, assembly,
  // syllabus, students/houses, leave, calendar). Additive — a person can also hold `god`.
  'education-director': [
    "cockpit.view",
    "feedback.ticket.view",
    "feedback.ticket.review",
    "assembly.plan.view",
    "assembly.plan.manage",
    "assembly.week.view",
    "assembly.week.manage",
    "assembly.grading.view",
    "assembly.grading.manage",
    "assembly.house.view",
    "assembly.house.manage",
    "syllabus.plan.view",
    "student.record.view",
    "student.contacts.view",
    "academic-calendar.view",
    "timetable.grid.view",
    "transport.setup.view",
    "leave.calendar.view",
    "leave.application.apply",
  ],
};

// Roles to show as columns in the generated permissions.md matrix.
export const DOC_ROLES = [
  "god",
  "admin",
  "teacher",
  "class-teacher",
  "medical-incharge",
  "lab-incharge",
  "sports-incharge",
  "assets-incharge",
  "library-incharge",
  "supplies-incharge",
  "hiring-incharge",
  "transport-incharge",
  "transport-attendance",
];
