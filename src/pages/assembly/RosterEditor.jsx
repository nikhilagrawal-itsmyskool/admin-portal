import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, Alert, Stack,
  Chip, Accordion, AccordionSummary, AccordionDetails, Divider, Switch, FormControlLabel, Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon, Save as SaveIcon, Send as SubmitIcon, CheckCircle as ApproveIcon,
  LockOpen as UnlockIcon, Lock as LockIcon, Undo as RecallIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { classService } from '../../services/classService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useCan } from '../../permissions/can';
import { fmtDateDow, fmtDateTime } from '../../utils/date';
import { toRows, toPayload } from './rosterParticipants';
import RosterDays from './RosterDays';

const iso = (d) => d.toISOString().slice(0, 10);
const mondayOf = (d) => { const x = new Date(d); const dow = x.getUTCDay(); x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow)); return iso(x); };
const addDays = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return iso(x); };

const STATUS_COLOR = { draft: 'default', submitted: 'warning', approved: 'success' };

export default function RosterEditor() {
  const can = useCan();
  const canManage = can('assembly.manage'); // approve/unlock (god/assembly-incharge)
  const { academicYearId } = useAcademicYear();

  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [targetTypes, setTargetTypes] = useState([]);
  const [classOptions, setClassOptions] = useState([]);

  const [week, setWeek] = useState(null); // AssemblyWeekDetail or null (not created)
  const [draft, setDraft] = useState(null); // editable { days: [...] }
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const lookups = await assemblyService.getLookups();
        setTargetTypes(lookups?.responsibleTargetTypes || []);
      } catch { setError('Failed to load filters'); }
    })();
  }, []);

  useEffect(() => {
    if (!academicYearId) return;
    (async () => {
      const p = (await assemblyService.getPlans({ academicYearId })) || [];
      setPlans(p);
      setPlanId((cur) => (p.find((x) => x.uuid === cur) ? cur : (p[0]?.uuid || '')));
      try {
        const classes = await classService.getClasses({ academic_year_id: academicYearId });
        setClassOptions((Array.isArray(classes) ? classes : classes?.classes || []).map((c) => ({ uuid: c.uuid, name: c.name })));
      } catch { /* classes optional */ }
    })();
  }, [academicYearId]);

  const buildDraft = (detail) => ({
    days: (detail.days || []).map((d) => ({
      date: d.date, weekday: d.weekday,
      anchors: toRows(d.anchors), owners: toRows(d.owners),
      commanders: toRows(d.commanders), drummers: toRows(d.drummers),
      references: d.references || [],
      slots: (d.slots || []).map((s) => ({ ...s, participants: toRows(s.participants) })),
    })),
  });

  const loadWeek = useCallback(async () => {
    if (!planId || !weekStart) { setWeek(null); setDraft(null); return; }
    setLoading(true); setError(''); setMsg('');
    try {
      const list = (await assemblyService.listWeeks(planId, { from: weekStart, to: weekStart })) || [];
      if (list.length > 0) {
        const detail = await assemblyService.getWeek(list[0].uuid);
        setWeek(detail); setDraft(buildDraft(detail));
      } else { setWeek(null); setDraft(null); }
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load week'); }
    finally { setLoading(false); }
  }, [planId, weekStart]);
  useEffect(() => { loadWeek(); }, [loadWeek]);

  const start = async () => {
    setBusy('start'); setError('');
    try {
      const detail = await assemblyService.ensureWeek(planId, weekStart);
      setWeek(detail); setDraft(buildDraft(detail));
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to start roster'); }
    finally { setBusy(''); }
  };

  // Stable identities (functional updates → no deps) so the memoized RosterDays
  // subtree only re-renders the day/slot/row a keystroke actually touches.
  const setDay = useCallback((di, patch) => setDraft((d) => ({ ...d, days: d.days.map((x, j) => (j === di ? { ...x, ...patch } : x)) })), []);
  const setSlot = useCallback((di, si, patch) => setDraft((d) => ({
    ...d,
    days: d.days.map((x, j) => (j === di ? { ...x, slots: x.slots.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : x)),
  })), []);

  const save = async () => {
    setBusy('save'); setError(''); setMsg('');
    try {
      const payload = {
        days: draft.days.map((d) => ({
          date: d.date,
          anchors: toPayload(d.anchors, 'anchor'), owners: toPayload(d.owners, 'day-owner'),
          commanders: toPayload(d.commanders, 'commander'), drummers: toPayload(d.drummers, 'drummer'),
        })),
        entries: draft.days.flatMap((d) => d.slots.map((s) => ({
          date: d.date, nodeId: s.nodeId, opted: s.opted, content: (s.content || '').trim() || null,
          participants: toPayload(s.participants),
        }))),
      };
      const detail = await assemblyService.saveRoster(week.uuid, payload);
      setWeek(detail); setDraft(buildDraft(detail)); setMsg('Roster saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save roster'); }
    finally { setBusy(''); }
  };

  const act = (key, fn, okMsg) => async () => {
    setBusy(key); setError(''); setMsg('');
    try { const detail = await fn(); setWeek(detail); setDraft(buildDraft(detail)); setMsg(okMsg); }
    catch (err) { setError(err.response?.data?.error?.description || 'Action failed'); }
    finally { setBusy(''); }
  };
  const submit = act('submit', () => assemblyService.submitWeek(week.uuid), 'Submitted for approval');
  const recall = act('recall', () => assemblyService.recallWeek(week.uuid), 'Recalled to draft');
  const approve = act('approve', () => assemblyService.approveWeek(week.uuid), 'Approved & locked');
  const lock = act('lock', () => assemblyService.lockWeek(week.uuid), 'Locked — no further edits');
  const unlock = act('unlock', () => assemblyService.unlockWeek(week.uuid, 'edit after lock'), 'Re-opened for editing');

  const ro = !week?.editable; // read-only when not editable

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Weekly Roster</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="Wing (plan)" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>)}
                {plans.length === 0 && <MenuItem value="" disabled>No plans</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" onClick={() => setWeekStart(addDays(weekStart, -7))}>◀</Button>
                <TextField size="small" type="date" label="Week of (Mon)" value={weekStart}
                  onChange={(e) => setWeekStart(mondayOf(e.target.value))} InputLabelProps={{ shrink: true }} />
                <Button size="small" onClick={() => setWeekStart(addDays(weekStart, 7))}>▶</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!planId && <Typography color="text.secondary">Select a wing to begin.</Typography>}

      {planId && !week && !loading && (
        <Card><CardContent>
          <Typography sx={{ mb: 2 }}>No roster for the week of {fmtDateDow(weekStart)} yet.</Typography>
          <Button variant="contained" onClick={start} disabled={busy === 'start'}>{busy === 'start' ? 'Starting…' : 'Start roster for this week'}</Button>
        </CardContent></Card>
      )}

      {week && draft && (
        <>
          {/* Week header + workflow */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap" useFlexGap>
                <Chip label={week.status} color={STATUS_COLOR[week.status] || 'default'} />
                {week.houseName ? <Chip variant="outlined" label={`House on duty: ${week.houseName}`} /> : <Chip variant="outlined" label="No house on duty" />}
                {week.deadlineAt && <Typography variant="caption" color={week.pastDeadline ? 'error' : 'text.secondary'}>Deadline: {fmtDateTime(week.deadlineAt)}</Typography>}
                {ro && <Chip size="small" color={week.locked ? 'error' : 'warning'} label={week.locked ? 'Locked' : 'Read-only'} />}
                <Box sx={{ flex: 1 }} />
                {!ro && <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy === 'save'}>Save</Button>}
                {!ro && week.status !== 'submitted' && <Button size="small" startIcon={<SubmitIcon />} onClick={submit} disabled={busy === 'submit'}>Submit</Button>}
                {week.status === 'submitted' && <Button size="small" startIcon={<RecallIcon />} onClick={recall} disabled={busy === 'recall'}>Recall</Button>}
                {canManage && week.status !== 'approved' && <Button size="small" color="success" startIcon={<ApproveIcon />} onClick={approve} disabled={busy === 'approve'}>Approve</Button>}
                {canManage && (week.locked || week.pastDeadline
                  ? <Button size="small" color="warning" startIcon={<UnlockIcon />} onClick={unlock} disabled={busy === 'unlock'}>Unlock</Button>
                  : <Button size="small" color="warning" startIcon={<LockIcon />} onClick={lock} disabled={busy === 'lock'}>Lock</Button>)}
              </Stack>
            </CardContent>
          </Card>

          {/* Day accordions */}
          <RosterDays days={draft.days} onDayChange={setDay} onSlotChange={setSlot}
            targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId} disabled={ro}
            weekId={week.uuid} mine={false} />
        </>
      )}
    </Box>
  );
}
