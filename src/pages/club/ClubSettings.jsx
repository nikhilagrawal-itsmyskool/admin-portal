import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Card, CardContent, TextField, Button, Alert, CircularProgress, Divider, IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { clubService } from '../../services/clubService';
import { useCan } from '../../permissions/can';

// Per-school programme settings — the day-neutral display name (e.g. "Saturday Activities"),
// default slot windows, and the soft parallel-club limit.
export default function ClubSettings() {
  const can = useCan();
  const canManage = can('club.setup.manage');
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await clubService.getSettings(); setS({ displayName: d.displayName || '', parallelClubLimit: d.parallelClubLimit ?? '', defaultSlots: d.defaultSlots || [] }); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setErr(''); setMsg('');
    try {
      await clubService.updateSettings({
        displayName: s.displayName || null,
        parallelClubLimit: s.parallelClubLimit === '' ? null : Number(s.parallelClubLimit),
        defaultSlots: s.defaultSlots,
      });
      setMsg('Settings saved.');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Save failed'); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Programme Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Admin-only. These shape how Clubs &amp; Activities appears school-wide.</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      <Card variant="outlined"><CardContent><Stack spacing={2}>
        <TextField label="Display name" value={s.displayName} onChange={(e) => setS({ ...s, displayName: e.target.value })}
          size="small" disabled={!canManage} helperText='What users see this programme called, e.g. "Saturday Activities"' />
        <TextField label="Parallel-club limit (soft)" value={s.parallelClubLimit} onChange={(e) => setS({ ...s, parallelClubLimit: e.target.value })}
          size="small" disabled={!canManage} helperText="Warn when more than this many clubs run at once. Blank = no limit." />
        <Divider />
        <Typography variant="subtitle2">Default slots</Typography>
        {s.defaultSlots.map((slot, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            <TextField size="small" type="time" label="Start" InputLabelProps={{ shrink: true }} value={slot.start || ''} disabled={!canManage}
              onChange={(e) => setS({ ...s, defaultSlots: s.defaultSlots.map((x, j) => j === i ? { ...x, start: e.target.value } : x) })} />
            <TextField size="small" type="time" label="End" InputLabelProps={{ shrink: true }} value={slot.end || ''} disabled={!canManage}
              onChange={(e) => setS({ ...s, defaultSlots: s.defaultSlots.map((x, j) => j === i ? { ...x, end: e.target.value } : x) })} />
            <TextField size="small" label="Label" value={slot.label || ''} disabled={!canManage}
              onChange={(e) => setS({ ...s, defaultSlots: s.defaultSlots.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
            {canManage && <IconButton size="small" onClick={() => setS({ ...s, defaultSlots: s.defaultSlots.filter((_, j) => j !== i) })}><DeleteIcon fontSize="small" /></IconButton>}
          </Stack>
        ))}
        {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setS({ ...s, defaultSlots: [...s.defaultSlots, { start: '09:00', end: '10:00', label: `Slot ${s.defaultSlots.length + 1}` }] })}>Add slot</Button>}
        {canManage && <Box><Button variant="contained" onClick={save}>Save settings</Button></Box>}
      </Stack></CardContent></Card>
    </Box>
  );
}
