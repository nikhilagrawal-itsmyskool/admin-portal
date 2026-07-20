import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Alert, Stack, Chip, Checkbox, Divider, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { Save as SaveIcon, HowToReg as SignoffIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { useCan } from '../../permissions/can';
import ChecklistPage from './ChecklistPage';
import { resolveMyRosterWeek } from './myAssembly';

const fmtShort = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
const key = (itemId, date) => `${itemId}|${date || ''}`;

// Admin/god → the full checklist page (config + any week); teacher → this week.
export default function MyChecklist() {
  const can = useCan();
  return can('assembly.manage') ? <ChecklistPage /> : <TeacherChecklist />;
}

// Teacher: tap "Checklist" → straight into THIS week's checklist (same on-duty-house
// population as the roster). Not-your-week shows a message.
function TeacherChecklist() {
  const [reason, setReason] = useState('');
  const [weekId, setWeekId] = useState('');
  const [chk, setChk] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(''); setReason('');
    try {
      const r = await resolveMyRosterWeek();
      if (r.reason) { setReason(r.reason); return; }
      setWeekId(r.weekId);
      const c = await assemblyService.myWeekChecklist(r.weekId);
      setChk(c); setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date))));
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load the checklist'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (itemId, date) => setChecked((prev) => {
    const next = new Set(prev); const k = key(itemId, date);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const save = async () => {
    setBusy('save'); setError(''); setMsg('');
    try {
      const ticks = [...checked].map((k) => { const [itemId, date] = k.split('|'); return { itemId, date: date || undefined }; });
      const c = await assemblyService.mySaveChecklist(weekId, ticks);
      setChk(c); setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date)))); setMsg('Checklist saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save'); }
    finally { setBusy(''); }
  };
  const signoff = async () => {
    setBusy('signoff');
    try { setChk(await assemblyService.mySignoffChecklist(weekId, '')); setMsg('Signed off'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to sign off'); }
    finally { setBusy(''); }
  };

  const weekItems = chk?.weekItems || [];
  const dayItems = chk?.dayItems || [];
  const dates = chk?.dates || [];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Assembly Checklist</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {!loading && reason && <Alert severity="info">{reason}</Alert>}

      {chk && (
        <Card>
          <CardContent>
            {weekItems.length === 0 && dayItems.length === 0 && <Typography variant="body2" color="text.secondary">No checklist items configured.</Typography>}
            {weekItems.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>Weekly</Typography>
                <Stack sx={{ mb: 2 }}>
                  {weekItems.map((it) => (
                    <Stack key={it.uuid} direction="row" alignItems="center">
                      <Checkbox size="small" checked={checked.has(key(it.uuid, null))} onChange={() => toggle(it.uuid, null)} />
                      <Typography variant="body2">{it.phase ? `${it.phase}: ` : ''}{it.text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
            {dayItems.length > 0 && dates.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>Per day</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>Item</TableCell>
                      {dates.map((d) => <TableCell key={d} align="center">{fmtShort(d)}</TableCell>)}
                    </TableRow></TableHead>
                    <TableBody>
                      {dayItems.map((it) => (
                        <TableRow key={it.uuid}>
                          <TableCell>{it.text}</TableCell>
                          {dates.map((d) => (
                            <TableCell key={d} align="center" padding="none">
                              <Checkbox size="small" checked={checked.has(key(it.uuid, d))} onChange={() => toggle(it.uuid, d)} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy === 'save'}>Save ticks</Button>
              {chk.signoff
                ? <Chip color="success" icon={<SignoffIcon />} label="Signed off" />
                : <Tooltip title="Mark this week's checklist as signed off"><Button startIcon={<SignoffIcon />} onClick={signoff} disabled={busy === 'signoff'}>Sign off</Button></Tooltip>}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
