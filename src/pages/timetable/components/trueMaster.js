// Build the "true master" grid model — a whole-school single sheet where the
// day-variation is folded into each cell as `Subject (day-range)`, mirroring the
// school's hand-made `Time Table 2026-27.xlsx` (see core-api
// modules/timetable/cpsat/render_xls_school.py, which this ports to JS).
//
// The model is layout-agnostic: the React view, the Excel export and the PDF export
// all consume the same shape so they stay in lockstep.
//
//   {
//     columns: [{ key, label, kind }]      // kind: 'class' | 'teach' | 'break' | 'diary'
//     teachColumns: [{ key, label, seq }]  // the teaching columns only, in order
//     rows: [{ classId, className, cells: { [teachKey]: Group[] } }]
//     days: number[]                       // active weekdays, ascending
//     teachers: [code|name...]             // (unused placeholder for future legend)
//   }
//   Group = { subject, days: number[], daysLabel: string, teachers: string[] }

const ROMAN_SEQ = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV",
];
const ROMAN_GRADE = {
  XII: 12, XI: 11, X: 10, IX: 9, VIII: 8, VII: 7, VI: 6, V: 5, IV: 4, III: 3, II: 2, I: 1,
};

// Order like the hand file: senior grades first (XII, XI … I), sections A→B within a grade.
function classSortKey(label) {
  const m = /^\s*(XII|XI|IX|VIII|VII|VI|IV|III|II|X|V|I)/.exec(label || "");
  const grade = m ? ROMAN_GRADE[m[1]] || 0 : 0;
  const rest = m ? label.slice(m.index + m[0].length) : label || "";
  return { grade, rest };
}

// [1,2,3,4,5,6] -> '1-6' ; [3,4] -> '3,4' ; [1,2,5,6] -> '1-2,5-6'.
export function formatDays(ds) {
  const s = [...new Set(ds)].sort((a, b) => a - b);
  const parts = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j += 1;
    parts.push(j > i ? `${s[i]}-${s[j]}` : `${s[i]}`);
    i = j + 1;
  }
  return parts.join(",");
}

export function buildTrueMaster({ config, entries, classNameById = {}, teacherNameById = {} }) {
  const days = [...(config?.days || [])]
    .filter((d) => (d.slots || []).length > 0)
    .map((d) => d.dayOfWeek)
    .sort((a, b) => a - b);

  // (dayOfWeek, sequence) -> slotType ; and slot uuid -> sequence (to place entries).
  const slotType = new Map(); // `${dow}|${seq}` -> type
  const seqOfSlot = new Map(); // slotUuid -> seq
  const seqSet = new Set();
  for (const d of config?.days || []) {
    for (const s of d.slots || []) {
      slotType.set(`${d.dayOfWeek}|${s.sequence}`, s.slotType);
      seqOfSlot.set(s.uuid, s.sequence);
      seqSet.add(s.sequence);
    }
  }
  const allSeqs = [...seqSet].sort((a, b) => a - b);

  // (classId, dayOfWeek, seq) -> [{ subject, teacher }]
  const byCell = new Map();
  for (const e of entries) {
    const seq = seqOfSlot.get(e.timeSlotId);
    if (seq == null) continue;
    const k = `${e.classId}|${e.dayOfWeek}|${seq}`;
    if (!byCell.has(k)) byCell.set(k, []);
    byCell.get(k).push({
      subject: e.subjectName || e.subjectId,
      teacher: e.teacherId ? teacherNameById[e.teacherId]?.name || teacherNameById[e.teacherId] || "" : "",
    });
  }

  // Column plan: a teaching seq -> Roman column; a lunch/break seq -> a Break divider;
  // everything else (assembly / registration / reserved) is omitted, per the hand file.
  const columns = [{ key: "class", label: "Class", kind: "class" }];
  const teachColumns = [];
  let ti = 0;
  for (const seq of allSeqs) {
    const types = new Set(days.map((d) => slotType.get(`${d}|${seq}`)).filter(Boolean));
    if (types.has("teaching")) {
      const key = `t${seq}`;
      const label = ti < ROMAN_SEQ.length ? ROMAN_SEQ[ti] : `P${seq}`;
      columns.push({ key, label, kind: "teach", seq });
      teachColumns.push({ key, label, seq });
      ti += 1;
    } else if (types.has("lunch") || types.has("break")) {
      columns.push({ key: `b${seq}`, label: "Break", kind: "break" });
    }
  }
  columns.push({ key: "diary", label: "Diary", kind: "diary" });

  // For one (class, teaching seq): group its day-varying offerings BY SUBJECT across all
  // days, one group per subject sized to its day-count, ordered by earliest day. Free
  // teaching periods contribute nothing; Saturday `activity` shows as "Activity".
  function groupsFor(classId, seq) {
    const groups = new Map(); // subject -> { days:[], teachers:[] }
    for (const d of days) {
      const st = slotType.get(`${d}|${seq}`);
      let subject;
      let teachers = [];
      if (st === "teaching") {
        const offs = byCell.get(`${classId}|${d}|${seq}`);
        if (!offs || offs.length === 0) continue; // free period
        subject = offs.map((o) => o.subject).join(" / ");
        teachers = offs.map((o) => o.teacher).filter(Boolean);
      } else if (st === "activity") {
        subject = "Activity";
      } else {
        continue; // assembly / reserved / registration — not shown
      }
      if (!groups.has(subject)) groups.set(subject, { days: [], teachers: [] });
      const g = groups.get(subject);
      g.days.push(d);
      for (const t of teachers) if (!g.teachers.includes(t)) g.teachers.push(t);
    }
    return [...groups.entries()].map(([subject, v]) => ({
      subject,
      days: v.days,
      daysLabel: formatDays(v.days),
      teachers: v.teachers,
    }));
  }

  const classIds = [...new Set(entries.map((e) => e.classId))].sort((a, b) => {
    const ka = classSortKey(classNameById[a] || a);
    const kb = classSortKey(classNameById[b] || b);
    if (ka.grade !== kb.grade) return kb.grade - ka.grade; // senior first
    return ka.rest.localeCompare(kb.rest, undefined, { numeric: true });
  });

  const rows = classIds.map((classId) => {
    const cells = {};
    for (const col of teachColumns) cells[col.key] = groupsFor(classId, col.seq);
    return { classId, className: classNameById[classId] || classId, cells };
  });

  return { columns, teachColumns, rows, days };
}
