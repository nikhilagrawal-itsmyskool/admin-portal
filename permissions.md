# UI Permissions

Role-based permissions enforced in the admin portal UI (read from the JWT `roles`).
**UI-only today** — the backend does not yet enforce them.

> Generated from `src/permissions/` by `npm run gen:permissions`. Do not edit by hand —
> change `actions.js` / `policy.js` and regenerate.

| Action | Description | god | admin | teacher | class-teacher | medical-incharge | lab-incharge | sports-incharge | assets-incharge | library-incharge | supplies-incharge | hiring-incharge | transport-incharge | transport-attendance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `medical.inventory.view` | View medical inventory items & stock (teacher/admin/medical-incharge) | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.inventory.manage` | Add / edit / delete medical inventory items | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.purchase.view` | View medical purchases, batches, expiring stock & bills | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.purchase.manage` | Record / edit / delete medical purchases, batches & bills | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.issue.view` | View the medical issue log (what has been issued) | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.issue.manage` | Record / edit / delete medical issues | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — |
| `lab.setup.view` | View the Labs registry & lookups | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.setup.manage` | Create / edit / delete labs (the Labs registry) | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.inventory.view` | View lab inventory items & stock (teacher/admin/lab-incharge) | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.inventory.manage` | Add / edit / delete lab inventory items | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.purchase.view` | View lab purchases, batches, alerts & bills | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.purchase.manage` | Record / edit / delete lab purchases, batches & bills | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.issue.view` | View the lab issue log (what has been issued) | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.issue.manage` | Record / edit / delete / return lab issues | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.breakage.view` | View the lab breakage log | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.breakage.manage` | Record / edit / delete lab breakages | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| `fine.incident.view` | View fine incidents, evidence, notes & lookups | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fine.incident.manage` | Create / edit / delete fine incidents, evidence & notes | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fine.collection.view` | View fine collections & receipts | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `fine.collection.manage` | Record fine collection | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
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
| `fee.writeoff.manage` | Write off a student's dues as bad debt & restore (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.inventory.view` | View uniform items & stock | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.inventory.manage` | Add / edit / delete uniform items & sizes | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.purchase.view` | View uniform purchases & bills | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.purchase.manage` | Record / edit / delete uniform purchases & bills | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.set.view` | View uniform sets | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.set.manage` | Create / edit / delete uniform sets | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.sale.view` | View uniform sales & returns | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `uniform.sale.manage` | Record sales, payments & returns | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.inventory.view` | View shop items & stock | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.inventory.manage` | Add / edit / delete shop items | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.purchase.view` | View shop purchases, intake & bills | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.purchase.manage` | Record / edit / delete shop purchases, intake & bills | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.set.view` | View shop sets & stock | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.set.manage` | Create / edit / delete shop sets | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.sale.view` | View shop sales & assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `shop.sale.manage` | Record / assign shop sales | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `sports.setup.view` | View sport in-charges & lookups | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.setup.manage` | Set sport in-charges | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.inventory.view` | View sports equipment items & stock (teacher/admin/sports-incharge) | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.inventory.manage` | Add / edit / delete sports equipment items | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.purchase.view` | View sports purchases, batches & bills | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.purchase.manage` | Record / edit / delete sports purchases, batches & bills | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.issue.view` | View the sports issue log (what has been issued) | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.issue.manage` | Record / edit / delete / return sports issues | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.breakage.view` | View the sports breakage log | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `sports.breakage.manage` | Record / edit / delete sports breakages | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — | — |
| `asset.register.view` | View the asset register (tree), counts, responsibility & movements | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| `asset.register.manage` | Add / edit / delete / move / individualize assets & set responsibility | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| `asset.type.view` | View the per-school asset-type master | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| `asset.type.manage` | Create / edit / delete asset types | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| `library.catalog.view` | Browse the catalog — works, titles, copies, labels (teacher/admin/library-incharge) | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — |
| `library.catalog.manage` | Create / edit catalog works, titles, copies; print labels | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `library.circulation.view` | View issues / returns / renewals (loans) | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `library.circulation.manage` | Issue / return / renew books | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `library.fine.view` | View overdue / lost library fines | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `library.fine.manage` | Collect / waive library fines | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `library.config.view` | Read circulation policy + per-school lookups | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `library.config.manage` | Edit circulation policy + lookups (the Settings screen) | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| `supplies.category.view` | View supply categories | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.category.manage` | Create / edit / delete supply categories | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.inventory.view` | View supply items & stock (teacher/admin/supplies-incharge) | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.inventory.manage` | Add / edit / delete / merge supply items | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.purchase.view` | View supply purchases, batches & bills | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.purchase.manage` | Record / edit / delete supply purchases, batches & bills | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.issue.view` | View the supply issue log (what has been issued) | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.issue.manage` | Record / edit / delete / return supply issues | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.wastage.view` | View the supply wastage log | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `supplies.wastage.manage` | Record / edit / delete supply wastage | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — | — |
| `timetable.grid.view` | View timetable pages (open to all signed-in users) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `timetable.grid.print` | Print class / teacher / master timetables | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `timetable.grid.manage` | Create/edit/delete subjects, class setup, grid config (lock/clone), wings, constraints; generate & publish | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `employee.record.view` | See the Employees menu, search the list, open a read-only detail (incl. self) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `employee.record.manage` | Add, edit, delete employees; view & reset passwords | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `employee.record.restore` | Restore a deleted employee | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `employee.session.reset` | Force an employee to sign out and back in (e.g. after a role change) — god-only by default | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `employee.roles.manage` | Assign or change an employee's roles (admins can add/edit employees but not roles) — god-only by default | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `documents.handbook.manage` | Author staff handbook documents (create/edit/remind/archive, view acks) — god-only by default | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `purchaseLog.edit` | Edit a purchase log entry (medical, lab, sports, supplies, …) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `purchaseLog.restore` | Restore a deleted purchase log entry | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `student.record.view` | See the Students menu and view/search the student list | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `student.record.manage` | Admit/edit/delete students, manage guardians & houses, assign house, promote/graduate | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `student.contacts.view` | View unmasked parent/guardian phone, WhatsApp & email | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `attendance.record.view` | View a single student's attendance history on the 360 view (teachers + admin) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `attendance.session.mark` | Take daily roll-call: open a session, load the roster, mark & save statuses (admin + class teachers) | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — |
| `attendance.session.finalize` | Finalize a daily attendance session and edit records after finalize (marking & viewing are open to all staff) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `attendance.config.manage` | Manage the per-school Attendance Config (how a half-day counts toward attendance %) — god-only by default | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `communication.message.send` | Compose, schedule, preview, send and cancel SMS/WhatsApp messages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `communication.template.manage` | Create, edit and activate message templates | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `communication.template.delete` | Delete or restore a message template | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `hiring.candidate.view` | View candidates, stages, files & lookups | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — |
| `hiring.candidate.manage` | Add/edit/delete candidates, interview stages, files & final decisions | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — |
| `transport.setup.view` | See the Transport menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — |
| `transport.setup.manage` | Add/edit/delete stops, vehicles, routes, route stops & student assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — |
| `transport.attendance.mark` | Reach the bus-attendance screens and mark attendance — for admin/god/transport-incharge on any route, and a transport-attendance teacher only on routes they're staffed on | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | ✓ |
| `transport.attendance.finalize` | Finalize a transport (bus) attendance session and edit records after finalize (admin/god/transport-incharge only) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — |
| `transfer.certificate.view` | See the Transfer menu and search/read transfer certificate records | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `transfer.certificate.manage` | Apply for and issue transfer certificates (issuing withdraws the student) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `syllabus.plan.view` | See the Syllabus menu and read subjects, plans and progress | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `syllabus.plan.manage` | Add/edit/delete syllabus subjects, plans and their topic entries | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `syllabus.progress.mark` | Mark syllabus topics covered/pending for a class section | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `assembly.plan.view` | Read plans, nodes, special assemblies, themes, live view & pulse | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `assembly.plan.manage` | Author plans, nodes, special assemblies, themes, references & documents | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.week.view` | Read the weekly roster | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.week.manage` | Manage the weekly roster: ensure, save, submit, approve, lock/unlock | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.week.conduct` | Run my assigned assembly week (/me duties; scoped to my house/evaluator) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `assembly.grading.view` | Read the rubric, evaluators, grades & leaderboard | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.grading.manage` | Manage rubric/metrics/penalties/evaluators, grades & conduct checklist | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.house.view` | Read house mode + rotation | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.house.manage` | Manage house rotation & week-house assignment | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `assembly.config.manage` | Edit assembly config (house/grading setup) — god-first | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `homework.day.view` | View any class's homework days + the class-teacher mapping & audit (oversight) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `homework.day.post` | Post, edit, remove and publish/unpublish a class's daily homework photos | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — |
| `homework.day.manage` | Oversight edits + override which teacher is the homework class-teacher | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `academic-calendar.view` | See the Academic Calendar menu and read the year's entries & holidays | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `academic-calendar.manage` | Add/edit/delete calendar entries, holidays & columns, and import from Excel | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `academic-calendar.config.manage` | Edit Academic Calendar settings (non-teaching/weekly-off configuration) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `exam.schedule.view` | See the Examinations menu and read exam schedules, datesheets & invigilator assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `exam.schedule.manage` | Create/edit/delete/publish examinations, datesheet papers & invigilator assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `programme.unit.view` | Read a programme's monthly units (Class → Month → Theme) + catalog | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `programme.unit.manage` | Author programme units (create/edit/delete) + edit the programme definition | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `programme.unit.teach` | Mark a unit taught while conducting the programme | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `programme.source.view` | List + download class-module source documents | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `programme.source.manage` | Upload / re-upload class-module source documents | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `programme.config.manage` | Edit programme settings (SelcSettings) — god-first | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `assistant.voice.use` | Use the voice/LLM student assistant (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.calendar.view` | See the shared who's-on-leave calendar + a listed person's coverage handover (teacher/admin) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `leave.application.apply` | Apply for / cancel your own leave and see your own attendance & penalty (teacher/admin) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `leave.application.view` | Oversight read: one application's full detail, audit, uploaded attachment, balance & summary (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.application.approve` | Approve / reject leave applications (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.config.view` | Read the leave policy config + leave-type master (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.config.manage` | Edit the leave policy config + leave types (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.attendance.view` | View biometric attendance, the day view & employee↔device mapping (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.attendance.manage` | Mark & import biometric attendance (file / TimeWatch) and enroll device mappings (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.deduction.view` | View deduction (LOP) runs and an employee's deductions (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `leave.deduction.manage` | Run / finalize deduction (LOP) batches (god-only) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| `feedback.ticket.view` | Read the feedback category lookup (needed to record a home-visit feedback) | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| `feedback.ticket.record` | Record a home-visit feedback for a student and assign it to a teacher (teachers) | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| `feedback.ticket.respond` | See feedback assigned to you and add your response comment (teachers, own items only) | ✓ | — | ✓ | — | — | — | — | — | — | — | — | — | — |
| `feedback.ticket.review` | Open the feedback dashboard, see the teacher-wise breakup, and complete/reopen feedback (education director; god-only for now) | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
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
