import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, LinearProgress, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { examinationService } from '../../services/examinationService';

// Subject-teacher marks entry (PWA). Lists the class × subject pairs the teacher is mapped to in
// the syllabus; opening one shows a per-student grid of that band's Term component columns.
// The exam-incharge can also deep-link to any (classId, subjectCode, term) from the dashboard.
export default function ReportMarks() {
  const [params] = useSearchParams();
  const qClass = params.get('classId'); const qSubject = params.get('subjectCode'); const qTerm = params.get('term');
  const [subjects, setSubjects] = useState([]);
  const [sel, setSel] = useState(qClass && qSubject ? `${qClass}|${qSubject}` : ''); // "classId|subjectCode"
  const [term, setTerm] = useState(qTerm === '2' ? 2 : 1);
  const [grid, setGrid] = useState(null);
  const [vals, setVals] = useState({}); // studentId -> { componentCode: value }
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
        subs = [{ classId: qClass, subjectCode: qSubject, className: 'Selected class', reportLabel: qSubject }, ...subs];
      }
      setSubjects(subs);
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
      const v = {}; (g.students || []).forEach((s) => { v[s.studentId] = { ...s.marks }; });
      setVals(v);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the marks grid');
      setGrid(null);
    } finally { setBusy(false); }
  }, [sel, term]);
  useEffect(() => { loadGrid(); }, [loadGrid]);

  const setCell = (sid, code, value) => setVals((v) => ({ ...v, [sid]: { ...v[sid], [code]: value } }));

  const save = async () => {
    if (!sel) return;
    const [classId, subjectCode] = sel.split('|');
    setBusy(true); setErr(''); setMsg('');
    try {
      const entries = Object.keys(vals).map((sid) => ({ studentId: sid, marks: vals[sid] }));
      const g = await examinationService.saveReportMarks(classId, subjectCode, term, entries);
      setGrid(g);
      const v = {}; (g.students || []).forEach((s) => { v[s.studentId] = { ...s.marks }; });
      setVals(v);
      setMsg('Marks saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save marks');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Enter Marks</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter Term marks for the subjects you teach. Marks save per class &amp; subject.
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

              <Stack spacing={1}>
                {grid.students.map((s, i) => (
                  <Card key={s.studentId} variant="outlined">
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[s.rollNumber != null ? `Roll ${s.rollNumber}` : null, s.admissionNumber].filter(Boolean).join(' · ')}
                        </Typography>
                      </Stack>
                      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${grid.components.length}, 1fr)`, gap: 0.75 }}>
                        {grid.components.map((c) => (
                          <TextField
                            key={c.code} type="number" size="small" label={`${c.label}/${c.max}`}
                            value={vals[s.studentId]?.[c.code] ?? ''}
                            onChange={(e) => setCell(s.studentId, c.code, e.target.value)}
                            inputProps={{ min: 0, max: c.max, style: { textAlign: 'center', padding: '6px 4px' } }}
                            InputLabelProps={{ shrink: true, style: { fontSize: 12 } }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                {!grid.students.length && <Alert severity="info">No students enrolled in this class.</Alert>}
              </Stack>

              {grid.students.length > 0 && (
                <Box sx={{ position: 'sticky', bottom: 0, py: 1.5, mt: 1, background: (t) => t.palette.background.default }}>
                  <Button fullWidth variant="contained" onClick={save} disabled={busy}>Save marks</Button>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
