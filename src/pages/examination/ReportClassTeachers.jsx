import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, Divider, Autocomplete, IconButton, FormControlLabel, Switch, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { employeeService } from '../../services/employeeService';

const gradeOf = (name) => (name && name.indexOf('-') !== -1 ? name.slice(0, name.indexOf('-')) : name || '').trim();

// Admin/god: per-section class teachers for the exam module. The PRIMARY class teacher comes from the
// timetable (read-only here); add SECONDARY class teachers who can also enter co-scholastic/attendance/
// remark. Flag "acts as primary" to also give that teacher marks-entry access to every subject.
export default function ReportClassTeachers() {
  const [classes, setClasses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grade, setGrade] = useState('');
  const [maps, setMaps] = useState({}); // classId -> { primary, secondary }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [adding, setAdding] = useState(''); // classId currently showing the add-picker

  const loadBase = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [cls, emps] = await Promise.all([
        examinationService.reportClasses(),
        employeeService.searchEmployees({}).catch(() => []),
      ]);
      const clist = cls.classes || [];
      setClasses(clist);
      setEmployees(emps || []);
      setGrade((prev) => prev || gradeOf((clist[0] || {}).className || ''));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load classes');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadBase(); }, [loadBase]);

  const grades = useMemo(() => {
    const seen = []; classes.forEach((c) => { const g = gradeOf(c.className); if (g && !seen.includes(g)) seen.push(g); });
    return seen;
  }, [classes]);
  const sections = useMemo(() => classes.filter((c) => gradeOf(c.className) === grade), [classes, grade]);

  const loadMaps = useCallback(async () => {
    if (!sections.length) { setMaps({}); return; }
    setBusy(true); setErr('');
    try {
      const results = await Promise.all(sections.map((s) => examinationService.reportClassTeachers(s.classId).then((m) => [s.classId, m]).catch(() => [s.classId, null])));
      setMaps(Object.fromEntries(results));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load class teachers');
    } finally { setBusy(false); }
  }, [sections]);
  useEffect(() => { loadMaps(); }, [loadMaps]);

  const change = async (classId, teacherId, allSubjects, action) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const m = await examinationService.setReportClassTeacher(classId, teacherId, allSubjects, action);
      setMaps((prev) => ({ ...prev, [classId]: m }));
      setAdding('');
      setMsg(action === 'remove' ? 'Class teacher removed.' : 'Class teacher updated.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to update class teacher');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Class Teachers (Co-Scholastic)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The <b>primary</b> class teacher comes from the timetable. Add <b>secondary</b> class teachers who
        can also enter co-scholastic, attendance &amp; remark. Turn on <b>“acts as primary”</b> to also let
        them enter marks for every subject of the class.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <TextField select size="small" label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} sx={{ minWidth: 160, mb: 2 }}>
        {grades.map((g) => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
      </TextField>

      {busy && <CircularProgress size={20} sx={{ ml: 2 }} />}

      <Stack spacing={2}>
        {sections.map((sec) => {
          const m = maps[sec.classId];
          const isAdding = adding === sec.classId;
          const taken = new Set([...(m?.primary || []), ...(m?.secondary || [])].map((t) => t.id));
          return (
            <Card key={sec.classId} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{sec.className}</Typography>
                <Divider sx={{ mb: 1.5 }} />
                {!m ? <Typography variant="body2" color="text.secondary">No report scheme for this class.</Typography> : (
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Primary (from timetable)</Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {(m.primary || []).length ? m.primary.map((t) => (
                          <Chip key={t.id} size="small" variant="outlined" label={t.name || t.id} />
                        )) : <Typography variant="caption" color="text.secondary"><em>— none set in timetable —</em></Typography>}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Secondary (added here)</Typography>
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {(m.secondary || []).map((t) => (
                          <Stack key={t.id} direction="row" spacing={1} alignItems="center">
                            <Chip size="small" color="primary" variant="outlined" label={t.name || t.id} sx={{ minWidth: 140, justifyContent: 'flex-start' }} />
                            <FormControlLabel
                              sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                              control={<Switch size="small" checked={!!t.allSubjects} disabled={busy}
                                onChange={(e) => change(sec.classId, t.id, e.target.checked, 'add')} />}
                              label="acts as primary (all subjects)"
                            />
                            <Tooltip title="Remove"><span><IconButton size="small" disabled={busy} onClick={() => change(sec.classId, t.id, false, 'remove')}><CloseIcon fontSize="small" /></IconButton></span></Tooltip>
                          </Stack>
                        ))}
                        {!(m.secondary || []).length && <Typography variant="caption" color="text.secondary"><em>— none —</em></Typography>}
                        {isAdding ? (
                          <Autocomplete
                            size="small" sx={{ minWidth: 240, mt: 0.5 }} openOnFocus autoHighlight
                            options={employees.filter((e) => !taken.has(e.uuid))}
                            getOptionLabel={(o) => o.name || ''}
                            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                            onChange={(_, v) => v && change(sec.classId, v.uuid, false, 'add')}
                            onBlur={() => setAdding('')}
                            renderInput={(p) => <TextField {...p} autoFocus label="Add class teacher" placeholder="Search…" />}
                          />
                        ) : (
                          <Box><Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setAdding(sec.classId)} disabled={busy}>Add class teacher</Button></Box>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!sections.length && <Alert severity="info">No sections for this grade.</Alert>}
      </Stack>
    </Box>
  );
}
