import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Alert, Stack, Chip, TextField, MenuItem,
  Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { useCan } from '../../permissions/can';
import GradingPage from './GradingPage';
import { MetricScorePicker, DictionPicker, StarPresenterPicker } from './gradeFields';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { fmtDate } from '../../utils/date';
import { resolveMyGradingWeek, todayIso } from './myAssembly';

const addDays = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

const EMPTY_FORM = { metrics: {}, penalties: new Set(), starPresenter: '', diction: '', feedback: '' };
// Turn a saved GradeView back into the editable form shape.
const formFromGrade = (g) => ({
  metrics: Object.fromEntries((g.metrics || []).map((m) => [m.metricId, m.score])),
  penalties: new Set(g.penalties || []),
  starPresenter: g.starPresenter || '', diction: g.diction || '', feedback: g.feedback || '',
});

// Admin/god → the full grading page (rubric + evaluators + evaluator dropdown +
// any wing/week/date); evaluator → today's self-grade (no dropdown, no future).
export default function MyGrade() {
  const can = useCan();
  return can('assembly.manage') ? <GradingPage /> : <EvaluatorGrade />;
}

// Neutral evaluator: tap "Grade" → straight into TODAY's grade entry. Evaluator =
// me (no dropdown); date defaults to today, can move to earlier days, never future.
function EvaluatorGrade() {
  const { academicYearId } = useAcademicYear();
  const [reason, setReason] = useState('');
  const [weekId, setWeekId] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [rubric, setRubric] = useState({ metrics: [], penalties: [] });
  const [date, setDate] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [myGrades, setMyGrades] = useState({}); // gradeDate -> saved GradeView (own only)
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(''); setReason('');
    try {
      const r = await resolveMyGradingWeek();
      if (r.reason) { setReason(r.reason); return; }
      setWeekId(r.weekId); setWeekStart(r.weekStart);
      setRubric(await assemblyService.getRubric());
      const mine = await assemblyService.myGetWeekGrades(r.weekId);
      setMyGrades(Object.fromEntries((mine || []).map((g) => [g.gradeDate, g])));
      const today = todayIso();
      const days = Array.from({ length: 6 }, (_, i) => addDays(r.weekStart, i)).filter((d) => d <= today);
      setDate(days[days.length - 1] || r.weekStart);
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load grading'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Pre-fill the form from the marks already submitted for the selected day (own only);
  // blank it when nothing's been graded for that day yet.
  useEffect(() => {
    if (!date) return;
    const g = myGrades[date];
    setForm(g ? formFromGrade(g) : EMPTY_FORM);
  }, [date, myGrades]);

  const gradeableDays = weekStart
    ? Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)).filter((d) => d <= todayIso())
    : [];
  // At least one score must be entered — an empty grade is rejected by the backend.
  const hasAnyScore = rubric.metrics.some((m) => form.metrics[m.uuid] !== undefined && form.metrics[m.uuid] !== '');

  const save = async () => {
    setBusy('save'); setError(''); setMsg('');
    try {
      const body = {
        gradeDate: date,
        metrics: rubric.metrics.filter((m) => form.metrics[m.uuid] !== undefined && form.metrics[m.uuid] !== '')
          .map((m) => ({ metricId: m.uuid, score: Number(form.metrics[m.uuid]) })),
        penalties: [...form.penalties],
        starPresenter: form.starPresenter || undefined, diction: form.diction || undefined, feedback: form.feedback || undefined,
      };
      const g = await assemblyService.mySaveGrade(weekId, body);
      setMsg(`Saved — total ${g.total}`);
      // Keep the submitted marks on screen (re-fill happens via the [date, myGrades] effect).
      setMyGrades((prev) => ({ ...prev, [g.gradeDate]: g }));
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save grade'); }
    finally { setBusy(''); }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Grade the Assembly</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {!loading && reason && <Alert severity="info">{reason}</Alert>}

      {weekId && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField size="small" select label="Day" value={date} onChange={(e) => setDate(e.target.value)} sx={{ maxWidth: 220 }}>
                  {gradeableDays.map((d) => <MenuItem key={d} value={d}>{fmtDate(d)}{d === todayIso() ? ' (today)' : ''}{myGrades[d] ? ' • graded' : ''}</MenuItem>)}
                </TextField>
                {myGrades[date] && <Chip size="small" color="success" variant="outlined" label={`Last saved — total ${myGrades[date].total}`} />}
              </Stack>
              {rubric.metrics.length === 0 && <Alert severity="info">No rubric configured yet.</Alert>}

              <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Scores</Typography></Divider>
              <MetricScorePicker metrics={rubric.metrics} values={form.metrics}
                onScore={(id, v) => setForm((f) => { const m2 = { ...f.metrics }; if (v === undefined) delete m2[id]; else m2[id] = v; return { ...f, metrics: m2 }; })} />


              {rubric.penalties.length > 0 && <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Penalties</Typography></Divider>}
              {rubric.penalties.map((p) => (
                <FormControlLabel key={p.uuid} control={<Checkbox size="small" checked={form.penalties.has(p.uuid)}
                  onChange={(e) => setForm((f) => { const s = new Set(f.penalties); if (e.target.checked) s.add(p.uuid); else s.delete(p.uuid); return { ...f, penalties: s }; })} />}
                  label={`${p.name} (−${p.value})`} />
              ))}

              <StarPresenterPicker value={form.starPresenter} academicYearId={academicYearId}
                onChange={(v) => setForm((f) => ({ ...f, starPresenter: v }))} />
              <DictionPicker value={form.diction} onChange={(v) => setForm({ ...form, diction: v })} />
              <TextField size="small" label="Feedback" multiline minRows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />

              <Box>
                <Button fullWidth variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy === 'save' || rubric.metrics.length === 0 || !hasAnyScore}>{myGrades[date] ? 'Update grade' : 'Save grade'}</Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>{hasAnyScore ? 'You can keep updating your marks until Sunday.' : 'Enter at least one score to save.'}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
