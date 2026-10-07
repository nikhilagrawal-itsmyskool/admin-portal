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
    "fee.*",
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
    "attendance.mark",
    "attendance.finalize",
    "communication.send",
    "communication.template.manage",
    "hiring.view",
    "hiring.manage",
    "transport.view",
    "transport.manage",
    "transport.attendance.mark",
    "transport.attendance.finalize",
    "transfer.view",
    "transfer.manage",
    "syllabus.view",
    "syllabus.manage",
    "syllabus.progress.mark",
    "programme.view",
    "assembly.view",
    "assembly.manage",
    "homework.post",
    "homework.manage",
    "academic-calendar.view",
    "academic-calendar.manage",
    // Examination (explicit, no wildcard): run exams + report cards, view progress. NOT config/scheme/
    // remark/mapping, NOT marks-override/lock/class-exclude, NOT dues-override (god-only).
    "exam.schedule.view",
    "exam.schedule.manage",
    "exam.progress.view",
    "exam.reportcard.manage",
    "receipt.verify", // Scan & Verify (admin + god only; NOT fee incharges)
    "leave.apply", // Self-service leave only; oversight (leave.manage) is god-only for now
    "documents.sign", // Read & sign own documents; authoring (documents.manage) is god-only
    // Clubs & Activities: NONE by default (locked to god). god grants admin via the grid.
  ],
  // Standard teaching staff: view-only across the modules they can reach.
  // No transport access by default — bus attendance needs the `transport-attendance`
  // role below (and route assignment), not plain `teacher`.
  teacher: [
    "sports.view",
    "library.view",
    "supplies.view",
    "timetable.view", // Published timetable only (menu gates the rest)
    "student.view",
    "student.contacts.view", // Teachers may see un-masked parent/student & staff numbers
    "employee.view",
    "syllabus.view", // Read plans; class teachers also mark coverage for their section
    "syllabus.progress.mark",
    "programme.view", // Read the Spoken English & Life Communication monthly units
    "assembly.view", // Read the assembly plan for their wing
    "academic-calendar.view", // Read the school's academic calendar
    "leave.apply", // Apply for own leave; see own attendance & penalty
    "documents.sign", // Read & sign the staff policies shared with them
    // Feedback/complaints: any teacher may record + assign, and respond to items
    // assigned to them. Reviewing/completing (feedback.review) is god-only.
    "feedback.view",
    "feedback.record",
    "feedback.respond",
    "club.plan.conduct", // Run own club assignment (guide) + quick closure on the PWA
  ],
  // Class teacher: a teacher additionally allowed to MARK attendance (any class, so they
  // can cover for an absent colleague) and to POST their class's daily homework photos.
  // Finalizing attendance stays admin/god; the class→teacher homework mapping override
  // (homework.manage) stays admin/god. Additive to the `teacher` role.
  "class-teacher": ["attendance.mark", "homework.post"],
  // Club in-charge: READ-ONLY by default across the three club resources (clubs, bank, plans).
  // Authoring/approve/review/planning are god-first; god grants more via the Permissions grid.
  "club-incharge": ["club.setup.view", "club.activity.view", "club.plan.view"],
  // Each in-charge === admin, but scoped to its own module.
  "medical-incharge": ["medical.*"],
  "lab-incharge": ["lab.*"],
  "fees-incharge": ["fee.*"],
  "sports-incharge": ["sports.*"],
  "assets-incharge": ["asset.*"],
  "library-incharge": ["library.*"],
  "supplies-incharge": ["supplies.*"],
  "hiring-incharge": ["hiring.*"],
  "transport-incharge": ["transport.*"],
  "syllabus-incharge": ["syllabus.*"],
  "programme-incharge": ["programme.*"],
  "assembly-incharge": ["assembly.*"],
  // Exam incharge === admin, but scoped to the examination module.
  // Exam office: run exams + view progress, but NOT report cards, config, mapping, or god-only overrides.
  "exam-incharge": ["exam.schedule.view", "exam.schedule.manage", "exam.progress.view"],
  // Route-scoped teacher: reach the bus-attendance screens and mark attendance,
  // but only for routes they are staffed on (accompanying teacher / helper /
  // route incharge). The route filtering is enforced in the attendance pages;
  // finalize stays admin/god/transport-incharge only.
  "transport-attendance": ["transport.attendance.mark"],
  // Collection-desk manager: a locked, read-only fee-collection view and nothing else.
  manager: ["fee.manager.view"],
  // Education director: lands on the Cockpit / School Pulse and reviews the school's
  // heartbeat. Read-oriented oversight across the pulse domains (feedback review, assembly,
  // syllabus, students/houses, leave, calendar). Additive — a person can also hold `god`.
  director: [
    "cockpit.view",
    "feedback.view",
    "feedback.review",
    "assembly.view",
    "assembly.manage",
    "syllabus.view",
    "student.view",
    "student.contacts.view",
    "academic-calendar.view",
    "timetable.view",
    "transport.view",
    "leave.apply",
    "leave.manage",
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
