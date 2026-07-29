import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, Alert, Stack,
  Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { employeeService } from '../../services/employeeService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { MetricScorePicker, DictionPicker, StarPresenterPicker } from './gradeFields';
import { useCan } from '../../permissions/can';
import ReferenceDocCard from './ReferenceDocCard';

const iso = (d) => d.toISOString().slice(0, 10);
const mondayOf = (d) => { const x = new Date(d); const dow = x.getUTCDay(); x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow)); return iso(x); };
const addDays = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const fmt = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const arrayFrom = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);

function EmployeePicker({ label, value, onChange }) {
  const [opts, setOpts] = useState([]); const [loading, setLoading] = useState(false);
  const search = async (q) => {
    if (!q || q.length < 2) { setOpts([]); return; }
    setLoading(true);
    try { const r = await employeeService.searchEmployees({ name: q }); setOpts(arrayFrom(r, 'employees', 'results').map((e) => ({ uuid: e.uuid, name: e.name }))); }
    catch { /* ignore */ } finally { setLoading(false); }
  };
  return (
    <Autocomplete size="small" options={opts} loading={loading} getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
      value={value || null} onInputChange={(_e, v, r) => { if (r === 'input') search(v); }} onChange={(_e, v) => onChange(v)}
      renderInput={(p) => <TextField {...p} label={label} />} />
  );
}

export default function GradingPage() {
  const can = useCan();
  const canManage = can('assembly.manage');

  const [rubric, setRubric] = useState({ metrics: [], penalties: [], config: {} });
  const [scaling, setScaling] = useState('');
  const [evaluators, setEvaluators] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [metricDlg, setMetricDlg] = useState(null);
  const [penaltyDlg, setPenaltyDlg] = useState(null);
  const [evalDlg, setEvalDlg] = useState(null);

  // Grade entry.
  const [years, setYears] = useState([]);
  const [plans, setPlans] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [planId, setPlanId] = useState('');
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [week, setWeek] = useState(null);
  const [grades, setGrades] = useState([]);
  const [gradeForm, setGradeForm] = useState(null); // { gradeDate, evaluatorId, metrics:{}, penalties:Set, ... }
  const [busy, setBusy] = useState('');

  const loadRubric = useCallback(async () => {
    try { const r = await assemblyService.getRubric(); setRubric(r); setScaling(r.config?.scalingAdjustment ?? ''); }
    catch { setError('Failed to load rubric'); }
  }, []);
  const loadEvaluators = useCallback(async () => {
    try { setEvaluators(await assemblyService.getEvaluators() || []); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadRubric(), loadEvaluators()]);
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        const list = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(list);
        const cur = list.find((y) => y.isCurrent) || list[0];
        if (cur?.uuid) setAcademicYearId(cur.uuid);
      } catch { /* years optional */ }
    })();
  }, [loadRubric, loadEvaluators]);

  useEffect(() => {
    if (!academicYearId) return;
    (async () => {
      const p = (await assemblyService.getPlans({ academicYearId })) || [];
      setPlans(p); setPlanId((cur) => (p.find((x) => x.uuid === cur) ? cur : (p[0]?.uuid || '')));
    })();
  }, [academicYearId]);

  const loadWeek = useCallback(async () => {
    setWeek(null); setGrades([]);
    if (!planId || !weekStart) return;
    try {
      const list = (await assemblyService.listWeeks(planId, { from: weekStart, to: weekStart })) || [];
      if (list.length === 0) return;
      const detail = await assemblyService.getWeek(list[0].uuid);
      setWeek(detail);
      setGrades(await assemblyService.getWeekGrades(detail.uuid) || []);
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load week'); }
  }, [planId, weekStart]);
  useEffect(() => { loadWeek(); }, [loadWeek]);

  // ── Rubric config ──────────────────────────────────────────────────────────
  const saveScaling = async () => {
    try { const r = await assemblyService.setRubricConfig({ scalingAdjustment: scaling === '' ? null : Number(scaling) }); setRubric(r); setMsg('Scaling saved'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed'); }
  };
  const saveMetric = async () => {
    try {
      const body = { name: metricDlg.name.trim(), maxMarks: Number(metricDlg.maxMarks) };
      if (metricDlg.uuid) await assemblyService.updateMetric(metricDlg.uuid, body); else await assemblyService.createMetric(body);
      setMetricDlg(null); await loadRubric();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save metric'); }
  };
  const savePenalty = async () => {
    try {
      const body = { name: penaltyDlg.name.trim(), value: Number(penaltyDlg.value) };
      if (penaltyDlg.uuid) await assemblyService.updatePenalty(penaltyDlg.uuid, body); else await assemblyService.createPenalty(body);
      setPenaltyDlg(null); await loadRubric();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save penalty'); }
  };
  const addEvaluator = async () => {
    try {
      if (!evalDlg.employee) { setError('Pick an employee'); return; }
      await assemblyService.addEvaluator({ employeeId: evalDlg.employee.uuid, startDate: evalDlg.startDate || undefined, endDate: evalDlg.endDate || undefined });
      setEvalDlg(null); await loadEvaluators();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to add evaluator'); }
  };

  // ── Grade entry ────────────────────────────────────────────────────────────
  const openGrade = (existing) => {
    if (existing) {
      setGradeForm({
        gradeDate: existing.gradeDate, evaluatorId: existing.evaluatorEmployeeId,
        metrics: Object.fromEntries((existing.metrics || []).map((m) => [m.metricId, Number(m.score)])),
        penalties: new Set(existing.penalties || []),
        starPresenter: existing.starPresenter || '', diction: existing.diction || '', feedback: existing.feedback || '',
      });
    } else {
      setGradeForm({ gradeDate: week.days?.[0]?.date || weekStart, evaluatorId: '', metrics: {}, penalties: new Set(), starPresenter: '', diction: '', feedback: '' });
    }
  };
  const saveGrade = async () => {
    setBusy('grade'); setError(''); setMsg('');
    try {
      const body = {
        gradeDate: gradeForm.gradeDate, evaluatorId: gradeForm.evaluatorId,
        metrics: rubric.metrics.filter((m) => gradeForm.metrics[m.uuid] !== undefined && gradeForm.metrics[m.uuid] !== '')
          .map((m) => ({ metricId: m.uuid, score: Number(gradeForm.metrics[m.uuid]) })),
        penalties: [...gradeForm.penalties],
        starPresenter: gradeForm.starPresenter || undefined, diction: gradeForm.diction || undefined, feedback: gradeForm.feedback || undefined,
      };
      await assemblyService.saveGrade(week.uuid, body);
      setGradeForm(null); await loadWeek(); setMsg('Grade saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save grade'); }
    finally { setBusy(''); }
  };
  const deleteGrade = async (id) => {
    try { await assemblyService.deleteGrade(id); await loadWeek(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete'); }
  };

  const evalName = (id) => evaluators.find((e) => e.employeeId === id)?.employeeName || id;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Assembly Grading</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <ReferenceDocCard
        kind="grading"
        title="Grading document"
        hint="The source grading document these metrics & penalties were built from. Kept for reference — download, edit and re-upload anytime."
        canManage={canManage}
      />

      <Grid container spacing={3}>
        {/* Rubric */}
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Metrics</Typography>
              {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setMetricDlg({ name: '', maxMarks: 5 })}>Add</Button>}
            </Stack>
            <Table size="small">
              <TableHead><TableRow><TableCell>Metric</TableCell><TableCell align="center">Max</TableCell>{canManage && <TableCell align="right" />}</TableRow></TableHead>
              <TableBody>
                {rubric.metrics.map((m) => (
                  <TableRow key={m.uuid}>
                    <TableCell>{m.name}</TableCell><TableCell align="center">{m.maxMarks}</TableCell>
                    {canManage && <TableCell align="right"><Button size="small" onClick={() => setMetricDlg({ ...m })}>Edit</Button><IconButton size="small" color="error" onClick={() => assemblyService.deleteMetric(m.uuid).then(loadRubric)}><DeleteIcon fontSize="small" /></IconButton></TableCell>}
                  </TableRow>
                ))}
                {rubric.metrics.length === 0 && <TableRow><TableCell colSpan={3}><Typography variant="body2" color="text.secondary">No metrics.</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Penalties</Typography>
              {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setPenaltyDlg({ name: '', value: 1 })}>Add</Button>}
            </Stack>
            <Table size="small">
              <TableHead><TableRow><TableCell>Penalty</TableCell><TableCell align="center">Deduct</TableCell>{canManage && <TableCell align="right" />}</TableRow></TableHead>
              <TableBody>
                {rubric.penalties.map((p) => (
                  <TableRow key={p.uuid}>
                    <TableCell>{p.name}</TableCell><TableCell align="center">{p.value}</TableCell>
                    {canManage && <TableCell align="right"><Button size="small" onClick={() => setPenaltyDlg({ ...p })}>Edit</Button><IconButton size="small" color="error" onClick={() => assemblyService.deletePenalty(p.uuid).then(loadRubric)}><DeleteIcon fontSize="small" /></IconButton></TableCell>}
                  </TableRow>
                ))}
                {rubric.penalties.length === 0 && <TableRow><TableCell colSpan={3}><Typography variant="body2" color="text.secondary">No penalties.</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" type="number" label="Scaling adjustment" value={scaling} onChange={(e) => setScaling(e.target.value)} disabled={!canManage} sx={{ width: 180 }} />
              {canManage && <Button size="small" onClick={saveScaling}>Save</Button>}
            </Stack>
          </CardContent></Card>
        </Grid>

        {/* Evaluators */}
        <Grid item xs={12}>
          <Card><CardContent>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Evaluators</Typography>
              {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setEvalDlg({ employee: null, startDate: '', endDate: '' })}>Assign</Button>}
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {evaluators.map((e) => (
                <Chip key={e.uuid} label={`${e.employeeName || e.employeeId}${e.startDate || e.endDate ? ` (${e.startDate || '…'}→${e.endDate || '…'})` : ''}`}
                  onDelete={canManage ? () => assemblyService.removeEvaluator(e.uuid).then(loadEvaluators) : undefined} />
              ))}
              {evaluators.length === 0 && <Typography variant="body2" color="text.secondary">No evaluators assigned.</Typography>}
            </Stack>
          </CardContent></Card>
        </Grid>

        {/* Grade entry */}
        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Grade a week</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}><TextField fullWidth select size="small" label="Academic Year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>{years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} sm={3}><TextField fullWidth select size="small" label="Wing (plan)" value={planId} onChange={(e) => setPlanId(e.target.value)}>{plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>)}{plans.length === 0 && <MenuItem value="" disabled>No plans</MenuItem>}</TextField></Grid>
              <Grid item xs={12} sm={6}><Stack direction="row" spacing={1} alignItems="center"><Button size="small" onClick={() => setWeekStart(addDays(weekStart, -7))}>◀</Button><TextField size="small" type="date" label="Week of (Mon)" value={weekStart} onChange={(e) => setWeekStart(mondayOf(e.target.value))} InputLabelProps={{ shrink: true }} /><Button size="small" onClick={() => setWeekStart(addDays(weekStart, 7))}>▶</Button></Stack></Grid>
            </Grid>

            {!week && <Typography variant="body2" color="text.secondary">No roster week here — start it in Roster first.</Typography>}
            {week && (
              <>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                  {week.houseName ? <Chip label={`House on duty: ${week.houseName}`} /> : <Chip variant="outlined" label="No house on duty" />}
                  {canManage && <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openGrade(null)} disabled={rubric.metrics.length === 0 || evaluators.length === 0}>Add grade</Button>}
                </Stack>
                {rubric.metrics.length === 0 && <Alert severity="info" sx={{ mb: 1 }}>Add rubric metrics first.</Alert>}
                {evaluators.length === 0 && <Alert severity="info" sx={{ mb: 1 }}>Assign an evaluator first.</Alert>}
                <Table size="small">
                  <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Evaluator</TableCell><TableCell align="center">Total</TableCell><TableCell align="right" /></TableRow></TableHead>
                  <TableBody>
                    {grades.map((g) => (
                      <TableRow key={g.uuid} hover sx={{ cursor: canManage ? 'pointer' : 'default' }} onClick={() => canManage && openGrade(g)}>
                        <TableCell>{fmt(g.gradeDate)}</TableCell>
                        <TableCell>{evalName(g.evaluatorEmployeeId)}</TableCell>
                        <TableCell align="center"><Chip size="small" color="primary" label={g.total} /></TableCell>
                        <TableCell align="right">{canManage && <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteGrade(g.uuid); }}><DeleteIcon fontSize="small" /></IconButton>}</TableCell>
                      </TableRow>
                    ))}
                    {grades.length === 0 && <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No grades yet.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Metric dialog */}
      <Dialog open={Boolean(metricDlg)} onClose={() => setMetricDlg(null)} fullWidth maxWidth="xs">
        <DialogTitle>{metricDlg?.uuid ? 'Edit metric' : 'Add metric'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <TextField size="small" label="Name" value={metricDlg?.name || ''} onChange={(e) => setMetricDlg({ ...metricDlg, name: e.target.value })} autoFocus />
          <TextField size="small" type="number" label="Max marks" value={metricDlg?.maxMarks ?? ''} onChange={(e) => setMetricDlg({ ...metricDlg, maxMarks: e.target.value })} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setMetricDlg(null)}>Cancel</Button><Button variant="contained" onClick={saveMetric}>Save</Button></DialogActions>
      </Dialog>

      {/* Penalty dialog */}
      <Dialog open={Boolean(penaltyDlg)} onClose={() => setPenaltyDlg(null)} fullWidth maxWidth="xs">
        <DialogTitle>{penaltyDlg?.uuid ? 'Edit penalty' : 'Add penalty'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <TextField size="small" label="Name" value={penaltyDlg?.name || ''} onChange={(e) => setPenaltyDlg({ ...penaltyDlg, name: e.target.value })} autoFocus />
          <TextField size="small" type="number" label="Deduction" value={penaltyDlg?.value ?? ''} onChange={(e) => setPenaltyDlg({ ...penaltyDlg, value: e.target.value })} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setPenaltyDlg(null)}>Cancel</Button><Button variant="contained" onClick={savePenalty}>Save</Button></DialogActions>
      </Dialog>

      {/* Evaluator dialog */}
      <Dialog open={Boolean(evalDlg)} onClose={() => setEvalDlg(null)} fullWidth maxWidth="xs">
        <DialogTitle>Assign evaluator</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <EmployeePicker label="Employee" value={evalDlg?.employee} onChange={(v) => setEvalDlg({ ...evalDlg, employee: v })} />
          <TextField size="small" type="date" label="From (optional)" InputLabelProps={{ shrink: true }} value={evalDlg?.startDate || ''} onChange={(e) => setEvalDlg({ ...evalDlg, startDate: e.target.value })} />
          <TextField size="small" type="date" label="To (optional)" InputLabelProps={{ shrink: true }} value={evalDlg?.endDate || ''} onChange={(e) => setEvalDlg({ ...evalDlg, endDate: e.target.value })} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setEvalDlg(null)}>Cancel</Button><Button variant="contained" onClick={addEvaluator}>Assign</Button></DialogActions>
      </Dialog>

      {/* Grade dialog */}
      <Dialog open={Boolean(gradeForm)} onClose={() => setGradeForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>Grade entry</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField size="small" select fullWidth label="Date" value={gradeForm?.gradeDate || ''} onChange={(e) => setGradeForm({ ...gradeForm, gradeDate: e.target.value })}>
                {(week?.days || []).map((d) => <MenuItem key={d.date} value={d.date}>{fmt(d.date)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField size="small" select fullWidth label="Evaluator" value={gradeForm?.evaluatorId || ''} onChange={(e) => setGradeForm({ ...gradeForm, evaluatorId: e.target.value })}>
                {evaluators.map((ev) => <MenuItem key={ev.uuid} value={ev.employeeId}>{ev.employeeName || ev.employeeId}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Scores</Typography></Divider>
          <MetricScorePicker metrics={rubric.metrics} values={gradeForm?.metrics || {}}
            onScore={(id, v) => setGradeForm((f) => { const m2 = { ...f.metrics }; if (v === undefined) delete m2[id]; else m2[id] = v; return { ...f, metrics: m2 }; })} />

          {rubric.penalties.length > 0 && <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Penalties</Typography></Divider>}
          {rubric.penalties.map((p) => (
            <FormControlLabel key={p.uuid} control={<Checkbox size="small" checked={gradeForm?.penalties?.has(p.uuid) || false}
              onChange={(e) => setGradeForm((f) => { const s = new Set(f.penalties); if (e.target.checked) s.add(p.uuid); else s.delete(p.uuid); return { ...f, penalties: s }; })} />}
              label={`${p.name} (−${p.value})`} />
          ))}
          <StarPresenterPicker value={gradeForm?.starPresenter || ''} academicYearId={week?.academicYearId}
            onChange={(v) => setGradeForm((f) => ({ ...f, starPresenter: v }))} />
          <DictionPicker value={gradeForm?.diction || ''} onChange={(v) => setGradeForm({ ...gradeForm, diction: v })} />
          <TextField size="small" label="Feedback" multiline minRows={2} value={gradeForm?.feedback || ''} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setGradeForm(null)}>Cancel</Button><Button variant="contained" startIcon={<SaveIcon />} onClick={saveGrade} disabled={busy === 'grade'}>Save grade</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
