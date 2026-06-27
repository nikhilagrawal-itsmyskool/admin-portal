// Generates permissions.md as a matrix projection of the policy, so the doc never
// drifts from src/permissions. Run: `npm run gen:permissions`.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ACTION_CATALOG } from '../src/permissions/actions.js';
import { ROLE_PERMISSIONS, DOC_ROLES } from '../src/permissions/policy.js';

// Same wildcard semantics as src/permissions/can.js (kept tiny + dependency-free).
function roleCan(role, action) {
  return (ROLE_PERMISSIONS[role] || []).some(
    (p) => p === '*' || p === action || (p.endsWith('.*') && action.startsWith(p.slice(0, -1))),
  );
}

const header = `# UI Permissions

Role-based permissions enforced in the admin portal UI (read from the JWT \`roles\`).
**UI-only today** — the backend does not yet enforce them.

> Generated from \`src/permissions/\` by \`npm run gen:permissions\`. Do not edit by hand —
> change \`actions.js\` / \`policy.js\` and regenerate.

`;

const cols = DOC_ROLES;
const head = `| Action | Description | ${cols.join(' | ')} |`;
const sep = `| --- | --- | ${cols.map(() => '---').join(' | ')} |`;
const rows = ACTION_CATALOG.map((a) => {
  const marks = cols.map((r) => (roleCan(r, a.action) ? '✓' : '—')).join(' | ');
  return `| \`${a.action}\` | ${a.description} | ${marks} |`;
});

const note = `\n_\`god\` has \`*\` (all actions). Anything not granted to a role is denied — so restore (employee & purchase log), purchase-log edit, and timetable management are god-only._\n`;

const out = `${header}${head}\n${sep}\n${rows.join('\n')}\n${note}`;
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'permissions.md');
writeFileSync(target, out);
console.log(`Wrote ${target}\n${ACTION_CATALOG.length} actions × ${cols.length} roles.`);
