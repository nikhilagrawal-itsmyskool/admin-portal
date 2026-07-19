import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, LinearProgress, Tooltip,
} from '@mui/material';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

export default function SyllabusProgress() {
  const can = useCan();
  const canMark = can('syllabus.progress.mark');

  const [years, setYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [monthLabel, setMonthLabel] = useState({});

  const [sel, setSel] = useState({ academicYearId: '', grade: '', subjectId: '', classId: '' });
  const [plan, setPlan] = useState(null);
  const [roster, setRoster] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState('');
  const [savingIds, setSavingIds] = useState({}); // entryId -> true while toggling

  useEffect(() => {
    (async () => {
      try {
        const [yrs, grds, subs, lookups] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          syllabusService.getGrades(),
          syllabusService.getSubjects(),
          syllabusService.getLookups(),
        ]);
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        setGrades(grds || []);
        setSubjects(subs || []);
        const ml = {}; (lookups?.months || []).forEach((m) => { ml[m.value] = m.label; });
        setMonthLabel(ml);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        if (cur?.uuid) setSel((s) => ({ ...s, academicYearId: cur.uuid }));
      } catch {
        setError('Failed to load filters');
      }
    })();
  }, []);

  const sections = useMemo(
    () => grades.find((g) => g.grade === sel.grade)?.sections || [],
    [grades, sel.grade],
  );

  // Resolve the plan whenever year + grade + subject are all chosen.
  useEffect(() => {
    if (!sel.academicYearId || !sel.grade || !sel.subjectId) { setPlan(null); setRoster(null); return; }
    (async () => {
      setLoadingPlan(true); setError(''); setRoster(null);
      try {
        const matches = await syllabusService.getSyllabi({
          academicYearId: sel.academicYearId, grade: sel.grade, subjectId: sel.subjectId,
        });
        setPlan((matches && matches[0]) || null);
      } catch {
        setError('Failed to find the plan');
      } finally {
        setLoadingPlan(false);
      }
    })();
  }, [sel.academicYearId, sel.grade, sel.subjectId]);

  // Load the roster whenever the plan and a section are both selected.
  useEffect(() => {
    if (!plan || !sel.classId) { setRoster(null); return; }
    (async () => {
      setLoadingRoster(true); setError('');
      try {
        setRoster(await syllabusService.getProgressRoster(plan.uuid, sel.classId));
      } catch {
        setError('Failed to load coverage');
      } finally {
        setLoadingRoster(false);
      }
    })();
  }, [plan, sel.classId]);

  const toggle = async (entry) => {
    if (!canMark || !roster) return;
    const nextCovered = !entry.covered;
    setSavingIds((s) => ({ ...s, [entry.uuid]: true }));
    // Optimistic update of the row + counts.
    setRoster((r) => {
      const entries = r.entries.map((e) => (e.uuid === entry.uuid ? { ...e, covered: nextCovered } : e));
      const covered = entries.filter((e) => e.entryType === 'topic' && e.covered).length;
      const total = r.counts.total;
      return { ...r, entries, counts: { total, covered, pending: total - covered } };
    });
    try {
      await syllabusService.markProgress({
        entryId: entry.uuid, classId: sel.classId, status: nextCovered ? 'covered' : 'pending',
      });
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update coverage');
      // Revert on failure.
      setRoster((r) => {
        const entries = r.entries.map((e) => (e.uuid === entry.uuid ? { ...e, covered: !nextCovered } : e));
        const covered = entries.filter((e) => e.entryType === 'topic' && e.covered).length;
        const total = r.counts.total;
        return { ...r, entries, counts: { total, covered, pending: total - covered } };
      });
    } finally {
      setSavingIds((s) => { const n = { ...s }; delete n[entry.uuid]; return n; });
    }
  };

  const pct = roster && roster.counts.total > 0 ? Math.round((roster.counts.covered / roster.counts.total) * 100) : 0;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Syllabus Coverage</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={sel.academicYearId}
                onChange={(e) => setSel({ ...sel, academicYearId: e.target.value })}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth select size="small" label="Grade" value={sel.grade}
                onChange={(e) => setSel({ ...sel, grade: e.target.value, classId: '' })}>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth select size="small" label="Subject" value={sel.subjectId}
                onChange={(e) => setSel({ ...sel, subjectId: e.target.value })}>
                {subjects.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth select size="small" label="Section" value={sel.classId} disabled={!sel.grade}
                onChange={(e) => setSel({ ...sel, classId: e.target.value })}>
                {sections.map((s) => <MenuItem key={s.classId} value={s.classId}>{s.className}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loadingPlan && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
      {!loadingPlan && sel.grade && sel.subjectId && !plan && (
        <Alert severity="info">No syllabus plan exists for {sel.grade} / {subjects.find((s) => s.uuid === sel.subjectId)?.name} this year. Create one from Syllabus Plans first.</Alert>
      )}
      {plan && !sel.classId && <Alert severity="info">Select a section to mark coverage.</Alert>}

      {roster && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6">{roster.className}</Typography>
              <Chip size="small" color="success" label={`${roster.counts.covered} covered`} />
              <Chip size="small" variant="outlined" label={`${roster.counts.pending} pending`} />
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1 }} />
              </Box>
              <Typography variant="body2" color="text.secondary">{pct}% of {roster.counts.total} topics</Typography>
            </Box>

            {loadingRoster ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60 }} align="center">Done</TableCell>
                      <TableCell sx={{ width: 110 }}>Month</TableCell>
                      <TableCell sx={{ width: 60 }}>No.</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Theme</TableCell>
                      <TableCell sx={{ width: 120 }}>Covered on</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.entries.map((e) => {
                      const isTopic = e.entryType === 'topic';
                      return (
                        <TableRow key={e.uuid} hover sx={{ bgcolor: e.covered ? 'action.hover' : 'inherit' }}>
                          <TableCell align="center">
                            {isTopic ? (
                              <Tooltip title={canMark ? '' : 'You cannot mark coverage'}>
                                <span>
                                  <Checkbox size="small" checked={Boolean(e.covered)} disabled={!canMark || Boolean(savingIds[e.uuid])}
                                    onChange={() => toggle(e)} />
                                </span>
                              </Tooltip>
                            ) : (
                              <Chip size="small" variant="outlined" label={e.entryType} />
                            )}
                          </TableCell>
                          <TableCell>{monthLabel[e.month] || e.month}</TableCell>
                          <TableCell>{e.topicNo || '-'}</TableCell>
                          <TableCell sx={{ fontWeight: isTopic ? 400 : 600 }}>{e.title}</TableCell>
                          <TableCell>{e.theme || '-'}</TableCell>
                          <TableCell>{e.covered && e.coveredDate ? e.coveredDate : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
