import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Button, IconButton,
  TextField, MenuItem, ToggleButton, ToggleButtonGroup, Chip, LinearProgress,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { examinationService } from '../../services/examinationService';
import { useIsMobile } from '../../hooks/useIsMobile';

// Compute a co-scholastic grade from marks (client-side preview; the card recomputes server-side).
// /10 areas grade the raw mark; /100 areas grade the percent (marks ÷ effMax × 100).
function gradeFor(area, marks, effMax, scales) {
  if (marks == null || marks === '') return null;
  const n = Number(marks);
  if (isNaN(n)) return null;
  const table = area.scaleKind === 'coscholastic10' ? scales.s10 : scales.s100;
  if (!table || !table.length) return null;
  const value = area.scaleKind === 'coscholastic10' ? n : (effMax ? (n / effMax) * 100 : NaN);
  if (isNaN(value)) return null;
  const sorted = [...table].sort((a, b) => (Number(b.minPct) || 0) - (Number(a.minPct) || 0));
  const hit = sorted.find((r) => value >= (Number(r.minPct) || 0));
  return (hit || sorted[sorted.length - 1]).grade;
}
// A co-scholastic box only holds: Absent (a/A), or a number clamped to 0..max. Anything else dropped.
const parseMark = (v, max) => {
  const t = String(v).trim();
  if (/^a$/i.test(t)) return { absent: true, marks: null };
  let n = t.replace(/[^0-9.]/g, '');
  if (n === '.') n = '';
  if (max != null && n !== '' && Number(n) > Number(max)) n = String(max);
  return { absent: false, marks: n };
};

// One area's input. Marks areas = a number/A box + (max N) hint + live computed grade; pre-primary
// = a grade toggle; text = a text field. Memoized on its own cell so a keystroke re-renders only it.
const AreaField = React.memo(function AreaField({ area, cell, effMax, scales, studentId, onCell }) {
  if (area.valueType === 'text') {
    return (
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" sx={{ flex: 1 }}>{area.label}</Typography>
        <TextField size="small" sx={{ width: 170 }} value={cell?.text || ''} onChange={(e) => onCell(studentId, area.id, { text: e.target.value })} />
      </Stack>
    );
  }
  if (area.valueType === 'grade') { // pre-primary direct grade
    return (
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" sx={{ flex: 1 }}>{area.label}</Typography>
        <ToggleButtonGroup exclusive size="small" value={cell?.grade || null} onChange={(_, v) => onCell(studentId, area.id, { grade: v })}>
          {(scales.s100 || []).map((g) => <ToggleButton key={g.grade} value={g.grade} sx={{ px: 1.1, py: 0.25 }}>{g.grade}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>
    );
  }
  // marks
  const absent = !!cell?.absent;
  const grade = absent ? null : gradeFor(area, cell?.marks, effMax, scales);
  const outOf = area.denomEditable ? (effMax || '?') : area.max;
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{area.label}</Typography>
        <Typography variant="caption" color="text.secondary">max {outOf}</Typography>
      </Box>
      <TextField
        size="small" sx={{ width: 62 }} value={absent ? 'A' : (cell?.marks ?? '')}
        onChange={(e) => onCell(studentId, area.id, parseMark(e.target.value, effMax))}
        inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', padding: '6px 4px' } }}
      />
      <Chip size="small" variant="outlined" sx={{ width: 46 }}
        color={absent ? 'error' : (grade ? 'primary' : 'default')}
        label={absent ? 'Ab' : (grade || '—')} />
    </Stack>
  );
});

// Class-teacher co-scholastic entry (PWA). Enters MARKS per area (grade computed from the scheme's
// scale); GA/Reasoning/Value Education take a per-class "out of". One student at a time.
export default function ReportCoscholastic() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const qClass = params.get('classId'); const qTerm = params.get('term'); const qClassName = params.get('className');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(qClass || '');
  const [term, setTerm] = useState(qTerm === '2' ? 2 : 1);
  const termSet = useRef(false);
  const [grid, setGrid] = useState(null);
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState({});   // studentId -> { cells, remark, attendancePresent, attendanceTotal, house }
  const [denoms, setDenoms] = useState({});  // areaId -> per-class "out of" (denominator-editable areas)
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await examinationService.myReportClasses();
      let list = r.classes || [];
      if (qClass && !list.some((c) => c.classId === qClass)) list = [{ classId: qClass, className: qClassName || 'Selected class' }, ...list];
      setClasses(list);
      if (!termSet.current) { termSet.current = true; if (!qTerm && r.currentTerm) setTerm(r.currentTerm); }
      setClassId((prev) => prev || (list[0]?.classId || ''));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load your classes');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadGrid = useCallback(async () => {
    if (!classId) { setGrid(null); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const g = await examinationService.myReportCoscholastic(classId, term);
      setGrid(g); setIdx(0);
      const d = {};
      (g.students || []).forEach((s) => { d[s.studentId] = { cells: { ...(s.cells || {}) }, remark: s.remark || '', attendancePresent: s.attendancePresent ?? '', attendanceTotal: s.attendanceTotal ?? '', house: s.house || '' }; });
      setDraft(d);
      setDenoms({ ...(g.denominators || {}) });
      setDirty(false);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load co-scholastic grid');
      setGrid(null);
    } finally { setBusy(false); }
  }, [classId, term]);
  useEffect(() => { loadGrid(); }, [loadGrid]);

  const sections = useMemo(() => {
    const map = {};
    (grid?.areas || []).forEach((a) => { (map[a.section] ||= []).push(a); });
    return Object.entries(map);
  }, [grid]);
  const denomAreas = useMemo(() => (grid?.areas || []).filter((a) => a.denomEditable), [grid]);
  const scales = useMemo(() => ({ s100: grid?.scale || [], s10: grid?.scale10 || [] }), [grid]);

  const student = grid?.students?.[idx];
  const d = student ? draft[student.studentId] : null;
  const setField = useCallback((sid, field, value) => { setDirty(true); setDraft((p) => ({ ...p, [sid]: { ...p[sid], [field]: value } })); }, []);
  const setCell = useCallback((sid, areaId, patch) => { setDirty(true); setDraft((p) => ({ ...p, [sid]: { ...p[sid], cells: { ...p[sid].cells, [areaId]: { ...p[sid].cells?.[areaId], ...patch } } } })); }, []);

  const save = async () => {
    if (!student) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const g = await examinationService.saveReportCoscholastic(classId, term, [{
        studentId: student.studentId, cells: d.cells, denominators: denoms,
        remark: d.remark, attendancePresent: d.attendancePresent, attendanceTotal: d.attendanceTotal, house: d.house,
      }]);
      setGrid(g); setDirty(false);
      setMsg(`Saved ${student.name}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', maxWidth: isMobile ? 640 : '100%', mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Co-Scholastic Marks</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter marks for each area — type <b>A</b> for Absent. The grade is computed from the scheme's scale and shown beside each entry.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {classes.length === 0 ? (
        <Alert severity="info">You are not set as class teacher for any class this year.</Alert>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField select size="small" fullWidth label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <MenuItem key={c.classId} value={c.classId}>{c.className}</MenuItem>)}
            </TextField>
            <ToggleButtonGroup exclusive size="small" value={term} onChange={(_, v) => v && setTerm(v)}>
              <ToggleButton value={1} sx={{ px: 2 }}>Term 1</ToggleButton>
              <ToggleButton value={2} sx={{ px: 2 }}>Term 2</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {busy && !grid && <LinearProgress sx={{ mb: 2 }} />}

          {grid && denomAreas.length > 0 && (
            <Card variant="outlined" sx={{ mb: 1.5, borderColor: 'warning.light' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>Marked out of (this class)</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  These areas have no common total — set what they were marked out of for this class; grades scale to 100.
                </Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5}>
                  {denomAreas.map((a) => (
                    <TextField key={a.id} size="small" sx={{ width: 150 }} label={`${a.label} — out of`} value={denoms[a.id] ?? ''}
                      onChange={(e) => { setDirty(true); setDenoms((p) => ({ ...p, [a.id]: e.target.value })); }} inputProps={{ inputMode: 'numeric' }} InputLabelProps={{ shrink: true }} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {grid && student && d && (
            <>
              {/* student pager */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <IconButton size="small" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}><ChevronLeft /></IconButton>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{student.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{idx + 1} of {grid.students.length}{student.rollNumber != null ? ` · Roll ${student.rollNumber}` : ''}</Typography>
                </Box>
                <IconButton size="small" disabled={idx >= grid.students.length - 1} onClick={() => setIdx((i) => Math.min(grid.students.length - 1, i + 1))}><ChevronRight /></IconButton>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
              {sections.map(([section, areas]) => (
                <Card key={section} variant="outlined">
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1 }}>{section}</Typography>
                    <Stack spacing={1}>
                      {areas.map((a) => (
                        <AreaField key={a.id} area={a} cell={d.cells?.[a.id]}
                          effMax={a.denomEditable ? (denoms[a.id] === '' || denoms[a.id] == null ? null : Number(denoms[a.id])) : a.max}
                          scales={scales} studentId={student.studentId} onCell={setCell} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              </Box>

              <Card variant="outlined" sx={{ mb: 1.5 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1 }}>Details</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <TextField size="small" type="number" label="Attendance (present)" sx={{ flex: 1 }} value={d.attendancePresent} onChange={(e) => setField(student.studentId, 'attendancePresent', e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="number" label="of (total)" sx={{ flex: 1 }} value={d.attendanceTotal} onChange={(e) => setField(student.studentId, 'attendanceTotal', e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Stack>
                  <TextField select size="small" fullWidth label="House" sx={{ mb: 1 }} value={d.house || ''} onChange={(e) => setField(student.studentId, 'house', e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {[...new Set([...(grid.houses || []), ...(d.house ? [d.house] : [])])].map((hn) => (
                      <MenuItem key={hn} value={hn}>{hn}</MenuItem>
                    ))}
                  </TextField>
                  <TextField size="small" fullWidth multiline minRows={2} label="Class teacher remark" value={d.remark} onChange={(e) => setField(student.studentId, 'remark', e.target.value)} />
                </CardContent>
              </Card>

              <Box sx={{ py: 2 }}>
                <Button fullWidth variant={dirty ? 'contained' : 'outlined'} onClick={save} disabled={busy || !dirty}>{dirty ? `Save ${student.name?.split(' ')[0]}` : 'No changes'}</Button>
              </Box>
            </>
          )}
          {grid && !grid.students?.length && <Alert severity="info">No students enrolled in this class.</Alert>}
        </>
      )}
    </Box>
  );
}
