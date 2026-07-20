import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Alert, Stack, Chip, Divider, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, Send as SubmitIcon, HowToReg as SignoffIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { classService } from '../../services/classService';
import { toRows, toPayload } from './rosterParticipants';
import RosterDays from './RosterDays';

const fmtShort = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
const key = (itemId, date) => `${itemId}|${date || ''}`;
const STATUS_COLOR = { draft: 'default', submitted: 'warning', approved: 'success' };

// Teacher PWA: one week's roster + checklist, via /me/assembly/* (server enforces
// that I'm the in-charge of this week's house).
export default function MyWeekEditor() {
  const { weekId } = useParams();
  const navigate = useNavigate();

  const [week, setWeek] = useState(null);
  const [draft, setDraft] = useState(null);
  const [targetTypes, setTargetTypes] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [chk, setChk] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const buildDraft = (detail) => ({
    days: (detail.days || []).map((d) => ({
      date: d.date, weekday: d.weekday,
      anchors: toRows(d.anchors), owners: toRows(d.owners),
      slots: (d.slots || []).map((s) => ({ ...s, participants: toRows(s.participants) })),
    })),
  });

  const load = useCallback(async () => {
    setError('');
    try {
      const detail = await assemblyService.myWeek(weekId);
      setWeek(detail); setDraft(buildDraft(detail));
      const lookups = await assemblyService.getLookups();
      setTargetTypes(lookups?.responsibleTargetTypes || []);
      if (detail.academicYearId) {
        const classes = await classService.getClasses({ academic_year_id: detail.academicYearId });
        setClassOptions((Array.isArray(classes) ? classes : classes?.classes || []).map((c) => ({ uuid: c.uuid, name: c.name })));
      }
      const c = await assemblyService.myWeekChecklist(weekId);
      setChk(c); setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date))));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load this week');
    }
  }, [weekId]);
  useEffect(() => { load(); }, [load]);

  const ro = !week?.editable;
  const setDay = (di, patch) => setDraft((d) => ({ ...d, days: d.days.map((x, j) => (j === di ? { ...x, ...patch } : x)) }));
  const setSlot = (di, si, patch) => setDraft((d) => ({
    ...d, days: d.days.map((x, j) => (j === di ? { ...x, slots: x.slots.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : x)),
  }));

  const saveRoster = async () => {
    setBusy('save'); setError(''); setMsg('');
    try {
      const payload = {
        days: draft.days.map((d) => ({ date: d.date, anchors: toPayload(d.anchors, 'anchor'), owners: toPayload(d.owners, 'day-owner') })),
        entries: draft.days.flatMap((d) => d.slots.map((s) => ({
          date: d.date, nodeId: s.nodeId, opted: s.opted, content: (s.content || '').trim() || null, participants: toPayload(s.participants),
        }))),
      };
      const detail = await assemblyService.mySaveRoster(weekId, payload);
      setWeek(detail); setDraft(buildDraft(detail)); setMsg('Roster saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save'); }
    finally { setBusy(''); }
  };

  const submit = async () => {
    setBusy('submit'); setError(''); setMsg('');
    try { const d = await assemblyService.mySubmitWeek(weekId); setWeek(d); setDraft(buildDraft(d)); setMsg('Submitted for approval'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to submit'); }
    finally { setBusy(''); }
  };

  const toggle = (itemId, date) => setChecked((prev) => {
    const next = new Set(prev); const k = key(itemId, date);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const saveChecklist = async () => {
    setBusy('chk'); setError(''); setMsg('');
    try {
      const ticks = [...checked].map((k) => { const [itemId, date] = k.split('|'); return { itemId, date: date || undefined }; });
      const c = await assemblyService.mySaveChecklist(weekId, ticks);
      setChk(c); setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date)))); setMsg('Checklist saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save checklist'); }
    finally { setBusy(''); }
  };
  const signoff = async () => {
    setBusy('signoff');
    try { setChk(await assemblyService.mySignoffChecklist(weekId, '')); setMsg('Signed off'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to sign off'); }
    finally { setBusy(''); }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button size="small" startIcon={<BackIcon />} onClick={() => navigate('/assembly/my-duties')}>My duties</Button>
        <Typography variant="h6" sx={{ flex: 1 }}>Weekly Roster</Typography>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {week && draft && (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip label={week.status} color={STATUS_COLOR[week.status] || 'default'} />
                {week.houseName && <Chip variant="outlined" label={`House: ${week.houseName}`} />}
                {week.deadlineAt && <Typography variant="caption" color={week.pastDeadline ? 'error' : 'text.secondary'}>Deadline {new Date(week.deadlineAt).toLocaleDateString()}</Typography>}
                {ro && <Chip size="small" color={week.locked ? 'error' : 'warning'} label={week.locked ? 'Locked' : 'Read-only'} />}
                <Box sx={{ flex: 1 }} />
                {!ro && <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveRoster} disabled={busy === 'save'}>Save</Button>}
                {!ro && week.status !== 'submitted' && <Button size="small" startIcon={<SubmitIcon />} onClick={submit} disabled={busy === 'submit'}>Submit</Button>}
              </Stack>
              {ro && <Typography variant="caption" color="text.secondary">This week is {week.locked ? 'approved & locked' : 'not open for editing'}.</Typography>}
            </CardContent>
          </Card>

          <RosterDays days={draft.days} onDayChange={setDay} onSlotChange={setSlot}
            targetTypes={targetTypes} classOptions={classOptions} academicYearId={week.academicYearId} disabled={ro} />

          {/* Checklist */}
          {chk && (chk.weekItems?.length > 0 || chk.dayItems?.length > 0) && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Checklist</Typography>
                {chk.weekItems?.map((it) => (
                  <Stack key={it.uuid} direction="row" alignItems="center">
                    <Checkbox size="small" checked={checked.has(key(it.uuid, null))} onChange={() => toggle(it.uuid, null)} />
                    <Typography variant="body2">{it.phase ? `${it.phase}: ` : ''}{it.text}</Typography>
                  </Stack>
                ))}
                {chk.dayItems?.length > 0 && chk.dates?.length > 0 && (
                  <Box sx={{ overflowX: 'auto', mt: 1 }}>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>Item</TableCell>
                        {chk.dates.map((d) => <TableCell key={d} align="center">{fmtShort(d)}</TableCell>)}
                      </TableRow></TableHead>
                      <TableBody>
                        {chk.dayItems.map((it) => (
                          <TableRow key={it.uuid}>
                            <TableCell>{it.text}</TableCell>
                            {chk.dates.map((d) => (
                              <TableCell key={d} align="center" padding="none">
                                <Checkbox size="small" checked={checked.has(key(it.uuid, d))} onChange={() => toggle(it.uuid, d)} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={saveChecklist} disabled={busy === 'chk'}>Save ticks</Button>
                  {chk.signoff
                    ? <Chip color="success" icon={<SignoffIcon />} label="Signed off" />
                    : <Tooltip title="Mark this week's checklist as signed off"><Button startIcon={<SignoffIcon />} onClick={signoff} disabled={busy === 'signoff'}>Sign off</Button></Tooltip>}
                </Stack>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}
