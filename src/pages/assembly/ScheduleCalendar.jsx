import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Stack, IconButton,
  Alert, Badge, Divider, Button,
} from '@mui/material';
import { ChevronLeft as PrevIcon, ChevronRight as NextIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { academicCalendarService } from '../../services/academicCalendarService';
import ResolvedRunSheet from './ResolvedRunSheet';
import { todayISO, monthGrid, monthLabel, fmtDay, WEEKDAY_HEADS } from './scheduleUtils';

const pad = (n) => String(n).padStart(2, '0');

export default function ScheduleCalendar() {
  const navigate = useNavigate();
  const t = todayISO();
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [year, setYear] = useState(Number(t.slice(0, 4)));
  const [month, setMonth] = useState(Number(t.slice(5, 7)));
  const [specials, setSpecials] = useState({}); // date -> { uuid, title, publishStatus }
  const [selectedDate, setSelectedDate] = useState(t);
  const [resolved, setResolved] = useState(null);
  const [error, setError] = useState('');
  const [noteOpen, setNoteOpen] = useState(true);

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

  // Load the month's specials (for badges).
  useEffect(() => {
    if (!planId) return;
    (async () => {
      try {
        const from = `${year}-${pad(month)}-01`;
        const to = `${year}-${pad(month)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
        const list = (await assemblyService.getSpecials(planId, { from, to })) || [];
        const map = {};
        list.forEach((s) => { map[s.specialDate] = s; });
        setSpecials(map);
      } catch { setSpecials({}); }
    })();
  }, [planId, year, month]);

  // Resolve the selected day.
  const resolveDay = useCallback(async () => {
    if (!planId || !selectedDate) return;
    setError('');
    try { setResolved(await assemblyService.resolve(planId, selectedDate)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to resolve'); }
  }, [planId, selectedDate]);
  useEffect(() => { resolveDay(); }, [resolveDay]);

  const step = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  };

  const weeks = monthGrid(year, month);
  const special = specials[selectedDate];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Assembly — Calendar</Typography>

      {noteOpen && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNoteOpen(false)}>
          Badged days have a special assembly. Holidays aren't marked yet — a working weekday still shows its regular assembly.
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
              <IconButton size="small" onClick={() => step(-1)}><PrevIcon /></IconButton>
              <Typography variant="subtitle1" sx={{ minWidth: 160, textAlign: 'center' }}>{monthLabel(year, month)}</Typography>
              <IconButton size="small" onClick={() => step(1)}><NextIcon /></IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {!plans.length ? (
        <Alert severity="info">No assembly plans for the current year yet.</Alert>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Card variant="outlined" sx={{ flex: '1 1 auto' }}>
            <CardContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {WEEKDAY_HEADS.map((h) => (
                  <Typography key={h} variant="caption" color="text.secondary" align="center" sx={{ fontWeight: 600, py: 0.5 }}>{h}</Typography>
                ))}
                {weeks.flat().map((cell) => {
                  const isToday = cell.date === t;
                  const isSel = cell.date === selectedDate;
                  const sp = specials[cell.date];
                  return (
                    <Box key={cell.date} onClick={() => setSelectedDate(cell.date)}
                      sx={{
                        cursor: 'pointer', textAlign: 'center', py: 1, borderRadius: 1, userSelect: 'none',
                        color: cell.inMonth ? 'text.primary' : 'text.disabled',
                        bgcolor: isSel ? 'primary.main' : 'transparent',
                        border: isToday && !isSel ? '1px solid' : '1px solid transparent',
                        borderColor: isToday && !isSel ? 'primary.main' : 'transparent',
                        '&:hover': { bgcolor: isSel ? 'primary.main' : 'action.hover' },
                      }}>
                      <Badge color="secondary" variant="dot" invisible={!sp}
                        sx={{ '& .MuiBadge-dot': { top: 2, right: -2 } }}>
                        <Typography variant="body2" sx={{ color: isSel ? 'primary.contrastText' : 'inherit', px: 0.5 }}>{cell.day}</Typography>
                      </Badge>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: '1 1 340px', minWidth: 280 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1">{fmtDay(selectedDate)}</Typography>
                {special && (
                  <Button size="small" endIcon={<OpenIcon fontSize="small" />} onClick={() => navigate(`/assembly/specials/${special.uuid}`)}>
                    Open special
                  </Button>
                )}
              </Stack>
              <Divider sx={{ my: 1 }} />
              <ResolvedRunSheet resolved={resolved} />
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
