import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, Divider, Autocomplete,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { employeeService } from '../../services/employeeService';

const gradeOf = (name) => (name && name.indexOf('-') !== -1 ? name.slice(0, name.indexOf('-')) : name || '').trim();

// Admin/god: per-section view of who may enter each subject's marks. The syllabus teacher is pulled
// live (non-removable); you can ADD extra teachers so a colleague can enter on their behalf. The
// class teacher (primary + any secondary flagged "all subjects") covers every subject automatically.
export default function ReportSubjectMapping() {
  const [classes, setClasses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grade, setGrade] = useState('');
  const [maps, setMaps] = useState({}); // classId -> mapping response
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [adding, setAdding] = useState(''); // "classId|subjectCode" currently showing the add-picker

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
      const results = await Promise.all(sections.map((s) => examinationService.reportMapping(s.classId).then((m) => [s.classId, m]).catch(() => [s.classId, null])));
      setMaps(Object.fromEntries(results));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the mapping');
    } finally { setBusy(false); }
  }, [sections]);
  useEffect(() => { loadMaps(); }, [loadMaps]);

  const change = async (classId, subjectCode, teacherId, action) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const m = await examinationService.setReportTeacher(classId, subjectCode, teacherId, action);
      setMaps((prev) => ({ ...prev, [classId]: m }));
      setAdding('');
      setMsg(action === 'remove' ? 'Teacher removed.' : 'Teacher added.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to update the teacher');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Subject Mapping</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Who may enter each subject's marks, per section. The <b>syllabus</b> teacher is pulled live;
        <b> add</b> more teachers so a colleague can enter on their behalf. The class teacher covers every subject automatically.
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
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{sec.className}</Typography>
                {m && m.allSubjectsClassTeachers?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Class teacher (all subjects): {m.allSubjectsClassTeachers.map((t) => `${t.name}${t.role === 'secondary' ? ' (added)' : ''}`).join(', ')}
                  </Typography>
                )}
                <Divider sx={{ mb: 1, mt: 0.5 }} />
                {!m ? <Typography variant="body2" color="text.secondary">No report scheme for this class.</Typography> : (
                  <Stack divider={<Divider flexItem />} spacing={1}>
                    {m.subjects.map((s) => {
                      const key = `${sec.classId}|${s.subjectCode}`;
                      const isAdding = adding === key;
                      // Teachers already covering this subject (so they aren't offered again).
                      const taken = new Set([...(s.syllabusTeachers || []), ...(s.addedTeachers || [])].map((t) => t.id));
                      return (
                        <Stack key={s.subjectCode} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }} sx={{ py: 0.5 }}>
                          <Box sx={{ flex: 1, minWidth: 160 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Chip size="small" variant="outlined" label={s.subjectCode} sx={{ height: 20, fontSize: 11 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.reportLabel}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {s.syllabusSubjects ? `syllabus: ${s.syllabusSubjects}` : 'no syllabus link'}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 2 }}>
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                              {(s.syllabusTeachers || []).map((t) => (
                                <Chip key={`syl-${t.id}`} size="small" color="default" variant="outlined" label={t.name || t.id}
                                  title="From syllabus (live) — edit in the syllabus to change" />
                              ))}
                              {(s.addedTeachers || []).map((t) => (
                                <Chip key={`add-${t.id}`} size="small" color="primary" variant="outlined" label={t.name || t.id}
                                  onDelete={busy ? undefined : () => change(sec.classId, s.subjectCode, t.id, 'remove')} />
                              ))}
                              {!(s.syllabusTeachers || []).length && !(s.addedTeachers || []).length && (
                                <Typography variant="caption" color="text.secondary"><em>— none —</em></Typography>
                              )}
                              {isAdding ? (
                                <Autocomplete
                                  size="small" sx={{ minWidth: 220 }} openOnFocus autoHighlight
                                  options={employees.filter((e) => !taken.has(e.uuid))}
                                  getOptionLabel={(o) => o.name || ''}
                                  isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                                  onChange={(_, v) => v && change(sec.classId, s.subjectCode, v.uuid, 'add')}
                                  onBlur={() => setAdding('')}
                                  renderInput={(p) => <TextField {...p} autoFocus label="Add teacher" placeholder="Search…" />}
                                />
                              ) : (
                                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setAdding(key)} disabled={busy}>Add</Button>
                              )}
                            </Stack>
                          </Box>
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
