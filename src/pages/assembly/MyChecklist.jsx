import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Alert, Stack, Chip, Checkbox, FormControlLabel,
} from '@mui/material';
import { Save as SaveIcon, HowToReg as SignoffIcon, CheckCircle as DoneIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { useCan } from '../../permissions/can';
import ChecklistPage from './ChecklistPage';
import { resolveMyRosterWeek } from './myAssembly';
import { fmtDate } from '../../utils/date';

const key = (itemId, date) => `${itemId}|${date || ''}`;
const todayIso = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

// Admin/god → the full checklist page (config + any week, incl. reopen); teacher → this week.
export default function MyChecklist() {
  const can = useCan();
  return can('assembly.manage') ? <ChecklistPage /> : <TeacherChecklist />;
}

// Teacher (house rep on duty): submit the WEEKLY checks (once, before the week) and
// each DAY's checks day-by-day. Submitted blocks lock — only an admin can reopen.
function TeacherChecklist() {
  const [reason, setReason] = useState('');
  const [weekId, setWeekId] = useState('');
  const [chk, setChk] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const apply = (c) => { setChk(c); setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date)))); };

  const load = useCallback(async () => {
    setLoading(true); setError(''); setReason('');
    try {
      const r = await resolveMyRosterWeek();
      if (r.reason) { setReason(r.reason); return; }
      setWeekId(r.weekId);
      apply(await assemblyService.myWeekChecklist(r.weekId));
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load the checklist'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (itemId, date) => setChecked((prev) => {
    const next = new Set(prev); const k = key(itemId, date);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  // Ticks for a partition: weekly (date null) or a specific day.
  const ticksFor = (items, date) => items.filter((it) => checked.has(key(it.uuid, date))).map((it) => ({ itemId: it.uuid, date: date || undefined }));

  const run = async (tag, fn) => {
    setBusy(tag); setError(''); setMsg('');
    try { await fn(); } catch (err) { setError(err.response?.data?.error?.description || 'Something went wrong'); }
    finally { setBusy(''); }
  };
  const saveWeekly = () => run('w-save', async () => { apply(await assemblyService.mySaveChecklist(weekId, ticksFor(weekItems, null), 'week')); setMsg('Weekly checks saved'); });
  const submitWeekly = () => run('w-sub', async () => {
    await assemblyService.mySaveChecklist(weekId, ticksFor(weekItems, null), 'week');
    apply(await assemblyService.mySignoffChecklist(weekId, '', 'week')); setMsg('Weekly checks submitted');
  });
  const saveDay = (d) => run(`d-save-${d}`, async () => { apply(await assemblyService.mySaveChecklist(weekId, ticksFor(dayItems, d), 'day', d)); setMsg('Saved'); });
  const submitDay = (d) => run(`d-sub-${d}`, async () => {
    await assemblyService.mySaveChecklist(weekId, ticksFor(dayItems, d), 'day', d);
    apply(await assemblyService.mySignoffChecklist(weekId, '', 'day', d)); setMsg('Day submitted');
  });

  const weekItems = chk?.weekItems || [];
  const dayItems = chk?.dayItems || [];
  const dates = chk?.dates || [];
  const weeklySigned = !!chk?.signoff;
  const daySignedSet = new Set((chk?.daySignoffs || []).map((d) => d.date));

  // Render one item row (locked = read-only, shows a tick if done).
  const itemRow = (it, date, locked) => {
    const on = checked.has(key(it.uuid, date));
    const label = <Typography variant="body2" sx={{ color: locked && !on ? 'text.disabled' : 'text.primary' }}>{it.text}</Typography>;
    if (locked) return (
      <Stack key={it.uuid} direction="row" spacing={1} alignItems="flex-start" sx={{ py: 0.5 }}>
        <DoneIcon fontSize="small" sx={{ mt: 0.25, color: on ? 'success.main' : 'action.disabled' }} />
        {label}
      </Stack>
    );
    return (
      <FormControlLabel key={it.uuid} sx={{ alignItems: 'flex-start', mr: 0, '& .MuiCheckbox-root': { pt: 0.25 } }}
        control={<Checkbox size="small" checked={on} onChange={() => toggle(it.uuid, date)} />} label={label} />
    );
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Assembly Checklist</Typography>
      {chk && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Week of {dates[0] ? fmtDate(dates[0]) : ''}</Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {!loading && reason && <Alert severity="info">{reason}</Alert>}

      {chk && weekItems.length === 0 && dayItems.length === 0 && (
        <Typography variant="body2" color="text.secondary">No checklist items configured.</Typography>
      )}

      {/* Weekly block */}
      {chk && weekItems.length > 0 && (
        <Card sx={{ mb: 2, borderLeft: 3, borderColor: 'primary.main' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Weekly checks</Typography>
                <Typography variant="caption" color="text.secondary">Submit before the roster week</Typography>
              </Box>
              {weeklySigned && <Chip size="small" color="success" icon={<SignoffIcon />} label="Submitted" />}
            </Stack>
            <Stack sx={{ mb: weeklySigned ? 0 : 1.5 }}>{weekItems.map((it) => itemRow(it, null, weeklySigned))}</Stack>
            {!weeklySigned && (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" startIcon={<SaveIcon />} onClick={saveWeekly} disabled={busy.startsWith('w')}>Save</Button>
                <Button size="small" variant="contained" startIcon={<SignoffIcon />} onClick={submitWeekly} disabled={busy.startsWith('w')}>Submit weekly</Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily blocks — one card per assembly day, stacked */}
      {chk && dayItems.length > 0 && dates.map((d) => {
        const signed = daySignedSet.has(d);
        const doneCount = dayItems.filter((it) => checked.has(key(it.uuid, d))).length;
        const isToday = d === todayIso();
        return (
          <Card key={d} sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{fmtDate(d)}</Typography>
                  {isToday && <Typography variant="caption" color="primary">Today</Typography>}
                </Box>
                {signed
                  ? <Chip size="small" color="success" icon={<SignoffIcon />} label="Submitted" />
                  : <Chip size="small" variant="outlined" color={doneCount ? 'warning' : 'default'} label={doneCount ? `${doneCount} of ${dayItems.length}` : 'Not started'} />}
              </Stack>
              <Stack sx={{ mb: signed ? 0 : 1.5 }}>{dayItems.map((it) => itemRow(it, d, signed))}</Stack>
              {!signed && (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" startIcon={<SaveIcon />} onClick={() => saveDay(d)} disabled={busy.startsWith(`d-`) && busy.endsWith(d)}>Save</Button>
                  <Button size="small" variant="contained" startIcon={<SignoffIcon />} onClick={() => submitDay(d)} disabled={busy.startsWith(`d-`) && busy.endsWith(d)}>Submit day</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
