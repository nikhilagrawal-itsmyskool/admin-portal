import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Stack, Chip, Divider,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon, CalendarMonth as CalIcon,
  ViewAgenda as DayIcon, Today as TodayIcon,
} from '@mui/icons-material';
import MonthGrid from './MonthGrid';
import { typeMeta, typeAbbr, monthLabel, WEEKDAY_LONG, parseISO, iso } from './calendarUtils';
import { fmtDateLong } from '../../utils/date';

const CHIP_ORDER = ['festival', 'important_day', 'celebration_type', 'remembrance', 'academics'];
const addDays = (s, n) => { const d = parseISO(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

// The PWA (read-only) calendar: a single-day view with prev/next-day and a toggle to a
// month picker. No editing, no print. `ensureMonth(dateStr)` asks the page to load that
// date's month into daysByDate.
export default function MobileCalendarView({ daysByDate, types, today, selectedDate, setSelectedDate, ensureMonth, year, month, stepMonth }) {
  const [mode, setMode] = useState('day');

  const goDay = (delta) => {
    const next = addDays(selectedDate, delta);
    setSelectedDate(next);
    ensureMonth(next);
  };
  const goToday = () => { setSelectedDate(today); ensureMonth(today); };
  const pick = (date) => { setSelectedDate(date); ensureMonth(date); setMode('day'); };

  const day = daysByDate[selectedDate];
  const themeEntry = (day?.entries || []).find((e) => e.typeCode === 'theme');
  const hol = day?.holiday;

  return (
    <Box>
      {/* Header: prev/next + date + toggle */}
      <Card sx={{ mb: 1.5 }}>
        <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
          {mode === 'day' ? (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton size="small" onClick={() => goDay(-1)}><PrevIcon /></IconButton>
              <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{WEEKDAY_LONG[day?.weekday] || parseISO(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}</Typography>
                <Typography variant="caption" color="text.secondary">{fmtDateLong(selectedDate)}</Typography>
              </Box>
              <IconButton size="small" onClick={() => goDay(1)}><NextIcon /></IconButton>
              <IconButton size="small" onClick={goToday} title="Today"><TodayIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="primary" onClick={() => setMode('month')} title="Month view"><CalIcon /></IconButton>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton size="small" onClick={() => stepMonth(-1)}><PrevIcon /></IconButton>
              <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{monthLabel(year, month)}</Typography>
              <IconButton size="small" onClick={() => stepMonth(1)}><NextIcon /></IconButton>
              <IconButton size="small" color="primary" onClick={() => setMode('day')} title="Day view"><DayIcon /></IconButton>
            </Stack>
          )}
        </CardContent>
      </Card>

      {mode === 'month' ? (
        <Card>
          <CardContent>
            <Box sx={{ height: 'calc(100vh - 260px)', minHeight: 340 }}>
              <MonthGrid year={year} month={month} daysByDate={daysByDate} today={today} onSelect={pick} />
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            {hol && (
              <Chip size="small" color={hol.kind === 'restricted' ? 'warning' : 'error'} sx={{ mb: 1 }}
                label={`${hol.kind === 'restricted' ? 'Restricted holiday' : 'Holiday'} · ${hol.name}`} />
            )}
            {day?.isWeeklyOff && !hol && <Chip size="small" color="default" sx={{ mb: 1 }} label="Weekly off" />}

            {themeEntry && (
              <Box sx={{ mb: 1.5, p: 1.25, bgcolor: '#eef4ff', border: '1px solid', borderColor: '#cfe0ff', borderRadius: 1 }}>
                <Typography variant="overline" color="primary.main" sx={{ display: 'block', lineHeight: 1.4 }}>Thought of the day</Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>“{themeEntry.value}”</Typography>
              </Box>
            )}

            {CHIP_ORDER.map((code) => {
              const items = (day?.entries || []).filter((e) => e.typeCode === code);
              if (!items.length) return null;
              const meta = typeMeta(code);
              const t = types.find((x) => x.code === code);
              return (
                <Box key={code} sx={{ mb: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                    <Box component="span" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, px: 0.5, borderRadius: 0.5, color: meta.color, bgcolor: meta.bg }}>{typeAbbr(code, t?.name)}</Box>
                    <Typography variant="overline" sx={{ color: meta.color, fontWeight: 700 }}>{t?.name || code}</Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    {items.map((e) => (
                      <Box key={e.uuid} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <Typography variant="body2">{e.value}</Typography>
                        {e.detail && <Typography variant="caption" color="text.secondary">{e.detail}</Typography>}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })}

            {!themeEntry && !(day?.entries || []).some((e) => CHIP_ORDER.includes(e.typeCode)) && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                {hol ? 'Holiday — nothing scheduled.' : day?.isWeeklyOff ? 'Weekly off — nothing scheduled.' : 'Nothing on this day.'}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
