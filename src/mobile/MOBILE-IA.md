# Mobile PWA — Information Architecture (the spine)

Single source of truth for **what staff see on a phone** and the rules that govern it.
`mobileFeatures.js` is the implementation; this file is the human-readable contract it
follows. **Read this before changing the mobile home**, and keep the two in sync.

Mobile = the `< 600px` (MUI `sm`) surface. Phones are restricted to the routes in
`MOBILE_ROUTES`; anything else redirects to `/`. Tablets/desktop get the full portal.

---

## Bands (top-level sections, in display order)

`MOBILE_SECTIONS` — key → label:

| key | label | what it holds |
|-----|-------|---------------|
| `office` | **Operations** | god oversight (pinned top) |
| `today` | **Now** | do-today actions |
| `mine` | **Mine** | your durable personal surfaces |
| `programmes` | **Programmes** | developmental programmes hub (Spoken English, later Scout, …) |
| `manage` | **Manage** | module consoles (incharge/admin) |
| `people` | **People & Staff** | directories |
| `stores` | **Stores & Inventory** | registers |
| `tools` | **Tools** | Assistant (pinned last) |

## Rendering rules

1. **Visibility** — a feature shows when the caller's roles grant its `perm` (or it has
   none) **AND**, if it has `notPerm`, the caller does **not** hold `notPerm`.
   `notPerm` swaps a personal tile for the oversight one (god sees *Leave Approvals*, not
   *My Leave*; *Feedback* dashboard, not *My Feedback*; *Staff Documents*, not *My Documents*).
2. **`derived`** — an extra runtime gate resolved via `/me/assembly/duties`
   (`houseMember` / `evaluator`). Role alone is not enough.
3. **Hubs** — features sharing a `hub` key collapse into ONE tile that opens `/hub/:key`.
   **A hub with a single visible child links straight through** (no hub screen). This is
   why Assembly and Leave appear as a single link for god.
4. Empty bands are dropped. Roles are **additive** — a person's home is the union of their roles.
5. **`godpwa.*`** perms are granted to no role, so those tiles are **god-only** (Fees,
   Syllabus Overview). Fees stays god-only on mobile by decision.

## Naming convention (target)

- **Loose card → keeps `My`** — ownership must show on the card (My Timetable, My Syllabus,
  My Feedback, My Documents).
- **Grouped card → drops `My`** — the subheading already says it's yours
  (Assembly → Roster/Checklist/Grading; Exams → Duties/Schedule; Leave → Request/Calendar/Penalties).
- **Exception: `My Attendance`** keeps `My`, so it doesn't read as *student* attendance.
- **Actions stay task-shaped** (Request, Grading), not possessive.
- A shared / non-owned loose card has no `My` (Academic Calendar).

---

## Current map (what `mobileFeatures.js` renders today)

Names below are the live titles. `·` separates a hub's children.

- **Operations** (god; Scan&Verify is admin+god)
  - Fees `[hub]` · Overview · Dues Report · Receipts — `godpwa.fee.*`
  - Scan & Verify — `receipt.verify`
  - Syllabus Overview — `godpwa.syllabus.overview`
  - Leave Approvals — `leave.manage` · Staff Attendance — `leave.manage`
- **Now**
  - Take Attendance `attendance.mark` · Bus Attendance `transport.attendance.mark`
  - Post Homework `homework.post` · Send Message `communication.send` · Record Feedback `feedback.record` · My Activities `club.plan.conduct` (club conduct; admin club consoles are desktop-only)
  - Assembly `[hub]` · Today's assembly `assembly.view` · My Roster / My Checklist `+derived houseMember` · Grade Assembly `+derived evaluator` · Leaderboard `assembly.view`
- **Mine**
  - My Timetable `timetable.view` · My Syllabus `syllabus.view` · Academic Calendar `academic-calendar.view`
  - Exam Schedule *(all staff)* · My Exam Duties *(all staff)* · Enter Marks *(all staff)* · Co-Scholastic *(all staff)*
  - My Feedback `feedback.respond` / not `feedback.review` · My Documents `documents.sign` / not `documents.manage`
  - Leave `[hub]` · My Leave `leave.apply` / not `leave.manage` · Leave Calendar `leave.apply` · My Attendance · My Penalty
- **Programmes** `[hub: programmes]`
  - Spoken English `programme.view` — Class → Month → Theme reader (links straight through while it's the only programme; becomes a hub when Scout etc. are added)
- **Manage**
  - Examinations `exam.view` · Subject Mapping `exam.manage` · Marks Progress `exam.manage` · Branding `exam.manage` · Feedback `feedback.review` · Staff Documents `documents.manage`
- **People & Staff** `[hub: people]`
  - Students `student.view` · Employees `employee.view` · Hiring `hiring.view` · Transfer Certificate `transfer.view`
- **Stores & Inventory** *(per-module `[hub]`)*
  - Library · Catalog/Circulation `library.view`
  - Lab · Items/Issues `lab.view`
  - Medical · Items/Issues `medical.view`
  - Sports · Items `sports.view` / Issues `sports.manage`
  - Supplies · Items `supplies.view` / Issues `supplies.manage`
  - Asset Counts `asset.manage`
- **Tools** · Assistant `assistant.use` *(god)*

---

## Reorg — IMPLEMENTED (on main working tree, pending commit)

Done in `mobileFeatures.js` (tiles + a new `group` field + `buildMobileTiles` now returns
`{ tiles, groups }`), `pages/MobileHome.jsx` and `components/Sidebar.jsx` (render subheadings).
Co-Scholastic uses **`derived: "classTeacher"`** (resolved from `/me/report/classes` in
`useMobileVisibility`) so only actual class teachers see it. **Single-tile groups collapse**
to a plain tile (god's Leave → "Leave Calendar"). Section headers carry a hairline; subheadings
indent under a left rail. Dead `assembly`/`leave`/`people` entries pruned from `MOBILE_HUBS`.
The items below are what shipped:

1. **Assembly duty → Mine.** Move My Roster / My Checklist / Grade Assembly from **Now**
   into **Mine**; only **Today's assembly** stays in Now (as a loose card).
2. **Rename** to the convention: `Grade Assembly → Grading`, `My Roster → Roster`,
   `My Checklist → Checklist`.
3. **Exams gets a subheading** in Mine: `My Exam Duties → Duties`, `Exam Schedule → Schedule`,
   plus **Enter Marks** and **Co-Scholastic** (task-shaped, no "My") — one group for the whole
   exam→report-card cycle. **Enter Marks** stays visible to teachers (subject teachers,
   row-scoped by `canTeach`). **Co-Scholastic** is **class-teacher-only** — gate the tile so
   plain teachers don't see it (backend already enforces `isClassTeacher`). Cleanest gate is a
   `derived: 'classTeacher'` runtime check (mirrors the Assembly duty pattern; reuse
   `/me/report/classes`, empty ⇒ not a class teacher); interim proxy = a class-teacher role perm.
4. **Leave group naming:** `My Leave → Request`, `Leave Calendar → Calendar`,
   `My Penalty → Penalties`; **My Attendance** stays.
5. **Flatten Leave, Assembly, Exams** from hubs (2 taps) into **flat subheadings** (1 tap).
   Requires a new **`group`** field on features + `buildMobileTiles` rendering subheadings
   within a section — today the model has only `section` + `hub`.
6. **Manage stays a flat launcher** with the exam consoles clustered in order:
   Examinations · Subject Mapping · Marks Progress · Branding (then Feedback · Staff Documents).
   No subheading — a "Examinations" group would clash with the tile of the same name.

7. **People & Staff → flatten to direct tiles** (Students · Employees · Hiring · Transfer
   Certificate) — drop the `people` hub; the section header is the group. One tap.
8. **Stores & Inventory → keep the per-module hubs** (Library · Lab · Medical · Sports ·
   Supplies) — flattening would be 10+ tiles for an admin; hub-per-module stays scannable and a
   single-module incharge sees just their one tile. Asset Counts stays a loose tile.

Confirmed behavior: **Roster / Checklist** appear only for a `houseMember` of the on-duty house;
**Grading** only for an assigned `evaluator` (both `derived`, resolved via `/me/assembly/duties`).

Not changing: Fees stays god-only on mobile.

## Open check — marks-entry scoping

`Enter Marks` / `Co-Scholastic` carry **no `perm`** (all staff). Safe only if the backend
**row-scopes** writes to the caller's own teaching assignments (empty otherwise), like
invigilation `/me`. If not, they need a teaching/marks gate. _(Verifying in core-api.)_

_Interactive view of current vs proposed, per role: the "Staff PWA — cards by role" artifact._
