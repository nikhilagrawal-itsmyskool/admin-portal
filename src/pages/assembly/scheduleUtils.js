// Small date helpers for the Schedule views. All arithmetic is done in UTC on
// yyyy-mm-dd strings so it matches the backend's weekday resolution (no tz drift).

export const iso = (d) => d.toISOString().slice(0, 10);
export const parseISO = (s) => new Date(`${s}T00:00:00Z`);

export const addDays = (s, n) => {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

// School-local (IST) today, so "today" matches the school day near UTC midnight.
export const todayISO = () => iso(new Date(Date.now() + 5.5 * 3600 * 1000));

export const weekdayOf = (s) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][parseISO(s).getUTCDay()];

// Monday of the week containing s.
export const mondayOf = (s) => {
  const dow = parseISO(s).getUTCDay(); // 0 Sun..6 Sat
  return addDays(s, dow === 0 ? -6 : 1 - dow);
};

// [Mon..Mon+count-1] dates from a Monday.
export const weekDates = (mondayIso, count = 6) => Array.from({ length: count }, (_, i) => addDays(mondayIso, i));

export const fmtDay = (s) => parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmtRange = (a, b) => `${parseISO(a).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${parseISO(b).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
export const monthLabel = (year, month) => new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// 6×7 Monday-start grid of { date, day, inMonth } for a given month (1-12).
export const monthGrid = (year, month) => {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = first.getUTCDay() === 0 ? 6 : first.getUTCDay() - 1;
  let cur = new Date(first);
  cur.setUTCDate(1 - lead);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: iso(cur), day: cur.getUTCDate(), inMonth: cur.getUTCMonth() === month - 1 });
      cur = new Date(cur);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

export const WEEKDAY_HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
