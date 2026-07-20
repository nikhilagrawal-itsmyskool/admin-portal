import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, Stack, Chip } from '@mui/material';
import { Save as SaveIcon, Send as SubmitIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { classService } from '../../services/classService';
import { toRows, toPayload } from './rosterParticipants';
import RosterDays from './RosterDays';
import { resolveMyRosterWeek } from './myAssembly';

const STATUS_COLOR = { draft: 'default', submitted: 'warning', approved: 'success' };

// Teacher PWA: tap "Roster" → straight into THIS week's roster (no pickers). The
// server enforces that I belong to the on-duty house; otherwise a "not your week"
// message shows.
export default function MyRoster() {
  const [reason, setReason] = useState('');
  const [week, setWeek] = useState(null);
  const [draft, setDraft] = useState(null);
  const [targetTypes, setTargetTypes] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const buildDraft = (detail) => ({
    days: (detail.days || []).map((d) => ({
      date: d.date, weekday: d.weekday, anchors: toRows(d.anchors), owners: toRows(d.owners),
      slots: (d.slots || []).map((s) => ({ ...s, participants: toRows(s.participants) })),
    })),
  });

  const load = useCallback(async () => {
    setLoading(true); setError(''); setReason('');
    try {
      const r = await resolveMyRosterWeek();
      if (r.reason) { setReason(r.reason); return; }
      const detail = await assemblyService.myWeek(r.weekId);
      setWeek(detail); setDraft(buildDraft(detail));
      const lookups = await assemblyService.getLookups();
      setTargetTypes(lookups?.responsibleTargetTypes || []);
      if (detail.academicYearId) {
        const classes = await classService.getClasses({ academic_year_id: detail.academicYearId });
        setClassOptions((Array.isArray(classes) ? classes : classes?.classes || []).map((c) => ({ uuid: c.uuid, name: c.name })));
      }
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load your roster'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ro = !week?.editable;
  const setDay = (di, patch) => setDraft((d) => ({ ...d, days: d.days.map((x, j) => (j === di ? { ...x, ...patch } : x)) }));
  const setSlot = (di, si, patch) => setDraft((d) => ({
    ...d, days: d.days.map((x, j) => (j === di ? { ...x, slots: x.slots.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : x)),
  }));

  const save = async () => {
    setBusy('save'); setError(''); setMsg('');
    try {
      const payload = {
        days: draft.days.map((d) => ({ date: d.date, anchors: toPayload(d.anchors, 'anchor'), owners: toPayload(d.owners, 'day-owner') })),
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

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Weekly Roster</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {!loading && reason && <Alert severity="info">{reason}</Alert>}

      {week && draft && (
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
              </Stack>
              {ro && <Typography variant="caption" color="text.secondary">This week is {week.locked ? 'approved & locked' : 'not open for editing'}.</Typography>}
            </CardContent>
          </Card>
          <RosterDays days={draft.days} onDayChange={setDay} onSlotChange={setSlot}
            targetTypes={targetTypes} classOptions={classOptions} academicYearId={week.academicYearId} disabled={ro} />
        </>
      )}
    </Box>
  );
}
