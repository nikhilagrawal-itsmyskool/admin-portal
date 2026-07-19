import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Stack, IconButton,
  Alert, CircularProgress, Button, Divider,
} from '@mui/material';
import { ChevronLeft as PrevIcon, ChevronRight as NextIcon, Today as TodayIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { academicCalendarService } from '../../services/academicCalendarService';
import ResolvedRunSheet from './ResolvedRunSheet';
import { todayISO, mondayOf, weekDates, weekdayOf, fmtDay, fmtRange } from './scheduleUtils';

export default function ScheduleWeek() {
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [refDate, setRefDate] = useState(todayISO());
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noteOpen, setNoteOpen] = useState(true);

  const monday = mondayOf(refDate);
  const dates = weekDates(monday, 6); // Mon..Sat
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
    if (!planId) return;
    setLoading(true); setError('');
    try {
      const resolved = await Promise.all(dates.map((d) => assemblyService.resolve(planId, d)));
      const map = {};
      dates.forEach((d, i) => { map[d] = resolved[i]; });
      setResults(map);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to resolve the week');
    } finally { setLoading(false); }
  }, [planId, monday]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Assembly — This Week</Typography>

      {noteOpen && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNoteOpen(false)}>
          Holidays aren't reflected yet — assembly is shown for every working weekday the plan runs.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <TextField select size="small" label="Wing" sx={{ minWidth: 220 }} value={planId}
              onChange={(e) => setPlanId(e.target.value)} disabled={!plans.length}>
              {plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}{p.scopeLabel ? ` (${p.scopeLabel})` : ''}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={() => setRefDate(addWeek(monday, -1))}><PrevIcon /></IconButton>
              <Typography variant="subtitle1" sx={{ minWidth: 150, textAlign: 'center' }}>{fmtRange(dates[0], dates[5])}</Typography>
              <IconButton size="small" onClick={() => setRefDate(addWeek(monday, 1))}><NextIcon /></IconButton>
              <Button size="small" startIcon={<TodayIcon />} onClick={() => setRefDate(today)}>This week</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {!plans.length ? (
        <Alert severity="info">No assembly plans for the current year yet. Create one under Assembly → Plans.</Alert>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
          {dates.map((d) => {
            const isToday = d === today;
            return (
              <Card key={d} variant="outlined" sx={{ minWidth: 240, flex: '1 0 240px', borderColor: isToday ? 'primary.main' : 'divider', borderWidth: isToday ? 2 : 1 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2" color={isToday ? 'primary' : 'text.primary'}>{fmtDay(d)}</Typography>
                    {isToday && <Typography variant="caption" color="primary">Today</Typography>}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{weekdayOf(d)}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <ResolvedRunSheet resolved={results[d]} />
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

const addWeek = (mondayIso, n) => {
  const d = new Date(`${mondayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
};
