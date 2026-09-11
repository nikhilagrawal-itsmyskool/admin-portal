import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Chip, CircularProgress, Alert,
} from '@mui/material';
import { activityCalendarService } from '../../services/activityCalendarService';
import { typeMeta, typeAbbr, parseISO, monthLabel } from './calendarUtils';

const CHIP_ORDER = ['festival', 'important_day', 'celebration_type', 'remembrance', 'academics'];

// Derive the AY's date range from its name ("2026-27" -> 2026-04-01..2027-03-31).
function ayRange(name) {
  const m = /^(\d{4})/.exec(name || '');
  if (!m) return null;
  const y = Number(m[1]);
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}

const dayNum = (s) => parseISO(s).getUTCDate();
const weekdayShort = (s) => parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
const monthKey = (s) => s.slice(0, 7);

// The whole-year agenda: a continuous, scrollable list of every day that has something
// (an entry or a declared holiday) — grouped under month headers, opened at today so the
// user scrolls up (past) / down (future). Reads the full AY in one range call. Clicking a
// day opens the editor (admins) via onSelectDate.
export default function AgendaView({ academicYearId, ayName, types, today, canManage, onSelectDate }) {
  const range = ayRange(ayName);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const anchorRef = useRef(null);
  const scrolledRef = useRef(false);

  const load = useCallback(async () => {
    if (!academicYearId || !range) return;
    setLoading(true); setErr(''); scrolledRef.current = false;
    try {
      const res = await activityCalendarService.getCalendar({ ...range, academicYearId });
      setDays(res.days || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the calendar');
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, ayName]);

  useEffect(() => { load(); }, [load]);

  // Non-empty days only (entries or a declared holiday), grouped by month in order.
  const months = useMemo(() => {
    const shown = (days || []).filter((d) => (d.entries && d.entries.length) || d.holiday);
    const groups = [];
    let cur = null;
    for (const d of shown) {
      const k = monthKey(d.date);
      if (!cur || cur.key !== k) {
        cur = { key: k, label: monthLabel(Number(k.slice(0, 4)), Number(k.slice(5, 7))), days: [] };
        groups.push(cur);
      }
      cur.days.push(d);
    }
    return groups;
  }, [days]);

  // Jump target: today if it's in the list, else the first shown day on/after today.
  const anchorDate = useMemo(() => {
    const shown = months.flatMap((g) => g.days).map((d) => d.date);
    if (!shown.length) return null;
    if (shown.includes(today)) return today;
    return shown.find((dt) => dt >= today) || shown[shown.length - 1];
  }, [months, today]);

  useEffect(() => {
    if (loading || scrolledRef.current || !anchorRef.current) return;
    scrolledRef.current = true;
    anchorRef.current.scrollIntoView({ block: 'center' });
  }, [loading, anchorDate, months]);

  if (!range) return <Alert severity="info">Select an academic year.</Alert>;
  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (err) return <Alert severity="error">{err}</Alert>;
  if (!months.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Nothing scheduled this year yet.</Typography>;

  return (
    <Box>
      {months.map((g) => (
        <Box key={g.key} sx={{ mb: 2 }}>
          <Typography variant="overline" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', letterSpacing: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', py: 0.5, zIndex: 1 }}>{g.label}</Typography>
          <Stack spacing={1}>
            {g.days.map((d) => {
              const isToday = d.date === today;
              const theme = (d.entries || []).find((e) => e.typeCode === 'theme');
              const hol = d.holiday;
              const hasTagged = (d.entries || []).some((e) => CHIP_ORDER.includes(e.typeCode));
              return (
                <Card key={d.date} ref={d.date === anchorDate ? anchorRef : undefined}
                  onClick={canManage ? () => onSelectDate(d.date) : undefined}
                  sx={{
                    cursor: canManage ? 'pointer' : 'default',
                    border: isToday ? '2px solid' : '1px solid', borderColor: isToday ? 'primary.main' : 'divider',
                    '&:hover': canManage ? { boxShadow: 2, borderColor: 'primary.light' } : {},
                  }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 }, display: 'flex', gap: 2 }}>
                    <Box sx={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1, color: isToday ? 'primary.main' : 'text.primary' }}>{dayNum(d.date)}</Typography>
                      <Typography variant="caption" color="text.secondary">{weekdayShort(d.date)}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {hol && (
                        <Chip size="small" variant="outlined" color={hol.kind === 'restricted' ? 'warning' : 'error'} sx={{ mb: 0.5 }}
                          label={`${hol.kind === 'restricted' ? 'Restricted holiday' : 'Holiday'} · ${hol.name}`} />
                      )}
                      {theme && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#41506b', mb: hasTagged ? 0.5 : 0 }}>“{theme.value}”</Typography>
                      )}
                      <Stack spacing={0.5}>
                        {CHIP_ORDER.map((code) => (d.entries || []).filter((e) => e.typeCode === code).map((e) => {
                          const m = typeMeta(code);
                          const t = types.find((x) => x.code === code);
                          return (
                            <Stack key={e.uuid} direction="row" spacing={0.75} alignItems="flex-start">
                              <Box component="span" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, px: 0.5, borderRadius: 0.5, color: m.color, bgcolor: m.bg, flexShrink: 0, mt: '3px' }}>{typeAbbr(code, t?.name)}</Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2">{e.value}</Typography>
                                {e.detail && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{e.detail}</Typography>}
                              </Box>
                            </Stack>
                          );
                        }))}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
