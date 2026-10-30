// Guardrail against the "two Jatins" mix-up: flag students in the same class who share a FIRST
// name, so whoever enters marks / co-scholastic or prints report cards double-checks they're on the
// right student. Father's name isn't stored, so the first name + roll/admission is the disambiguator.
// Returns Map<studentId, hintText>; only clashing students get an entry.
export function nameClashHints(students, idKey = 'studentId') {
  const firstOf = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const byFirst = new Map();
  for (const s of students || []) {
    const f = firstOf(s.name).toLowerCase();
    if (!f) continue;
    if (!byFirst.has(f)) byFirst.set(f, []);
    byFirst.get(f).push(s);
  }
  const hints = new Map();
  for (const grp of byFirst.values()) {
    if (grp.length < 2) continue;
    for (const s of grp) {
      const others = grp
        .filter((o) => o[idKey] !== s[idKey])
        .map((o) => (o.rollNumber != null ? `roll ${o.rollNumber}` : o.admissionNumber))
        .filter(Boolean);
      hints.set(
        s[idKey],
        `Shares the first name “${firstOf(s.name)}” with ${others.join(', ') || 'another student'} in this class — make sure you're on the right student.`,
      );
    }
  }
  return hints;
}
