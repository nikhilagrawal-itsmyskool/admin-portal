// Canonical date formatting for the whole portal. Use these instead of ad-hoc
// toLocaleDateString / string.slice so dates read consistently everywhere.
//
//   fmtDate(v)     -> dd-mm-yyyy      on-screen (Indian convention, compact)
//   fmtDateLong(v) -> dd-MMM-yyyy     printed / shared / formal (receipts, TC) — unambiguous
//   isoDate(v)     -> yyyy-mm-dd      CSV exports / machine use (sortable, re-importable)
//   fmtDateTime(v) -> dd-mm-yyyy HH:MM (local) for timestamps
//
// Date-only values (dob, receipt_date, withdrawal_date, …) are stored at 00:00 UTC, so the
// date parts are read in UTC to avoid an off-by-one-day shift in IST. fmtDateTime reads the
// local instant since those are real timestamps.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export function isoDate(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(v) {
  const d = parse(v);
  if (!d) return v ? String(v) : '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${hh}:${mm}`;
}
