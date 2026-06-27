# UI Permissions

Role-based permissions enforced in the admin portal UI (read from the JWT `roles`).
**UI-only today** — the backend does not yet enforce them.

> Generated from `src/permissions/` by `npm run gen:permissions`. Do not edit by hand —
> change `actions.js` / `policy.js` and regenerate.

| Action | Description | god | admin |
| --- | --- | --- | --- |
| `timetable.view` | View timetable pages (open to all signed-in users) | ✓ | — |
| `timetable.print` | Print class / teacher / master timetables | ✓ | ✓ |
| `timetable.manage` | Create/edit/delete subjects, class setup, grid config (lock/clone), wings, constraints; generate & publish | ✓ | — |
| `employee.manage` | Add, edit, delete employees; view & reset passwords | ✓ | ✓ |
| `employee.restore` | Restore a deleted employee | ✓ | — |
| `purchaseLog.edit` | Edit a purchase log entry (medical, lab, sports, supplies, …) | ✓ | — |
| `purchaseLog.restore` | Restore a deleted purchase log entry | ✓ | — |

_`god` has `*` (all actions). Anything not granted to a role is denied — so restore (employee & purchase log), purchase-log edit, and timetable management are god-only._
