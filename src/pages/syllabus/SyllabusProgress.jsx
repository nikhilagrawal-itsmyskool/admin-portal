import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip,
  CircularProgress, LinearProgress,
} from '@mui/material';
import { syllabusService } from '../../services/syllabusService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useCan } from '../../permissions/can';
import CoverageTree from './CoverageTree';

const CAL_TO_MONTH = { 0: 'january', 1: 'february', 2: 'march', 3: 'april', 4: 'may', 5: 'june', 6: 'july', 7: 'august', 8: 'september', 9: 'october', 10: 'november', 11: 'december' };

export default function SyllabusProgress() {
  const can = useCan();
  const canMark = can('syllabus.progress.mark');
  const { academicYearId } = useAcademicYear();

  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [monthLabel, setMonthLabel] = useState({});

  const [sel, setSel] = useState({ grade: '', subjectId: '', classId: '' });
  const [plan, setPlan] = useState(null);
  const [roster, setRoster] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState('');
  const [savingIds, setSavingIds] = useState({}); // entryId -> true while toggling

  useEffect(() => {
    (async () => {
      try {
        const [grds, lookups] = await Promise.all([
          syllabusService.getGrades(),
          syllabusService.getLookups(),
        ]);
        setGrades(grds || []);
        const ml = {}; (lookups?.months || []).forEach((m) => { ml[m.value] = m.label; });
        setMonthLabel(ml);
      } catch {
        setError('Failed to load filters');
      }
    })();
  }, []);

  const sections = useMemo(
    () => grades.find((g) => g.grade === sel.grade)?.sections || [],
    [grades, sel.grade],
  );
  const currentMonth = CAL_TO_MONTH[new Date().getMonth()];

  // Subjects are grade-scoped — reload when the grade changes.
  useEffect(() => {
    (async () => {
      try { setSubjects((await syllabusService.getSubjects(sel.grade ? { grade: sel.grade } : {})) || []); } catch { /* noop */ }
    })();
  }, [sel.grade]);

  // Resolve the plan whenever year + grade + subject are all chosen.
  useEffect(() => {
    if (!academicYearId || !sel.grade || !sel.subjectId) { setPlan(null); setRoster(null); return; }
    (async () => {
      setLoadingPlan(true); setError(''); setRoster(null);
      try {
        const matches = await syllabusService.getSyllabi({
          academicYearId, grade: sel.grade, subjectId: sel.subjectId,
        });
        setPlan((matches && matches[0]) || null);
      } catch {
        setError('Failed to find the plan');
      } finally {
        setLoadingPlan(false);
      }
    })();
  }, [academicYearId, sel.grade, sel.subjectId]);

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
    // Optimistic: flip this leaf and adjust the leaf-based count by one.
    const adjust = (r, cov) => {
      const entries = r.entries.map((e) => (e.uuid === entry.uuid ? { ...e, covered: cov } : e));
      const covered = r.counts.covered + (cov ? 1 : -1);
      return { ...r, entries, counts: { total: r.counts.total, covered, pending: r.counts.total - covered } };
    };
    setRoster((r) => adjust(r, nextCovered));
    try {
      await syllabusService.markProgress({
        entryId: entry.uuid, classId: sel.classId, status: nextCovered ? 'covered' : 'pending',
      });
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update coverage');
      setRoster((r) => adjust(r, !nextCovered));
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
              <TextField fullWidth select size="small" label="Grade" value={sel.grade}
                onChange={(e) => setSel({ ...sel, grade: e.target.value, classId: '', subjectId: '' })}>
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
              <Typography variant="body2" color="text.secondary">{pct}% of {roster.counts.total} items</Typography>
            </Box>

            {loadingRoster ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <CoverageTree entries={roster.entries} monthLabel={monthLabel} canMark={canMark}
                savingIds={savingIds} onToggle={toggle} currentMonth={currentMonth} />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
