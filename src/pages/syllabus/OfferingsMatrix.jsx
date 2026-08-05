import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Autocomplete, ToggleButton,
  ToggleButtonGroup, Tooltip,
} from '@mui/material';
import { Add as AddIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { employeeService } from '../../services/employeeService';
import { useCan } from '../../permissions/can';

// Offerings matrix: for a grade + stream, one row per subject (plan), one column
// per base section, teacher chips in each cell. Sets up subjects and their
// section teachers on a single screen; the rightmost link opens the plan builder.
export default function OfferingsMatrix() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('syllabus.manage');

  const [years, setYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filter, setFilter] = useState({ academicYearId: '', grade: '', streamCode: '' });
  const [plans, setPlans] = useState([]);
  const [teachersByPlan, setTeachersByPlan] = useState({}); // syllabusId -> persisted assignments[]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialog, setDialog] = useState(null); // { subjectId, layout, streamCode }
  const [saving, setSaving] = useState(false);

  const hasStreams = streams.length > 0;
  const streamName = (code) => streams.find((s) => (s.code || '').toLowerCase() === (code || '').toLowerCase())?.name || code;

  useEffect(() => {
    (async () => {
      try {
        const [yrs, grds, strms, subs, lookups, emps] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          syllabusService.getGrades(),
          syllabusService.getStreams(),
          syllabusService.getSubjects(),
          syllabusService.getLookups(),
          employeeService.searchEmployees(),
        ]);
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        setGrades(grds || []);
        setStreams(strms || []);
        setSubjects(subs || []);
        setLayouts(lookups?.layouts || []);
        setEmployees(emps || []);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        setFilter((f) => ({ ...f, academicYearId: cur?.uuid || '', grade: (grds || [])[0]?.grade || '' }));
      } catch {
        setError('Failed to load offerings data');
      }
    })();
  }, []);

  const sections = useMemo(() => {
    const g = grades.find((x) => x.grade.toLowerCase() === (filter.grade || '').toLowerCase());
    return g?.sections || [];
  }, [grades, filter.grade]);

  const loadMatrix = async (f = filter) => {
    if (!f.academicYearId || !f.grade) { setPlans([]); setTeachersByPlan({}); return; }
    setLoading(true); setError('');
    try {
      const params = { academicYearId: f.academicYearId, grade: f.grade };
      if (f.streamCode) params.streamCode = f.streamCode;
      const pl = (await syllabusService.getSyllabi(params)) || [];
      setPlans(pl);
      const teacherPairs = await Promise.all(
        pl.map((p) => syllabusService.getPlanTeachers(p.uuid).then((t) => [p.uuid, t || []]).catch(() => [p.uuid, []])),
      );
      setTeachersByPlan(Object.fromEntries(teacherPairs));
    } catch {
      setError('Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadMatrix(); /* eslint-disable-next-line */ }, [filter.academicYearId, filter.grade, filter.streamCode]);

  const cellAssignments = (planId, classId) =>
    (teachersByPlan[planId] || []).filter((a) => a.classId === classId);

  const addTeacher = async (planId, classId, teacher) => {
    if (!teacher) return;
    setError('');
    try {
      const created = await syllabusService.assignTeacher(planId, { classId, teacherId: teacher.uuid });
      setTeachersByPlan((prev) => {
        const cur = prev[planId] || [];
        if (cur.some((a) => a.uuid === created.uuid)) return prev;
        return { ...prev, [planId]: [...cur, created] };
      });
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to assign teacher');
    }
  };

  const removeTeacher = async (planId, assignmentId) => {
    setError('');
    try {
      await syllabusService.unassignTeacher(assignmentId);
      setTeachersByPlan((prev) => ({ ...prev, [planId]: (prev[planId] || []).filter((a) => a.uuid !== assignmentId) }));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to unassign teacher');
    }
  };

  const openAdd = () => setDialog({
    subjectId: '',
    layout: 'senior',
    streamCode: filter.streamCode && filter.streamCode !== 'common' ? filter.streamCode : '',
  });

  const createOffering = async () => {
    if (!dialog.subjectId) { setError('Pick a subject'); return; }
    setSaving(true); setError('');
    try {
      await syllabusService.createSyllabus({
        academicYearId: filter.academicYearId,
        grade: filter.grade,
        streamCode: dialog.streamCode || undefined,
        subjectId: dialog.subjectId,
        layout: dialog.layout,
      });
      setDialog(null);
      loadMatrix();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add subject');
    } finally {
      setSaving(false);
    }
  };

  const showStreamCol = hasStreams && !filter.streamCode;
  const colCount = 2 + sections.length + (showStreamCol ? 1 : 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Offerings</Typography>
        {canManage && filter.grade && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add subject</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField fullWidth select size="small" label="Academic Year" value={filter.academicYearId}
                onChange={(e) => setFilter({ ...filter, academicYearId: e.target.value })}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Grade" value={filter.grade}
                onChange={(e) => setFilter({ ...filter, grade: e.target.value })}>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} md={5}>
                <ToggleButtonGroup size="small" exclusive value={filter.streamCode}
                  onChange={(_, v) => v !== null && setFilter({ ...filter, streamCode: v })}>
                  <ToggleButton value="">All</ToggleButton>
                  {streams.map((s) => <ToggleButton key={s.code} value={s.code}>{s.name}</ToggleButton>)}
                  <ToggleButton value="common">Common</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : !filter.grade ? (
            <Alert severity="info">Pick a grade to see its subjects and section teachers.</Alert>
          ) : sections.length === 0 ? (
            <Alert severity="warning">No base sections found for grade {filter.grade}.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 160, fontWeight: 600 }}>Subject</TableCell>
                    {showStreamCol && <TableCell sx={{ width: 120, fontWeight: 600 }}>Stream</TableCell>}
                    {sections.map((s) => (
                      <TableCell key={s.classId} sx={{ minWidth: 180, fontWeight: 600 }}>{s.className}</TableCell>
                    ))}
                    <TableCell sx={{ width: 120, fontWeight: 600 }} align="right">Plan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow><TableCell colSpan={colCount} align="center" sx={{ py: 3 }}>
                      No subjects yet for this grade{filter.streamCode ? ' & stream' : ''}. {canManage && 'Use “Add subject”.'}
                    </TableCell></TableRow>
                  ) : plans.map((p) => (
                    <TableRow key={p.uuid} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{p.subjectName || '-'}</TableCell>
                      {showStreamCol && (
                        <TableCell>
                          {p.streamCode
                            ? <Chip size="small" color="info" variant="outlined" label={streamName(p.streamCode)} />
                            : <Chip size="small" variant="outlined" label="Common" />}
                        </TableCell>
                      )}
                      {sections.map((s) => {
                        const rows = cellAssignments(p.uuid, s.classId);
                        const takenIds = new Set(rows.map((a) => a.teacherId));
                        const options = employees.filter((e) => !takenIds.has(e.uuid));
                        return (
                          <TableCell key={s.classId} sx={{ verticalAlign: 'top' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: rows.length ? 1 : 0 }}>
                              {rows.length === 0 && !canManage && (
                                <Typography variant="caption" color="text.secondary">—</Typography>
                              )}
                              {rows.map((a) => (
                                <Chip key={a.uuid} size="small" label={a.teacherName || a.teacherId}
                                  onDelete={canManage ? () => removeTeacher(p.uuid, a.uuid) : undefined} />
                              ))}
                            </Box>
                            {canManage && (
                              <Autocomplete
                                size="small"
                                options={options}
                                getOptionLabel={(o) => o.name || ''}
                                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                                value={null}
                                blurOnSelect
                                onChange={(_, v) => addTeacher(p.uuid, s.classId, v)}
                                renderInput={(params) => <TextField {...params} variant="standard" placeholder="+ teacher" />}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell align="right">
                        <Tooltip title="Open plan builder">
                          <Button size="small" endIcon={<OpenIcon fontSize="small" />}
                            onClick={() => navigate(`/syllabus/plans/${p.uuid}`)}>Plan</Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Add subject to {filter.grade}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={hasStreams ? 6 : 12}>
              <TextField fullWidth select size="small" label="Subject" value={dialog?.subjectId || ''}
                onChange={(e) => setDialog({ ...dialog, subjectId: e.target.value })}>
                {subjects.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select size="small" label="Stream" value={dialog?.streamCode || ''}
                  onChange={(e) => setDialog({ ...dialog, streamCode: e.target.value })}
                  helperText="Common = every stream">
                  <MenuItem value="">Common (all streams)</MenuItem>
                  {streams.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select size="small" label="Layout" value={dialog?.layout || 'senior'}
                onChange={(e) => setDialog({ ...dialog, layout: e.target.value })}>
                {(layouts.length ? layouts : [{ value: 'junior', label: 'Junior' }, { value: 'senior', label: 'Senior' }])
                  .map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={createOffering} disabled={saving || !dialog?.subjectId}>
            {saving ? 'Adding…' : 'Add subject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
