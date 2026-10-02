import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, LinearProgress, Divider, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableBody, TableRow, TableCell, Paper,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { examinationService } from '../../services/examinationService';
import { useIsMobile } from '../../hooks/useIsMobile';

// Keep a box to a valid mark: '' (blank), 'A' (Absent — a/A only), or a number clamped to 0..max.
// Any other character is dropped as typed, so an invalid value can never be entered.
function sanitizeMark(raw, max) {
  const t = String(raw).trim();
  if (t === '') return '';
  if (/^a$/i.test(t)) return 'A';
  let n = t.replace(/[^0-9.]/g, '');
  if (n === '' || n === '.') return '';
  if (max != null && Number(n) > Number(max)) n = String(max);
  return n;
}

// Scale a raw Class-Test mark (out of `denom`) to the component's max (`target`), round to nearest.
// Returns null for blank/Absent/non-numeric so the hint shows nothing.
function scaled(raw, denom, target) {
  if (raw === '' || raw == null || String(raw).toUpperCase() === 'A') return null;
  const n = Number(raw);
  if (isNaN(n) || !denom) return null;
  return Math.round((n / Number(denom)) * Number(target));
}

// One student's row of mark inputs (desktop). Memoized on its own values so a keystroke in any
// row re-renders ONLY that row — not the whole class grid. rowVals is vals[studentId], whose
// reference changes only for the edited student (setCell spreads the rest by reference).
const MarkRow = React.memo(function MarkRow({ student, components, rowVals, rowDenoms, onCell, onDenom }) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{student.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {[student.rollNumber != null ? `Roll ${student.rollNumber}` : null, student.admissionNumber].filter(Boolean).join(' · ')}
        </Typography>
      </TableCell>
      {components.map((c) => {
        const isCT = c.target != null;
        const denom = isCT ? Number(rowDenoms?.[c.code] ?? c.max) : c.max; // this student's own 'out of'
        const sc = isCT ? scaled(rowVals?.[c.code], denom, c.target) : null;
        return (
          <TableCell key={c.code} align="center" sx={{ px: 0.5 }}>
            <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center">
              <TextField
                type="text" inputMode="numeric" size="small" variant="outlined"
                value={rowVals?.[c.code] ?? ''}
                onChange={(e) => onCell(student.studentId, c.code, sanitizeMark(e.target.value, denom))}
                inputProps={{ maxLength: 4, style: { textAlign: 'center', padding: '6px 4px', width: 46 } }}
              />
              {isCT && (
                <>
                  <Typography variant="caption" color="text.secondary">/</Typography>
                  <TextField
                    type="text" inputMode="numeric" size="small" variant="outlined"
                    value={rowDenoms?.[c.code] ?? c.max}
                    onChange={(e) => onDenom(student.studentId, c.code, e.target.value)}
                    inputProps={{ maxLength: 3, style: { textAlign: 'center', padding: '6px 4px', width: 38 } }}
                  />
                </>
              )}
            </Stack>
            {isCT && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, minHeight: 14 }}>
                {sc != null ? `→ ${sc}/${c.target}` : ''}
              </Typography>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
});

// One student's card of mark inputs (mobile) — same per-row memoization.
const MarkCard = React.memo(function MarkCard({ student, components, rowVals, rowDenoms, onCell, onDenom }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{student.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {[student.rollNumber != null ? `Roll ${student.rollNumber}` : null, student.admissionNumber].filter(Boolean).join(' · ')}
          </Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${components.length}, 1fr)`, gap: 0.75 }}>
          {components.map((c) => {
            const isCT = c.target != null;
            const denom = isCT ? Number(rowDenoms?.[c.code] ?? c.max) : c.max;
            const sc = isCT ? scaled(rowVals?.[c.code], denom, c.target) : null;
            return (
              <Box key={c.code}>
                <TextField
                  fullWidth type="text" inputMode="numeric" size="small" label={isCT ? `${c.label} (raw)` : `${c.label}/${c.max}`}
                  value={rowVals?.[c.code] ?? ''}
                  onChange={(e) => onCell(student.studentId, c.code, sanitizeMark(e.target.value, denom))}
                  inputProps={{ maxLength: 4, style: { textAlign: 'center', padding: '6px 4px' } }}
                  InputLabelProps={{ shrink: true, style: { fontSize: 12 } }}
                />
                {isCT && (
                  <TextField
                    fullWidth type="text" inputMode="numeric" size="small" label="out of" sx={{ mt: 0.5 }}
                    value={rowDenoms?.[c.code] ?? c.max}
                    onChange={(e) => onDenom(student.studentId, c.code, e.target.value)}
                    inputProps={{ maxLength: 3, style: { textAlign: 'center', padding: '6px 4px' } }}
                    InputLabelProps={{ shrink: true, style: { fontSize: 12 } }}
                  />
                )}
                {isCT && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', minHeight: 14 }}>
                    {sc != null ? `→ ${sc}/${c.target}` : ''}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
});

// Subject-teacher marks entry (PWA). Lists the class × subject pairs the teacher is mapped to in
// the syllabus; opening one shows a per-student grid of that band's Term component columns.
// The exam-incharge can also deep-link to any (classId, subjectCode, term) from the dashboard.
export default function ReportMarks() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const qClass = params.get('classId'); const qSubject = params.get('subjectCode'); const qTerm = params.get('term');
  const qClassName = params.get('className'); const qSubjectLabel = params.get('subjectLabel');
  const [subjects, setSubjects] = useState([]);
  const [sel, setSel] = useState(qClass && qSubject ? `${qClass}|${qSubject}` : ''); // "classId|subjectCode"
  const [term, setTerm] = useState(qTerm === '2' ? 2 : 1);
  const termSet = useRef(false);
  const [grid, setGrid] = useState(null);
  const [vals, setVals] = useState({}); // studentId -> { componentCode: value }
  const [rowDenoms, setRowDenoms] = useState({}); // studentId -> { code: 'out of' } (per-student, scalable cols)
  const [classDenoms, setClassDenoms] = useState({}); // code -> class-level default 'out of' (bulk pre-fill control)
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const loadSubjects = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await examinationService.myReportSubjects();
      let subs = r.subjects || [];
      // Honour a dashboard deep-link even if this caller doesn't "own" the subject (incharge override).
      if (qClass && qSubject && !subs.some((s) => s.classId === qClass && s.subjectCode === qSubject)) {
        subs = [{ classId: qClass, subjectCode: qSubject, className: qClassName || 'Selected class', reportLabel: qSubjectLabel || qSubject }, ...subs];
      }
      setSubjects(subs);
      if (!termSet.current) { termSet.current = true; if (!qTerm && r.currentTerm) setTerm(r.currentTerm); }
      setSel((prev) => prev || (subs[0] ? `${subs[0].classId}|${subs[0].subjectCode}` : ''));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load your subjects');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadSubjects(); }, [loadSubjects]);

  const loadGrid = useCallback(async () => {
    if (!sel) { setGrid(null); return; }
    const [classId, subjectCode] = sel.split('|');
    setBusy(true); setErr(''); setMsg('');
    try {
      const g = await examinationService.myReportMarks(classId, subjectCode, term);
      setGrid(g);
      const v = {}, rd = {}; (g.students || []).forEach((s) => { v[s.studentId] = { ...s.marks }; rd[s.studentId] = { ...(s.denoms || {}) }; });
      setVals(v); setRowDenoms(rd); setClassDenoms({ ...(g.defaultDenominators || {}) }); setDirty(false);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the marks grid');
      setGrid(null);
    } finally { setBusy(false); }
  }, [sel, term]);
  useEffect(() => { loadGrid(); }, [loadGrid]);

  // Scalable columns carry `target` (the component max they scale to); the per-student 'out of'
  // lives in rowDenoms. Stable across keystrokes so memoized rows don't all re-render while typing.
  const effComps = useMemo(() => (grid?.components || []).map((c) => (
    c.denomEditable ? { ...c, target: c.max } : c
  )), [grid]);

  // Stable callbacks + memoized rows so a keystroke re-renders ONLY the edited student's cells,
  // not the whole grid of ~200 inputs (that full re-render is what made entry laggy).
  const setCell = useCallback((sid, code, value) => { setDirty(true); setVals((v) => ({ ...v, [sid]: { ...v[sid], [code]: value } })); }, []);

  // Change ONE student's 'out of' for a scalable column; re-clamp that student's mark if it now exceeds it.
  const setDenom = useCallback((sid, code, raw) => {
    const n = String(raw).replace(/[^0-9]/g, '');
    const d = n === '' ? '' : Math.max(1, Number(n));
    setDirty(true);
    setRowDenoms((p) => ({ ...p, [sid]: { ...p[sid], [code]: d } }));
    if (d !== '') setVals((v) => {
      const cur = v[sid]?.[code];
      if (cur != null && cur !== '' && String(cur).toUpperCase() !== 'A' && Number(cur) > d) return { ...v, [sid]: { ...v[sid], [code]: String(d) } };
      return v;
    });
  }, []);

  // Class-level default: set EVERY student's 'out of' for a column (and re-clamp marks above it).
  const setAllDenom = (code, raw) => {
    const n = String(raw).replace(/[^0-9]/g, '');
    const d = n === '' ? '' : Math.max(1, Number(n));
    setDirty(true);
    setClassDenoms((p) => ({ ...p, [code]: d }));
    if (d === '') return;
    setRowDenoms((p) => { const out = {}; for (const sid of Object.keys(p)) out[sid] = { ...p[sid], [code]: d }; return out; });
    setVals((v) => {
      const out = {}; let changed = false;
      for (const sid of Object.keys(v)) {
        const cur = v[sid]?.[code];
        if (cur != null && cur !== '' && String(cur).toUpperCase() !== 'A' && Number(cur) > d) { out[sid] = { ...v[sid], [code]: String(d) }; changed = true; }
        else out[sid] = v[sid];
      }
      return changed ? out : v;
    });
  };

  const save = async () => {
    if (!sel) return;
    const [classId, subjectCode] = sel.split('|');
    setBusy(true); setErr(''); setMsg('');
    try {
      // Each entry carries this student's own 'out of' for the scalable columns.
      const entries = Object.keys(vals).map((sid) => ({ studentId: sid, marks: vals[sid], denominators: rowDenoms[sid] || {} }));
      const g = await examinationService.saveReportMarks(classId, subjectCode, term, entries);
      setGrid(g);
      const v = {}, rd = {}; (g.students || []).forEach((s) => { v[s.studentId] = { ...s.marks }; rd[s.studentId] = { ...(s.denoms || {}) }; });
      setVals(v); setRowDenoms(rd); setDirty(false);
      setMsg('Marks saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save marks');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', maxWidth: isMobile ? 760 : '100%', mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Enter Marks</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter Term marks for the subjects you teach. Type <b>A</b> for Absent. A Class Test is entered
        as the raw mark <b>out of</b> the total it was conducted on (per student) — it scales to the report total automatically. Marks save per class &amp; subject.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {subjects.length === 0 ? (
        <Alert severity="info">No subjects are mapped to you in the syllabus for this year.</Alert>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField select size="small" fullWidth label="Class &amp; subject" value={sel} onChange={(e) => setSel(e.target.value)}>
              {subjects.map((s) => (
                <MenuItem key={`${s.classId}|${s.subjectCode}`} value={`${s.classId}|${s.subjectCode}`}>
                  {s.className} · {s.reportLabel}
                </MenuItem>
              ))}
            </TextField>
            <ToggleButtonGroup exclusive size="small" value={term} onChange={(_, v) => v && setTerm(v)}>
              <ToggleButton value={1} sx={{ px: 2 }}>Term 1</ToggleButton>
              <ToggleButton value={2} sx={{ px: 2 }}>Term 2</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {busy && !grid && <LinearProgress sx={{ mb: 2 }} />}

          {grid && (
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle1"><b>{grid.className}</b> · {grid.subject?.label}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip size="small" variant="outlined" label={`${grid.entered}/${grid.total} complete`} />
              </Stack>

              {effComps.some((c) => c.target != null) && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Class Test — set all “out of”:</Typography>
                    {effComps.filter((c) => c.target != null).map((c) => (
                      <Stack key={c.code} direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                        <TextField
                          type="text" inputMode="numeric" size="small"
                          value={classDenoms[c.code] ?? c.target}
                          onChange={(e) => setAllDenom(c.code, e.target.value)}
                          inputProps={{ maxLength: 3, style: { width: 44, textAlign: 'center', padding: '6px 4px' } }}
                        />
                        <Typography variant="caption" color="text.secondary">→ scaled to /{c.target}</Typography>
                      </Stack>
                    ))}
                    <Typography variant="caption" color="text.secondary">Applies to every student; override per student below.</Typography>
                  </Stack>
                </Paper>
              )}

              {!grid.students.length ? (
                <Alert severity="info">No students enrolled in this class.</Alert>
              ) : isMobile ? (
                <Stack spacing={1}>
                  {grid.students.map((s) => (
                    <MarkCard key={s.studentId} student={s} components={effComps} rowVals={vals[s.studentId]} rowDenoms={rowDenoms[s.studentId]} onCell={setCell} onDenom={setDenom} />
                  ))}
                </Stack>
              ) : (
                // Desktop: a spreadsheet-style table — students down, components across.
                <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Student</TableCell>
                        {effComps.map((c) => (
                          <TableCell key={c.code} align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {c.label}<Typography variant="caption" color="text.secondary"> {c.target != null ? `(raw / out of → /${c.target})` : `/${c.max}`}</Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grid.students.map((s) => (
                        <MarkRow key={s.studentId} student={s} components={effComps} rowVals={vals[s.studentId]} rowDenoms={rowDenoms[s.studentId]} onCell={setCell} onDenom={setDenom} />
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {grid.students.length > 0 && (
                <Box sx={{ py: 2 }}>
                  <Button fullWidth variant={dirty ? 'contained' : 'outlined'} onClick={save} disabled={busy || !dirty}>{dirty ? 'Save marks' : 'No changes'}</Button>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
