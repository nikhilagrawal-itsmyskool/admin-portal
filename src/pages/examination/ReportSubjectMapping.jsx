import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, Divider, Autocomplete, Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { employeeService } from '../../services/employeeService';

const gradeOf = (name) => (name && name.indexOf('-') !== -1 ? name.slice(0, name.indexOf('-')) : name || '').trim();

// Exam-incharge: per-grade view of who enters each subject's marks, per section. The effective
// teacher is the syllabus offering unless the incharge overrides it (one teacher per section+subject).
export default function ReportSubjectMapping() {
  const [classes, setClasses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grade, setGrade] = useState('');
  const [maps, setMaps] = useState({}); // classId -> mapping response
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(''); // "classId|subjectCode"

  const loadBase = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [cls, emps] = await Promise.all([
        examinationService.myReportClasses(),
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
      const results = await Promise.all(sections.map((s) => examinationService.reportMapping(s.classId).then((m) => [s.classId, m]).catch(() => [s.classId, null])));
      setMaps(Object.fromEntries(results));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the mapping');
    } finally { setBusy(false); }
  }, [sections]);
  useEffect(() => { loadMaps(); }, [loadMaps]);

  const assign = async (classId, subjectCode, teacherId) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const m = await examinationService.assignReportTeacher(classId, subjectCode, teacherId || '');
      setMaps((prev) => ({ ...prev, [classId]: m }));
      setEditing('');
      setMsg(teacherId ? 'Teacher assigned.' : 'Reverted to the syllabus teacher.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to assign teacher');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Subject Mapping</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Who enters each subject's marks, per section. By default it follows the syllabus; assign a
        teacher here to override (one teacher per section &amp; subject). The label shown is what prints on the card.
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
          return (
            <Card key={sec.classId} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{sec.className}</Typography>
                <Divider sx={{ mb: 1 }} />
                {!m ? <Typography variant="body2" color="text.secondary">No report scheme for this class.</Typography> : (
                  <Stack divider={<Divider flexItem />} spacing={1}>
                    {m.subjects.map((s) => {
                      const key = `${sec.classId}|${s.subjectCode}`;
                      const isEditing = editing === key;
                      return (
                        <Stack key={s.subjectCode} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 0.5 }}>
                          <Box sx={{ flex: 1, minWidth: 160 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.reportLabel}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {s.syllabusSubjects ? `syllabus: ${s.syllabusSubjects}` : 'no syllabus link'}
                            </Typography>
                          </Box>
                          {isEditing ? (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                              <Autocomplete
                                fullWidth size="small" options={employees} autoHighlight openOnFocus
                                getOptionLabel={(o) => o.name || ''}
                                defaultValue={employees.find((e) => e.uuid === s.assignedTeacherId) || null}
                                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                                onChange={(_, v) => assign(sec.classId, s.subjectCode, v ? v.uuid : '')}
                                renderInput={(p) => <TextField {...p} label="Assign teacher" placeholder="Search…" />}
                              />
                              <Tooltip title="Cancel"><Button size="small" onClick={() => setEditing('')}><CloseIcon fontSize="small" /></Button></Tooltip>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, justifyContent: { sm: 'flex-end' } }}>
                              <Typography variant="body2">{s.effectiveTeacher || <em>— unassigned —</em>}</Typography>
                              <Chip size="small" variant="outlined"
                                color={s.source === 'assigned' ? 'primary' : s.source === 'syllabus' ? 'default' : 'warning'}
                                label={s.source === 'assigned' ? 'assigned' : s.source === 'syllabus' ? 'from syllabus' : 'none'} />
                              <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => setEditing(key)} disabled={busy}>Change</Button>
                              {s.source === 'assigned' && (
                                <Tooltip title="Revert to syllabus"><Button size="small" color="inherit" onClick={() => assign(sec.classId, s.subjectCode, '')} disabled={busy}>↺</Button></Tooltip>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      );
                    })}
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
