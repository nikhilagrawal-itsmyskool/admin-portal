import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Stack, IconButton,
  Alert, CircularProgress, Button, Divider,
} from '@mui/material';
import { ChevronLeft as PrevIcon, ChevronRight as NextIcon, Today as TodayIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { academicCalendarService } from '../../services/academicCalendarService';
import ResolvedRunSheet from './ResolvedRunSheet';
import { todayISO, addDays, fmtDay, weekdayOf } from './scheduleUtils';

// Single-day, navigable assembly view — the mobile/PWA surface (and mirrored in
// the student-app). Wing + a date with prev/next day and a date picker.
export default function ScheduleDay() {
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [resolved, setResolved] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noteOpen, setNoteOpen] = useState(true);
  const today = todayISO();

  useEffect(() => {
    (async () => {
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        const list = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        const cur = list.find((y) => y.isCurrent) || list[0];
        if (!cur) return;
        const pl = (await assemblyService.getPlans({ academicYearId: cur.uuid })) || [];
        setPlans(pl);
        if (pl.length) setPlanId(pl[0].uuid);
      } catch { setError('Failed to load plans'); }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!planId || !date) return;
    setLoading(true); setError('');
    try { setResolved(await assemblyService.resolve(planId, date)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to load assembly'); }
    finally { setLoading(false); }
  }, [planId, date]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Assembly</Typography>

      {noteOpen && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNoteOpen(false)}>
          Holidays aren't reflected yet — a working weekday still shows its regular assembly.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Stack spacing={2}>
            {plans.length > 1 && (
              <TextField select size="small" label="Wing" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}{p.scopeLabel ? ` (${p.scopeLabel})` : ''}</MenuItem>)}
              </TextField>
            )}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <IconButton onClick={() => setDate(addDays(date, -1))}><PrevIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{fmtDay(date)}</Typography>
                {date === today && <Typography variant="caption" color="primary">Today</Typography>}
              </Box>
              <IconButton onClick={() => setDate(addDays(date, 1))}><NextIcon /></IconButton>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField type="date" size="small" label="Pick a date" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }}
                value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
              <Button size="small" startIcon={<TodayIcon />} onClick={() => setDate(today)} disabled={date === today}>Today</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {!plans.length ? (
        <Alert severity="info">No assembly plan is set up for the current year yet.</Alert>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'capitalize', mb: 1 }}>{weekdayOf(date)}</Typography>
            <Divider sx={{ mb: 1.5 }} />
            {loading
              ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={28} /></Box>
              : <ResolvedRunSheet resolved={resolved} />}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
