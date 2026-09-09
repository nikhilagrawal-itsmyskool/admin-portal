import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, MenuItem, Button,
  Typography, Alert, FormControlLabel, Checkbox, Box,
} from '@mui/material';
import { EventBusy as EventBusyIcon } from '@mui/icons-material';
import { activityCalendarService } from '../../services/activityCalendarService';
import { fmtDateDow, todayIso } from '../../utils/date';

// Count the days in [from,to] that are NOT weekly-offs — these are the days that will
// actually be marked closed (weekly-offs are already non-teaching, so we skip them).
function workingDays(from, to, weeklyOff) {
  if (!from || !to || to < from) return [];
  const out = [];
  let cur = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let guard = 0;
  while (cur.getTime() <= end.getTime() && guard < 400) {
    const date = cur.toISOString().slice(0, 10);
    if (!weeklyOff.includes(cur.getUTCDay())) out.push(date);
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard += 1;
  }
  return out;
}

// Declare an (often ad-hoc / unplanned) school closure across a date range. Writes one
// full/restricted holiday per working day, which flows into attendance + Student 360.
// SMS notify is intentionally disabled until the DLT/Meta closure template is approved.
export default function DeclareClosureDialog({ open, onClose, weeklyOff, academicYearId, onDone }) {
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('full');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const days = useMemo(() => workingDays(from, to, weeklyOff || []), [from, to, weeklyOff]);
  const invalid = !from || !to || to < from;

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await activityCalendarService.closeRange({ from, to, name: name.trim(), kind, academicYearId });
      onDone?.();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Could not declare the closure');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventBusyIcon color="error" /> Declare closure
      </DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mark one or more days as closed (e.g. an unplanned holiday). These flow into attendance and the student view. For a single day, keep From and To the same.
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date" label="From" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={from} onChange={(e) => { const v = e.target.value; setFrom(v); if (to < v) setTo(v); }}
            />
            <TextField
              type="date" label="To" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={to} onChange={(e) => setTo(e.target.value)} inputProps={{ min: from }}
            />
          </Stack>
          <TextField
            label="Reason" size="small" fullWidth placeholder="e.g. Heavy rain, local bandh"
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <TextField select label="Kind" size="small" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ maxWidth: 220 }}>
            <MenuItem value="full">Full — school closed</MenuItem>
            <MenuItem value="restricted">Restricted — school open</MenuItem>
          </TextField>

          {!invalid && (
            <Alert severity={days.length ? 'info' : 'warning'} icon={false} sx={{ py: 0.5 }}>
              {days.length === 0
                ? 'No working days in this range (all fall on weekly-offs) — nothing to mark.'
                : days.length === 1
                  ? <>Will mark <b>{fmtDateDow(days[0])}</b> as {kind === 'full' ? 'closed' : 'a restricted holiday'}.</>
                  : <>Will mark <b>{days.length} days</b> ({fmtDateDow(days[0])} → {fmtDateDow(days[days.length - 1])}). Weekly-offs in the range are skipped.</>}
            </Alert>
          )}

          {/* Notify — plumbing deferred until the closure SMS template is approved. */}
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <FormControlLabel
              control={<Checkbox size="small" disabled />}
              label="Notify parents by SMS / WhatsApp"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>
              Coming soon — awaiting approval of the school-closure message template (DLT / Meta).
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="error" startIcon={<EventBusyIcon />}
          disabled={busy || invalid || days.length === 0} onClick={submit}>
          {busy ? 'Declaring…' : `Declare closure${days.length > 1 ? ` (${days.length} days)` : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
