import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, IconButton, Button, Tabs, Tab, Alert, CircularProgress,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon, Print as PrintIcon, Today as TodayIcon,
} from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useCan } from '../../permissions/can';
import { activityCalendarService } from '../../services/activityCalendarService';
import { todayIso } from '../../utils/date';
import { monthLabel, typeMeta, typeAbbr } from './calendarUtils';
import MonthGrid from './MonthGrid';
import DayEditorDrawer from './DayEditorDrawer';
import ColumnsTab from './ColumnsTab';
import ImportTab from './ImportTab';
import MonthPrint from './MonthPrint';

const pad = (n) => String(n).padStart(2, '0');
const LEGEND = [
  ['festival', 'Festival'], ['important_day', 'Important day'], ['celebration_type', 'Celebration'],
  ['remembrance', 'Remembrance'], ['academics', 'Academic'],
];

export default function AcademicCalendarPage() {
  const { academicYearId } = useAcademicYear();
  const canManage = useCan()('academic-calendar.manage');
  const today = todayIso();

  const [tab, setTab] = useState('month');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [types, setTypes] = useState([]);
  const [daysByDate, setDaysByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true); setErr('');
    try {
      const res = await activityCalendarService.getCalendar({ month: `${year}-${pad(month)}`, academicYearId });
      setTypes(res.types || []);
      const map = {};
      for (const d of res.days || []) map[d.date] = d;
      setDaysByDate(map);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the calendar');
    } finally { setLoading(false); }
  }, [academicYearId, year, month]);

  useEffect(() => { load(); }, [load]);

  const step = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  };
  const goToday = () => { setYear(Number(today.slice(0, 4))); setMonth(Number(today.slice(5, 7))); };

  // Print: mount the print overlay, print, then unmount.
  useEffect(() => {
    if (!printing) return;
    const after = () => setPrinting(false);
    window.addEventListener('afterprint', after);
    const t = setTimeout(() => window.print(), 80);
    return () => { window.removeEventListener('afterprint', after); clearTimeout(t); };
  }, [printing]);

  const selectedDay = selectedDate ? (daysByDate[selectedDate] || { date: selectedDate, weekday: '', isWeeklyOff: false, holiday: null, entries: [] }) : null;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Academic Calendar</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Plan the year's festivals, important days, remembrances, thoughts and academic milestones — the daily thought feeds the morning assembly, and holidays flow into attendance.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="month" label="Month view" />
        <Tab value="import" label="Import from Excel" />
        <Tab value="types" label="Manage columns" />
      </Tabs>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {tab === 'month' && (
        <>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton size="small" onClick={() => step(-1)}><PrevIcon /></IconButton>
                  <Typography variant="h6" sx={{ minWidth: 170, textAlign: 'center' }}>{monthLabel(year, month)}</Typography>
                  <IconButton size="small" onClick={() => step(1)}><NextIcon /></IconButton>
                  <Button size="small" startIcon={<TodayIcon />} onClick={goToday}>Today</Button>
                </Stack>
                <Box sx={{ flex: 1 }} />
                <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setPrinting(true)}>Print month</Button>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                  {LEGEND.map(([code, label]) => (
                    <Stack key={code} direction="row" spacing={0.5} alignItems="center">
                      <Box component="span" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, px: 0.5, borderRadius: 0.5, color: typeMeta(code).color, bgcolor: typeMeta(code).bg }}>{typeAbbr(code)}</Box>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Stack>
                  ))}
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: 'error.main' }} />
                    <Typography variant="caption" color="text.secondary">Holiday</Typography>
                  </Stack>
                </Stack>
              </Stack>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
              ) : (
                <MonthGrid year={year} month={month} daysByDate={daysByDate} today={today} onSelect={setSelectedDate} />
              )}
            </CardContent>
          </Card>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
            Click any day to edit its line items, add entries under any column, or mark it a holiday. Sundays are the weekly off.
          </Typography>
        </>
      )}

      {tab === 'import' && <ImportTab academicYearId={academicYearId} canManage={canManage} onApplied={load} />}
      {tab === 'types' && <ColumnsTab types={types} canManage={canManage} onChanged={load} />}

      <DayEditorDrawer
        day={selectedDay}
        types={types}
        academicYearId={academicYearId}
        canManage={canManage}
        onClose={() => setSelectedDate(null)}
        onChanged={load}
      />

      {printing && <MonthPrint year={year} month={month} daysByDate={daysByDate} />}
    </Box>
  );
}
