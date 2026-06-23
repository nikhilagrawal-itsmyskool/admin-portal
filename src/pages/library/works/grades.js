// Books map to a grade (class), not a section. Class names here are
// "<grade>-<section>" (e.g. "VI-A", "Nursery-B"), so we derive the distinct
// grade by stripping the trailing "-<section>" and order them by a fixed rank.

const GRADE_RANK = [
  'PRE-NURSERY', 'PRE NURSERY', 'PLAYGROUP', 'NURSERY', 'KG', 'LKG', 'UKG',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
];

export function gradeOf(className) {
  if (!className) return '';
  // strip the last "-<section>" segment if present
  const idx = className.lastIndexOf('-');
  return (idx > 0 ? className.slice(0, idx) : className).trim();
}

export function rankOf(grade) {
  const i = GRADE_RANK.indexOf((grade || '').toUpperCase());
  return i === -1 ? 999 : i;
}

// Distinct, ordered grade list derived from the class records.
export function gradesFromClasses(classes = []) {
  const set = new Set();
  classes.forEach((c) => {
    const g = gradeOf(c.name || c.code);
    if (g) set.add(g);
  });
  return [...set].sort((a, b) => rankOf(a) - rankOf(b) || a.localeCompare(b));
}
