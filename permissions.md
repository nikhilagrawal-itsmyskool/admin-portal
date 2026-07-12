# UI Permissions

Role-based permissions enforced in the admin portal UI (read from the JWT `roles`).
**UI-only today** — the backend does not yet enforce them.

> Generated from `src/permissions/` by `npm run gen:permissions`. Do not edit by hand —
> change `actions.js` / `policy.js` and regenerate.

| Action | Description | god | admin | teacher | medical-incharge | lab-incharge | sports-incharge | assets-incharge | library-incharge | supplies-incharge | hiring-incharge | transport-incharge | transport-attendance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `medical.view` | See the Medical menu and read its pages | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — |
| `medical.manage` | Add/edit/delete medical items, purchases & issues | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — |
| `lab.view` | See the Laboratory menu and read its pages | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| `lab.manage` | Add/edit/delete labs, items, purchases, issues & breakages | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| `fine.view` | See the Fines menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `fine.manage` | Add/edit/delete fine incidents | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `uniform.view` | See the Uniform menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `uniform.manage` | Add/edit/delete uniform catalog, purchases, sets & sales | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `shop.view` | See the Shop menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `shop.manage` | Add/edit/delete shop catalog, purchases, sets & sales | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `sports.view` | See the Sports menu and read its pages | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| `sports.manage` | Add/edit/delete sports items, in-charges, issues & breakages | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `asset.view` | See the Assets menu and read its pages | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — |
| `asset.manage` | Add/edit/delete asset register, counts & types | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — | — |
| `library.view` | See the Library menu and read its pages | ✓ | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — |
| `library.manage` | Add/edit/delete catalog, circulation, fines & settings | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — |
| `supplies.view` | See the Supplies menu and read its pages | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — |
| `supplies.manage` | Add/edit/delete supplies categories, items, issues & wastage | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — |
| `timetable.view` | View timetable pages (open to all signed-in users) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| `timetable.print` | Print class / teacher / master timetables | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `timetable.manage` | Create/edit/delete subjects, class setup, grid config (lock/clone), wings, constraints; generate & publish | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `employee.view` | See the Employees menu, search the list, open a read-only detail (incl. self) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| `employee.manage` | Add, edit, delete employees; view & reset passwords | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `employee.restore` | Restore a deleted employee | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `purchaseLog.edit` | Edit a purchase log entry (medical, lab, sports, supplies, …) | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `purchaseLog.restore` | Restore a deleted purchase log entry | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `student.view` | See the Students menu and view/search the student list | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| `student.manage` | Admit/edit/delete students, manage guardians & houses, assign house, promote/graduate | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `student.contacts.view` | View unmasked parent/guardian phone, WhatsApp & email | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `attendance.finalize` | Finalize a daily attendance session and edit records after finalize (marking & viewing are open to all staff) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `communication.send` | Compose, schedule, preview, send and cancel SMS/WhatsApp messages | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `communication.template.manage` | Create, edit and activate message templates | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `communication.template.delete` | Delete or restore a message template | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| `hiring.view` | See the Hiring menu and read candidate records | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — |
| `hiring.manage` | Add/edit/delete candidates, interview stages, files & final decisions | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — | — |
| `transport.view` | See the Transport menu and read its pages | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — |
| `transport.manage` | Add/edit/delete stops, vehicles, routes, route stops & student assignments | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — |
| `transport.attendance.mark` | Reach the bus-attendance screens and mark attendance — for admin/god/transport-incharge on any route, and a transport-attendance teacher only on routes they're staffed on | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | ✓ |
| `transport.attendance.finalize` | Finalize a transport (bus) attendance session and edit records after finalize (admin/god/transport-incharge only) | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — |
| `transfer.view` | See the Transfer menu and search/read transfer certificate records | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| `transfer.manage` | Apply for and issue transfer certificates (issuing withdraws the student) | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |

_`god` has `*` (all actions). Anything not granted to a role is denied — so restore (employee & purchase log), purchase-log edit, and timetable management are god-only._
