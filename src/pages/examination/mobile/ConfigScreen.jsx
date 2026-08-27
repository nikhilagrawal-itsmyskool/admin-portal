import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, TextField, MenuItem, Autocomplete, Alert, CircularProgress, Switch, Paper,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { examinationService } from '../../../services/examinationService';
import { employeeService } from '../../../services/employeeService';
import { fmtDate } from '../../../utils/date';

const Field = ({ label, children, hint }) => (
  <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
    {children}
    {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{hint}</Typography>}
  </Paper>
);

// Phone config screen for one exam. Incharge / cards-per-page / dues cutoff / thresholds
// (god) / publish. Grade-set + exam creation stay on desktop.
export default function ConfigScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');

  const [exam, setExam] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setExam(await examinationService.get(id)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    employeeService.searchEmployees({}).then(setEmployees).catch(() => setEmployees([]));
    examinationService.feeCycles(id).then(setCycles).catch(() => setCycles([]));
  }, [id]);

  const patch = async (body) => {
    setErr('');
    try { setExam(await examinationService.update(id, body)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Update failed'); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!exam) return <Alert severity="error">{err || 'Exam not found'}</Alert>;

  const inchargeValue = employees.find((e) => e.uuid === exam.inchargeEmployeeId) || null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(`/examinations/${id}`)}>Back</Button>
      </Stack>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Config</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Stack spacing={1.25}>
        <Field label="Examination incharge">
          <Autocomplete
            size="small" options={employees} getOptionLabel={(o) => o.name || ''} value={inchargeValue}
            onChange={(_, v) => patch({ inchargeEmployeeId: v ? v.uuid : null })}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            renderInput={(p) => <TextField {...p} placeholder="Pick a teacher" variant="standard" />}
          />
        </Field>
        <Field label="Cards per A4 page">
          <TextField select size="small" fullWidth variant="standard" value={exam.cardsPerPage || 4} onChange={(e) => patch({ cardsPerPage: Number(e.target.value) })}>
            <MenuItem value={4}>4 per page</MenuItem>
            <MenuItem value={3}>3 per page</MenuItem>
          </TextField>
        </Field>
        <Field label="Dues cleared till" hint="Which cycle's dues must be clear to print">
          <TextField select size="small" fullWidth variant="standard" value={exam.duesCutoffDate || ''} onChange={(e) => patch({ duesCutoffDate: e.target.value || null })}>
            <MenuItem value=""><em>Due now (this month)</em></MenuItem>
            {cycles.filter((c) => c.dueDate).map((c) => <MenuItem key={c.uuid} value={c.dueDate}>{c.name} · due {fmtDate(c.dueDate)}</MenuItem>)}
          </TextField>
        </Field>
        <Stack direction="row" spacing={1.25}>
          <Field label="Current-yr ₹ (god)">
            <TextField key={`c${exam.duesThresholdCurrent ?? 0}`} size="small" fullWidth variant="standard" type="number" defaultValue={exam.duesThresholdCurrent ?? 0} disabled={!isGod}
              onBlur={isGod ? (e) => { const v = Number(e.target.value) || 0; if (v !== Number(exam.duesThresholdCurrent || 0)) patch({ duesThresholdCurrent: v }); } : undefined} />
          </Field>
          <Field label="Prior-yr ₹ (god)">
            <TextField key={`p${exam.duesThresholdPrior ?? 0}`} size="small" fullWidth variant="standard" type="number" defaultValue={exam.duesThresholdPrior ?? 0} disabled={!isGod}
              onBlur={isGod ? (e) => { const v = Number(e.target.value) || 0; if (v !== Number(exam.duesThresholdPrior || 0)) patch({ duesThresholdPrior: v }); } : undefined} />
          </Field>
        </Stack>
        <Field label="Status">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontWeight: 600, color: exam.status === 'published' ? 'success.main' : 'text.secondary' }}>
              {exam.status === 'published' ? 'Published' : 'Draft'}
            </Typography>
            <Switch checked={exam.status === 'published'} onChange={(e) => patch({ status: e.target.checked ? 'published' : 'draft' })} />
          </Stack>
        </Field>
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
          Which grades this exam covers, and creating exams, are set on the desktop.
        </Typography>
      </Stack>
    </Box>
  );
}
