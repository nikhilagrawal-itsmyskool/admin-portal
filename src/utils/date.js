// Canonical date/time handling for the whole portal. Use these instead of ad-hoc
// toLocaleDateString / string.slice / new Date().toISOString() so everything reads
// consistently AND in the school's timezone (IST) everywhere.
//
//   fmtDate(v)     -> dd-mm-yyyy       on-screen (Indian convention, compact)     [date-only]
//   fmtDateLong(v) -> dd-MMM-yyyy      printed / shared / formal (receipts, TC)   [date-only]
//   fmtDateDow(v)  -> "Mon 13-04-2026" day-of-week labels (rosters, checklists)   [date-only]
//   isoDate(v)     -> yyyy-mm-dd       CSV exports / machine use (sortable)        [date-only]
//   fmtDateTime(v) -> dd-mm-yyyy HH:MM real timestamps, rendered in IST           [timestamp]
//   todayIso()     -> yyyy-mm-dd       "today" in IST — form defaults / filters
//
// Two distinct rules, matching how the data is stored:
//   • Date-only columns (dob, receipt_date, withdrawal_date, …) are stored at 00:00 UTC.
//     Their formatters do NO timezone conversion — they read the literal calendar parts
//     (via UTC getters), so the stored day is shown as-is.
//   • Real timestamps (created_at, scheduled_at, …) are stored in UTC (AWS Lambdas run in
//     UTC). fmtDateTime converts them to IST for display. We pin IST explicitly rather than
//     trusting the browser zone, so it's correct on any device / SSR.
//   • "Today" must be the IST calendar day. new Date().toISOString() gives the UTC day, which
//     is YESTERDAY between 00:00–05:30 IST — use todayIso() instead.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// IST is UTC+5:30 year-round (no DST). Shift an instant by the offset so that reading it
// with UTC getters yields the IST wall-clock.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const toIst = (d) => new Date(d.getTime() + IST_OFFSET_MS);

const parse = (v) => {
  if (v == null || v === '') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export function fmtDate(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
}

export function fmtDateLong(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MON[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

// "Mon 13-04-2026" — for day-of-week-significant labels (rosters, daily checklists).
export function fmtDateDow(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  return `${DOW[d.getUTCDay()]} ${fmtDate(v)}`;
}

export function isoDate(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  const t = toIst(d); // stored UTC -> IST wall-clock (read via UTC getters)
  const hh = String(t.getUTCHours()).padStart(2, '0');
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  return `${String(t.getUTCDate()).padStart(2, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${t.getUTCFullYear()} ${hh}:${mm}`;
}

// Today's calendar date in IST (yyyy-mm-dd). Use for form defaults / date filters
// instead of new Date().toISOString().slice(0,10) (which is the UTC day and reads
// as yesterday between 00:00–05:30 IST).
export function todayIso() {
  return toIst(new Date()).toISOString().slice(0, 10);
}
