# UI Permissions

Role-based permissions enforced in the admin portal UI (read from the JWT `roles`).
Note: these are **UI-only** today — the backend does not yet enforce them.

## god

- Restore deleted purchase records — medical, lab (and any other module's purchase log).
- Edit purchase logs — medical, lab (and any other module's purchase log).
- Add, edit and delete employees; view and reset employee passwords.
- Restore deleted employees.

## admin

- Add, edit and delete employees.
- View employee passwords and reset them.

_admin cannot edit/restore purchase logs or restore deleted employees — those are god-only._
