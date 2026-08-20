import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, Stack, Chip } from '@mui/material';
import { Save as SaveIcon, Send as SubmitIcon, Undo as RecallIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { classService } from '../../services/classService';
import { useCan } from '../../permissions/can';
import { toRows, toPayload } from './rosterParticipants';
import RosterDays from './RosterDays';
import RosterEditor from './RosterEditor';
import { resolveMyRosterWeeks } from './myAssembly';
import { fmtDateDow } from '../../utils/date';

const STATUS_COLOR = { draft: 'default', submitted: 'warning', approved: 'success' };

// Admin/god → the full wing+week picker; teacher → their house's duty weeks (this
// week + next 4), tap a week to open it.
export default function MyRoster() {
  const can = useCan();
  return can('assembly.manage') ? <RosterEditor /> : <TeacherRoster />;
}

// Teacher: the roster for each week their house is on duty over the next 5 weeks.
// The server enforces that they belong to the on-duty house (edits gated to
// in-charge / co-in-charge / member); other-house weeks never appear here.
function TeacherRoster() {
  const [reason, setReason] = useState('');
  const [duties, setDuties] = useState([]);       // own-house weeks in the window
  const [selected, setSelected] = useState('');   // selected weekStart
  const [week, setWeek] = useState(null);
  const [draft, setDraft] = useState(null);
  const [targetTypes, setTargetTypes] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const classesLoadedRef = useRef(false); // class options are shared across the weeks

  const buildDraft = (detail) => ({
    days: (detail.days || []).map((d) => ({
      date: d.date, weekday: d.weekday, anchors: toRows(d.anchors), owners: toRows(d.owners),
      commanders: toRows(d.commanders), drummers: toRows(d.drummers),
      references: d.references || [],
      slots: (d.slots || []).map((s) => ({ ...s, participants: toRows(s.participants) })),
    })),
  });

  // Load one duty week (ensuring it first if it hasn't been started yet).
  const openWeek = useCallback(async (duty) => {
    if (!duty) return;
    setWeekLoading(true); setError(''); setMsg(''); setWeek(null); setDraft(null);
    try {
      const weekId = duty.weekId || (await assemblyService.myEnsureWeek(duty.planId, duty.weekStart)).uuid;
      const detail = await assemblyService.myWeek(weekId);
      setWeek(detail); setDraft(buildDraft(detail));
      if (detail.academicYearId && !classesLoadedRef.current) {
        classesLoadedRef.current = true;
        const classes = await classService.getClasses({ academic_year_id: detail.academicYearId });
        setClassOptions((Array.isArray(classes) ? classes : classes?.classes || []).map((c) => ({ uuid: c.uuid, name: c.name })));
      }
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load this week'); }
    finally { setWeekLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setReason('');
    try {
      const { duties: list } = await resolveMyRosterWeeks(4);
      setDuties(list);
      const lookups = await assemblyService.getLookups();
      setTargetTypes(lookups?.responsibleTargetTypes || []);
      if (list.length === 0) { setReason('Your house has no assembly duty in the next 5 weeks.'); return; }
      setSelected(list[0].weekStart);
      await openWeek(list[0]);
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load your roster'); }
    finally { setLoading(false); }
  }, [openWeek]);
  useEffect(() => { load(); }, [load]);

  const pickWeek = (duty) => { setSelected(duty.weekStart); openWeek(duty); };

  const ro = !week?.editable;
  // Stable identities (functional updates → no deps) so the memoized RosterDays
  // subtree only re-renders the day/slot/row a keystroke actually touches.
  const setDay = useCallback((di, patch) => setDraft((d) => ({ ...d, days: d.days.map((x, j) => (j === di ? { ...x, ...patch } : x)) })), []);
  const setSlot = useCallback((di, si, patch) => setDraft((d) => ({
    ...d, days: d.days.map((x, j) => (j === di ? { ...x, slots: x.slots.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : x)),
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
          date: d.date, nodeId: s.nodeId, opted: s.opted, content: (s.content || '').trim() || null, participants: toPayload(s.participants),
        }))),
      };
      const detail = await assemblyService.mySaveRoster(week.uuid, payload);
      setWeek(detail); setDraft(buildDraft(detail)); setMsg('Roster saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save'); }
    finally { setBusy(''); }
  };
  const submit = async () => {
    setBusy('submit'); setError(''); setMsg('');
    try { const d = await assemblyService.mySubmitWeek(week.uuid); setWeek(d); setDraft(buildDraft(d)); setMsg('Submitted for approval'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to submit'); }
    finally { setBusy(''); }
  };
  const recall = async () => {
    setBusy('recall'); setError(''); setMsg('');
    try { const d = await assemblyService.myRecallWeek(week.uuid); setWeek(d); setDraft(buildDraft(d)); setMsg('Recalled to draft — you can edit again'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to recall'); }
    finally { setBusy(''); }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Weekly Roster</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {!loading && reason && <Alert severity="info">{reason}</Alert>}

      {/* Duty weeks (this week + next 4) — tap one to open it */}
      {duties.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
          {duties.map((d) => (
            <Chip
              key={d.weekStart}
              label={`Week of ${fmtDateDow(d.weekStart)}`}
              onClick={() => pickWeek(d)}
              color={d.weekStart === selected ? 'primary' : 'default'}
              variant={d.weekStart === selected ? 'filled' : 'outlined'}
              size="small"
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Stack>
      )}

      {weekLoading && <Typography variant="body2" color="text.secondary">Loading week…</Typography>}

      {!weekLoading && week && draft && (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip label={week.status} color={STATUS_COLOR[week.status] || 'default'} />
                {week.houseName && <Chip variant="outlined" label={`House: ${week.houseName}`} />}
                {ro && <Chip size="small" color={week.locked ? 'error' : 'warning'} label={week.locked ? 'Locked' : 'Read-only'} />}
                <Box sx={{ flex: 1 }} />
                {!ro && <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy === 'save'}>Save</Button>}
                {!ro && week.status !== 'submitted' && <Button size="small" startIcon={<SubmitIcon />} onClick={submit} disabled={busy === 'submit'}>Submit</Button>}
                {week.status === 'submitted' && <Button size="small" startIcon={<RecallIcon />} onClick={recall} disabled={busy === 'recall'}>Recall</Button>}
              </Stack>
              {ro && <Typography variant="caption" color="text.secondary">This roster is {week.locked ? 'approved & locked' : week.status === 'submitted' ? 'submitted for approval — Recall it to make changes' : 'not open for editing'}.</Typography>}
            </CardContent>
          </Card>
          <RosterDays days={draft.days} onDayChange={setDay} onSlotChange={setSlot}
            targetTypes={targetTypes} classOptions={classOptions} academicYearId={week.academicYearId} disabled={ro}
            weekId={week.uuid} mine />
        </>
      )}
    </Box>
  );
}
