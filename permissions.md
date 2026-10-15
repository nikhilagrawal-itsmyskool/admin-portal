# UI Permissions

Role-based permissions enforced in the admin portal UI (read from the JWT `roles`).
**UI-only today** — the backend does not yet enforce them.

> Generated from `src/permissions/` by `npm run gen:permissions`. Do not edit by hand —
> change `actions.js` / `policy.js` and regenerate.

| Action | Description | god | admin | teacher | class-teacher | medical-incharge | lab-incharge | sports-incharge | assets-incharge | library-incharge | supplies-incharge | hiring-incharge | transport-incharge | transport-attendance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `medical.view` | See the Medical menu and read its pages | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.manage` | Add/edit/delete medical items, purchases & issues | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — |
| `lab.view` | See the Laboratory menu and read its pages | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.manage` | Add/edit/delete labs, items, purchases, issues & breakages | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `fine.view` | See the Fines menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fine.manage` | Add/edit/delete fine incidents | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.report.view` | See the Fees menu, read dues/reports/receipts & a student's fee ledger | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.collect.collect` | Collect fees, issue/cancel receipts, apply advance & record refunds | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.structure.manage` | Add/edit fee heads, cycles, structure & run charge generation | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.concession.manage` | Create/edit/delete concession schemes (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `fee.concession.assign` | Add/remove students to a concession & mid-year concession changes | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.waiver.manage` | Create/remove waivers, incl. the Collect write-off (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `fee.latefee.manage` | Create/edit late-fee rules & apply fines (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `fee.transport.manage` | Add/edit transport fee slabs (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `fee.student.manage` | Withdraw a student & mark exam-only | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.manager.view` | Read-only Collection Desk (simplified manager view) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fee.fine.exempt` | Exempt a student's late fine (manager + god only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `fee.receipt.verify` | Scan & Verify receipts (admin + god only) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.view` | See the Uniform menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.manage` | Add/edit/delete uniform catalog, purchases, sets & sales | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.view` | See the Shop menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.manage` | Add/edit/delete shop catalog, purchases, sets & sales | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `sports.view` | See the Sports menu and read its pages | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.manage` | Add/edit/delete sports items, in-charges, issues & breakages | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `asset.view` | See the Assets menu and read its pages | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| `asset.manage` | Add/edit/delete asset register, counts & types | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| `library.view` | See the Library menu and read its pages | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — |
| `library.manage` | Add/edit/delete catalog, circulation, fines & settings | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `supplies.view` | See the Supplies menu and read its pages | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.manage` | Add/edit/delete supplies categories, items, issues & wastage | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `timetable.view` | View timetable pages (open to all signed-in users) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `timetable.print` | Print class / teacher / master timetables | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `timetable.manage` | Create/edit/delete subjects, class setup, grid config (lock/clone), wings, constraints; generate & publish | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `employee.view` | See the Employees menu, search the list, open a read-only detail (incl. self) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `employee.manage` | Add, edit, delete employees; view & reset passwords | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `employee.restore` | Restore a deleted employee | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `employee.session.reset` | Force an employee to sign out and back in (e.g. after a role change) — god-only by default | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `purchaseLog.edit` | Edit a purchase log entry (medical, lab, sports, supplies, …) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `purchaseLog.restore` | Restore a deleted purchase log entry | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `student.view` | See the Students menu and view/search the student list | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `student.manage` | Admit/edit/delete students, manage guardians & houses, assign house, promote/graduate | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `student.contacts.view` | View unmasked parent/guardian phone, WhatsApp & email | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `attendance.record.view` | View a single student's attendance history on the 360 view (teachers + admin) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `attendance.session.mark` | Take daily roll-call: open a session, load the roster, mark & save statuses (admin + class teachers) | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — |
| `attendance.session.finalize` | Finalize a daily attendance session and edit records after finalize (marking & viewing are open to all staff) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `attendance.config.manage` | Manage the per-school Attendance Config (how a half-day counts toward attendance %) — god-only by default | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `communication.send` | Compose, schedule, preview, send and cancel SMS/WhatsApp messages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `communication.template.manage` | Create, edit and activate message templates | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `communication.template.delete` | Delete or restore a message template | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `hiring.view` | See the Hiring menu and read candidate records | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — |
| `hiring.manage` | Add/edit/delete candidates, interview stages, files & final decisions | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — |
| `transport.view` | See the Transport menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — |
| `transport.manage` | Add/edit/delete stops, vehicles, routes, route stops & student assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — |
| `transport.attendance.mark` | Reach the bus-attendance screens and mark attendance — for admin/god/transport-incharge on any route, and a transport-attendance teacher only on routes they're staffed on | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | ✓ |
| `transport.attendance.finalize` | Finalize a transport (bus) attendance session and edit records after finalize (admin/god/transport-incharge only) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — |
| `transfer.view` | See the Transfer menu and search/read transfer certificate records | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `transfer.manage` | Apply for and issue transfer certificates (issuing withdraws the student) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `syllabus.view` | See the Syllabus menu and read subjects, plans and progress | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `syllabus.manage` | Add/edit/delete syllabus subjects, plans and their topic entries | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `syllabus.progress.mark` | Mark syllabus topics covered/pending for a class section | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `assembly.view` | See the Assembly menu and read plans, special assemblies and themes | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `assembly.manage` | Add/edit/delete/publish assembly plans, nodes, special assemblies & themes | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `homework.post` | Post, edit, remove and publish/unpublish a class's daily homework photos | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — |
| `homework.manage` | Override which teacher is the homework class-teacher for a class | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `academic-calendar.view` | See the Academic Calendar menu and read the year's entries & holidays | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `academic-calendar.manage` | Add/edit/delete calendar entries, holidays & columns, and import from Excel | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `exam.schedule.view` | See the Examinations menu and read exam schedules, datesheets & invigilator assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `exam.schedule.manage` | Create/edit/delete/publish examinations, datesheet papers & invigilator assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `programme.view` | See the Programmes menu and read a programme's monthly units (Class → Month → Theme) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `programme.manage` | Author programme units and re-upload class-module source documents | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `assistant.use` | Use the voice/LLM student assistant (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.apply` | Apply for your own leave and see your own attendance & penalty (teacher/office/admin) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `leave.manage` | Approve/reject leave, view any staff member's records, set policy, import biometric attendance & run the deduction report (god-only for now) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `feedback.view` | Read the feedback category lookup (needed to record a home-visit feedback) | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| `feedback.record` | Record a home-visit feedback for a student and assign it to a teacher (teachers) | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| `feedback.respond` | See feedback assigned to you and add your response comment (teachers, own items only) | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| `feedback.review` | Open the feedback dashboard, see the teacher-wise breakup, and complete/reopen feedback (education director; god-only for now) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `cockpit.view` | See the Director's Cockpit / School Pulse heartbeat (director + god) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.setup.view` | See the Clubs & Activities menu, clubs and programme settings | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.setup.manage` | Create/edit clubs, their configuration, enabled blocks & programme settings | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.activity.view` | See the activity bank (clubs' versioned activities) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.activity.manage` | Edit activity content, create revision drafts, materials, resources & bulk import | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.activity.approve` | Release/trial/supersede an activity version and suspend/archive an activity | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.activity.review` | Work the activity review queue — keep as is / create revision / suspend / archive | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.plan.view` | See the weekly plan board and published plans | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.plan.manage` | Build and edit a draft weekly plan — slots, groups, assignments, copy previous | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.plan.publish` | Publish a plan, make after-publish changes, cancel an assignment, close/reopen | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `club.plan.conduct` | Open your own club assignment guide and submit quick closure / report a safety issue | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |

_`god` has `*` (all actions). Anything not granted to a role is denied — so restore (employee & purchase log), purchase-log edit, and timetable management are god-only._
