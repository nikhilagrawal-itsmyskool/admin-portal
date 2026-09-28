import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Button, IconButton,
  TextField, MenuItem, ToggleButton, ToggleButtonGroup, Divider, LinearProgress,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { examinationService } from '../../services/examinationService';
import { useIsMobile } from '../../hooks/useIsMobile';

// Class-teacher co-scholastic entry (PWA). Grades the co-scholastic / personality / other areas
// (and the remark + attendance) for one student at a time. Class list = the caller's class-teacher
// classes (or every class, for the exam-incharge override).
export default function ReportCoscholastic() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const qClass = params.get('classId'); const qTerm = params.get('term');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(qClass || '');
  const [term, setTerm] = useState(qTerm === '2' ? 2 : 1);
  const termSet = useRef(false);
  const [grid, setGrid] = useState(null);
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState({}); // studentId -> { grades, remark, attendancePresent, attendanceTotal, house }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await examinationService.myReportClasses();
      let list = r.classes || [];
      // Honour an incharge deep-link from the Co-Scholastic Progress tab even if this caller isn't
      // the class teacher for it (the backend allows the exam-incharge override).
      if (qClass && !list.some((c) => c.classId === qClass)) {
        list = [{ classId: qClass, className: 'Selected class' }, ...list];
      }
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
      (g.students || []).forEach((s) => { d[s.studentId] = { grades: { ...s.grades }, remark: s.remark || '', attendancePresent: s.attendancePresent ?? '', attendanceTotal: s.attendanceTotal ?? '', house: s.house || '' }; });
      setDraft(d);
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

  const student = grid?.students?.[idx];
  const d = student ? draft[student.studentId] : null;
  const setField = (field, value) => setDraft((p) => ({ ...p, [student.studentId]: { ...p[student.studentId], [field]: value } }));
  const setGrade = (areaId, value) => setDraft((p) => ({ ...p, [student.studentId]: { ...p[student.studentId], grades: { ...p[student.studentId].grades, [areaId]: value } } }));

  const save = async () => {
    if (!student) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const g = await examinationService.saveReportCoscholastic(classId, term, [{ studentId: student.studentId, ...d }]);
      setGrid(g);
      setMsg(`Saved ${student.name}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', maxWidth: isMobile ? 640 : '100%', mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Co-Scholastic Grades</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Grade the co-scholastic areas, attendance and remark for your class — one student at a time.
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
                        <Stack key={a.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="body2" sx={{ flex: 1 }}>{a.label}</Typography>
                          {a.valueType === 'text' ? (
                            <TextField size="small" sx={{ width: 160 }} value={d.grades[a.id] || ''} onChange={(e) => setGrade(a.id, e.target.value)} />
                          ) : (
                            <ToggleButtonGroup exclusive size="small" value={d.grades[a.id] || null} onChange={(_, v) => setGrade(a.id, v)}>
                              {grid.scale.map((g) => <ToggleButton key={g.grade} value={g.grade} sx={{ px: 1.25, py: 0.25 }}>{g.grade}</ToggleButton>)}
                            </ToggleButtonGroup>
                          )}
                        </Stack>
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
                    <TextField size="small" type="number" label="Attendance (present)" sx={{ flex: 1 }} value={d.attendancePresent} onChange={(e) => setField('attendancePresent', e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="number" label="of (total)" sx={{ flex: 1 }} value={d.attendanceTotal} onChange={(e) => setField('attendanceTotal', e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Stack>
                  <TextField select size="small" fullWidth label="House" sx={{ mb: 1 }} value={d.house || ''} onChange={(e) => setField('house', e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {[...new Set([...(grid.houses || []), ...(d.house ? [d.house] : [])])].map((hn) => (
                      <MenuItem key={hn} value={hn}>{hn}</MenuItem>
                    ))}
                  </TextField>
                  <TextField size="small" fullWidth multiline minRows={2} label="Class teacher remark" value={d.remark} onChange={(e) => setField('remark', e.target.value)} />
                </CardContent>
              </Card>

              <Box sx={{ py: 2 }}>
                <Button fullWidth variant="contained" onClick={save} disabled={busy}>Save {student.name?.split(' ')[0]}</Button>
              </Box>
            </>
          )}
          {grid && !grid.students?.length && <Alert severity="info">No students enrolled in this class.</Alert>}
        </>
      )}
    </Box>
  );
}
