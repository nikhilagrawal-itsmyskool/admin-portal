// Date + presentation helpers for the Academic Calendar. UTC-string arithmetic
// (matches the backend's weekday resolution — no tz drift), Sunday-start month grid
// (Sunday is the school's weekly off, shown in the first column).

export const iso = (d) => d.toISOString().slice(0, 10);
export const parseISO = (s) => new Date(`${s}T00:00:00Z`);
const pad = (n) => String(n).padStart(2, '0');

export const monthLabel = (year, month) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const monthBounds = (year, month) => ({
  from: `${year}-${pad(month)}-01`,
  to: `${year}-${pad(month)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`,
});

// A Sunday-start 6×7 grid of yyyy-mm-dd strings (with leading/trailing blanks as null)
// covering the given month. Each cell: { date, day, inMonth }.
export const monthGridSun = (year, month) => {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = first.getUTCDay(); // 0 Sun..6 Sat
  const cur = new Date(first);
  cur.setUTCDate(1 - lead);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: iso(cur), day: cur.getUTCDate(), inMonth: cur.getUTCMonth() === month - 1 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
    if (cur.getUTCMonth() !== month - 1 && cur.getUTCDate() > 7) break; // stop once past the month
  }
  return weeks;
};

export const WEEKDAY_HEADS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = {
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};

// Per-type presentation. Colors are the entry-type palette (semantic, separate from
// the app accent). `theme` renders as an italic thought, not a chip. Unknown/custom
// types fall back to a neutral slate.
export const TYPE_META = {
  festival: { color: '#7b41d8', bg: '#f1eafc', abbr: 'FEST' },
  important_day: { color: '#0277bd', bg: '#e6f2fb', abbr: 'IMP' },
  celebration_type: { color: '#00796b', bg: '#e2f3f1', abbr: 'CEL' },
  remembrance: { color: '#8d6144', bg: '#f3ece6', abbr: 'REM' },
  theme: { color: '#3366ff', bg: '#eaf0ff', abbr: 'THT' },
  academics: { color: '#e06f00', bg: '#fdefe0', abbr: 'ACAD' },
};
export const CHIP_CODES = ['festival', 'important_day', 'celebration_type', 'remembrance', 'academics'];
export const typeMeta = (code) => TYPE_META[code] || { color: '#5f6c8f', bg: '#eef1f6' };
// A short uppercase tag for a type: seeded abbreviation, else derived from its name.
export const typeAbbr = (code, name) => TYPE_META[code]?.abbr || (name || code || '').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
