import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Box, Stack, Typography, TextField, Button, IconButton, Alert, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, FormGroup, FormControlLabel, Checkbox,
  CircularProgress, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { activityCalendarService } from '../../services/activityCalendarService';
import { fmtDateDow } from '../../utils/date';

const WEEKDAYS = [
  { n: 0, label: 'Sunday' }, { n: 1, label: 'Monday' }, { n: 2, label: 'Tuesday' },
  { n: 3, label: 'Wednesday' }, { n: 4, label: 'Thursday' }, { n: 5, label: 'Friday' }, { n: 6, label: 'Saturday' },
];

// Derive the AY's date range from its name ("2026-27" -> 2026-04-01..2027-03-31).
function ayRange(name) {
  const m = /^(\d{4})/.exec(name || '');
  if (!m) return null;
  const y = Number(m[1]);
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}

// The Holidays tab: one full-year list over the SAME calendar_holiday data the month
// view edits (so both are always in sync — no separate store), plus the weekly-off
// choice (stored on the academic year). Both feed attendance & the 360 view.
export default function HolidaysTab({ canManage }) {
  const { academicYearId, years } = useAcademicYear();
  const ayName = years.find((y) => y.uuid === academicYearId)?.name || '';
  const range = ayRange(ayName);

  const [weeklyOff, setWeeklyOff] = useState([0]);
  const [holidays, setHolidays] = useState([]);
  const [nonTeaching, setNonTeaching] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ date: '', name: '', kind: 'full' });

  const load = useCallback(async () => {
    if (!academicYearId || !range) return;
    setLoading(true); setErr('');
    try {
      const [settings, hols, nt] = await Promise.all([
        activityCalendarService.getSettings({ academicYearId }),
        activityCalendarService.listHolidays({ ...range, academicYearId }),
        activityCalendarService.getNonTeaching({ ...range, academicYearId }),
      ]);
      setWeeklyOff(settings.weeklyOff || []);
      setHolidays(hols || []);
      setNonTeaching(nt || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load holidays');
    } finally { setLoading(false); }
  }, [academicYearId, ayName]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); await load(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const toggleWeekday = (n) => {
    const next = weeklyOff.includes(n) ? weeklyOff.filter((x) => x !== n) : [...weeklyOff, n].sort((a, b) => a - b);
    setWeeklyOff(next);
    run(() => activityCalendarService.setSettings({ academicYearId, weeklyOff: next }));
  };

  const addHoliday = () => run(async () => {
    await activityCalendarService.setHoliday({ holidayDate: form.date, name: form.name.trim() || 'Holiday', kind: form.kind, academicYearId });
    setForm({ date: '', name: '', kind: 'full' });
  });

  const fullHols = holidays.filter((h) => h.kind === 'full').length;
  const rhHols = holidays.filter((h) => h.kind === 'restricted').length;
  const weeklyOffCount = nonTeaching.filter((d) => d.kind === 'weekly_off').length;
  const totalNonTeaching = nonTeaching.length;

  if (!range) return <Alert severity="info">Select an academic year to manage holidays.</Alert>;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        This is the same holiday data as the month view — edit here or by clicking a day; both stay in sync. Full holidays and weekly-offs close the school and are excluded from attendance percentages.
      </Alert>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {/* Weekly-off */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>Weekly off</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Days of the week the school is closed every week. These count as holidays everywhere (calendar, attendance, student reports).
          </Typography>
          <FormGroup row>
            {WEEKDAYS.map((d) => (
              <FormControlLabel key={d.n}
                control={<Checkbox size="small" checked={weeklyOff.includes(d.n)} disabled={!canManage || busy} onChange={() => toggleWeekday(d.n)} />}
                label={d.label} />
            ))}
          </FormGroup>
        </CardContent>
      </Card>

      {/* Summary */}
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mb: 2 }}>
        {[[totalNonTeaching, 'Non-teaching days'], [weeklyOffCount, 'Weekly offs'], [fullHols, 'Declared holidays'], [rhHols, 'Restricted (open)']].map(([n, l]) => (
          <Box key={l} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, minWidth: 130 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</Typography>
          </Box>
        ))}
      </Stack>

      {/* Declared holidays list */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Declared holidays <Typography component="span" variant="body2" color="text.secondary">({ayName})</Typography></Typography>

          {canManage && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
              <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} sx={{ flex: 1 }} />
              <TextField size="small" select label="Kind" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} sx={{ width: 150 }}>
                <MenuItem value="full">Full (closed)</MenuItem>
                <MenuItem value="restricted">Restricted (open)</MenuItem>
              </TextField>
              <Button variant="contained" startIcon={<AddIcon />} disabled={busy || !form.date} onClick={addHoliday}>Add</Button>
            </Stack>
          )}

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : holidays.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No declared holidays yet. (Weekly-offs above are separate.)</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Date</TableCell><TableCell>Name</TableCell><TableCell>Kind</TableCell>{canManage && <TableCell align="right" />}</TableRow>
                </TableHead>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h.uuid}>
                      <TableCell>{fmtDateDow(h.holidayDate)}</TableCell>
                      <TableCell>{h.name}</TableCell>
                      <TableCell><Chip size="small" label={h.kind === 'full' ? 'Full · closed' : 'Restricted · open'} color={h.kind === 'full' ? 'error' : 'warning'} variant="outlined" /></TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Tooltip title="Delete"><IconButton size="small" disabled={busy} onClick={() => run(() => activityCalendarService.deleteHoliday(h.uuid))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
