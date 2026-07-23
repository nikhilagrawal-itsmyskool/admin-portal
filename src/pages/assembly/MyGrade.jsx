import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Alert, Stack, Chip, TextField, MenuItem,
  Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { useCan } from '../../permissions/can';
import GradingPage from './GradingPage';
import { MetricScorePicker, DictionPicker } from './gradeFields';
import { resolveMyGradingWeek, todayIso } from './myAssembly';

const addDays = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const fmt = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

// Admin/god → the full grading page (rubric + evaluators + evaluator dropdown +
// any wing/week/date); evaluator → today's self-grade (no dropdown, no future).
export default function MyGrade() {
  const can = useCan();
  return can('assembly.manage') ? <GradingPage /> : <EvaluatorGrade />;
}

// Neutral evaluator: tap "Grade" → straight into TODAY's grade entry. Evaluator =
// me (no dropdown); date defaults to today, can move to earlier days, never future.
function EvaluatorGrade() {
  const [reason, setReason] = useState('');
  const [weekId, setWeekId] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [rubric, setRubric] = useState({ metrics: [], penalties: [] });
  const [date, setDate] = useState('');
  const [form, setForm] = useState({ metrics: {}, penalties: new Set(), starPresenter: '', diction: '', feedback: '' });
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
      const today = todayIso();
      const days = Array.from({ length: 6 }, (_, i) => addDays(r.weekStart, i)).filter((d) => d <= today);
      setDate(days[days.length - 1] || r.weekStart);
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load grading'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const gradeableDays = weekStart
    ? Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)).filter((d) => d <= todayIso())
    : [];

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
      setForm({ metrics: {}, penalties: new Set(), starPresenter: '', diction: '', feedback: '' });
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
              <TextField size="small" select label="Day" value={date} onChange={(e) => setDate(e.target.value)} sx={{ maxWidth: 220 }}>
                {gradeableDays.map((d) => <MenuItem key={d} value={d}>{fmt(d)}{d === todayIso() ? ' (today)' : ''}</MenuItem>)}
              </TextField>
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

              <TextField size="small" label="Star presenter (name, class & segment)" value={form.starPresenter} onChange={(e) => setForm({ ...form, starPresenter: e.target.value })} />
              <DictionPicker value={form.diction} onChange={(v) => setForm({ ...form, diction: v })} />
              <TextField size="small" label="Feedback" multiline minRows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />

              <Box>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy === 'save' || rubric.metrics.length === 0}>Save grade</Button>
                <Chip size="small" sx={{ ml: 2 }} variant="outlined" label="You can keep updating until Sunday" />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
