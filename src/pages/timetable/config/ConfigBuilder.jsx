import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, IconButton, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Stack, Divider, CircularProgress, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon, Edit as EditIcon,
  Lock as LockIcon, LockOpen as LockOpenIcon, ContentCopy as CloneIcon,
} from '@mui/icons-material';
import { timetableService } from '../../../services/timetableService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const SLOT_COLORS = { teaching: 'primary', assembly: 'secondary', break: 'default', lunch: 'warning', reserved: 'info', activity: 'success', registration: 'error' };

function DayDialog({ open, days, existingDows, onClose, onSave }) {
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setDayOfWeek(''); setLabel(''); setError(''); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Day</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <TextField select fullWidth label="Weekday" value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)} sx={{ mt: 1, mb: 2 }}>
          {days.filter((d) => !existingDows.includes(d.value)).map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
        </TextField>
        <TextField fullWidth label="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => {
          if (!dayOfWeek) { setError('Pick a weekday'); return; }
          onSave({ dayOfWeek: Number(dayOfWeek), label: label.trim() || undefined });
        }}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

function SlotDialog({ open, slotTypes, defaultSequence, slot, onClose, onSave }) {
  const isEdit = Boolean(slot?.uuid);
  const [form, setForm] = useState({ sequence: 1, startTime: '', endTime: '', slotType: 'teaching', label: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    if (isEdit) {
      setForm({
        sequence: slot.sequence, startTime: slot.startTime || '', endTime: slot.endTime || '',
        slotType: slot.slotType || 'teaching', label: slot.label || '',
      });
    } else {
      setForm({ sequence: defaultSequence ?? 1, startTime: '', endTime: '', slotType: 'teaching', label: '' });
    }
    setError('');
  }, [open, defaultSequence, slot, isEdit]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Slot' : 'Add Slot'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <TextField fullWidth type="number" label="Sequence" value={form.sequence}
          onChange={(e) => setForm({ ...form, sequence: e.target.value })} sx={{ mt: 1, mb: 1 }}
          helperText="Use -1 for assembly and 0 for the registration (0th) period; 1+ for normal periods." />
        <TextField select fullWidth label="Slot Type" value={form.slotType}
          onChange={(e) => setForm({ ...form, slotType: e.target.value })} sx={{ mt: 1, mb: 2 }}>
          {slotTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField fullWidth label="Start (HH:MM)" placeholder="09:00" value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <TextField fullWidth label="End (HH:MM)" placeholder="09:40" value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </Stack>
        <TextField fullWidth label="Label (optional)" value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => {
          const seq = Number(form.sequence);
          if (!Number.isInteger(seq)) { setError('Sequence must be an integer'); return; }
          onSave({
            sequence: seq, slotType: form.slotType,
            startTime: form.startTime.trim() || undefined, endTime: form.endTime.trim() || undefined,
            label: form.label.trim() || undefined,
          });
        }}>{isEdit ? 'Save' : 'Add'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ConfigBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [daysLookup, setDaysLookup] = useState([]);
  const [slotTypes, setSlotTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dayDialog, setDayDialog] = useState(false);
  const [slotDialog, setSlotDialog] = useState({ open: false, day: null, slot: null });
  const [confirm, setConfirm] = useState({ open: false, kind: null, target: null });
  const [working, setWorking] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [cfg, lookups] = await Promise.all([
        timetableService.getConfig(id),
        timetableService.getLookups(),
      ]);
      setConfig(cfg);
      setDaysLookup(lookups.daysOfWeek || []);
      setSlotTypes(lookups.slotTypes || []);
    } catch (err) {
      setError('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const labelForDow = (dow) => daysLookup.find((d) => d.value === dow)?.label || `Day ${dow}`;

  const addDay = async (data) => {
    try { await timetableService.createDay(id, data); setDayDialog(false); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to add day'); }
  };
  const saveSlot = async (data) => {
    try {
      if (slotDialog.slot) await timetableService.updateSlot(slotDialog.slot.uuid, data);
      else await timetableService.createSlot(slotDialog.day.uuid, data);
      setSlotDialog({ open: false, day: null, slot: null });
      load();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save slot'); }
  };
  const doLock = async () => {
    setWorking(true); setError('');
    try { await timetableService.lockConfig(id); await load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to lock'); }
    finally { setWorking(false); }
  };
  const doUnlock = async () => {
    setWorking(true); setError('');
    try { await timetableService.unlockConfig(id); await load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to unlock'); }
    finally { setWorking(false); }
  };
  const doClone = async () => {
    setWorking(true); setError('');
    try {
      const clone = await timetableService.cloneConfig(id, {});
      navigate(`/timetable/configs/${clone.uuid}`);
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to clone'); setWorking(false); }
  };
  const doConfirm = async () => {
    setWorking(true);
    try {
      if (confirm.kind === 'day') await timetableService.deleteDay(confirm.target.uuid);
      else await timetableService.deleteSlot(confirm.target.uuid);
      setConfirm({ open: false, kind: null, target: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete');
      setConfirm({ open: false, kind: null, target: null });
    } finally { setWorking(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!config) return <Alert severity="error">Config not found</Alert>;

  const existingDows = (config.days || []).map((d) => d.dayOfWeek);
  const locked = Boolean(config.lockedAt);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/timetable/configs')}><BackIcon /></IconButton>
          <Typography variant="h4">{config.name}</Typography>
          <Chip size="small" label={config.status} color={config.status === 'active' ? 'success' : 'default'} variant="outlined" />
          <Chip size="small" icon={locked ? <LockIcon /> : <LockOpenIcon />} label={locked ? 'Locked' : 'Draft'}
            color={locked ? 'default' : 'success'} variant={locked ? 'filled' : 'outlined'} />
        </Box>
        <Stack direction="row" spacing={1}>
          {!locked && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDayDialog(true)}>Add Day</Button>}
          {!locked && <Button variant="outlined" startIcon={<LockIcon />} disabled={working} onClick={doLock}>Lock</Button>}
          {locked && <Button variant="outlined" startIcon={<LockOpenIcon />} disabled={working} onClick={doUnlock}>Unlock</Button>}
          <Button variant="outlined" startIcon={<CloneIcon />} disabled={working} onClick={doClone}>Clone</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {locked && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This config is locked, so it can be used to generate timetables. To change it, clone it into a new draft and edit that.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {(config.days || []).length === 0 && <Typography sx={{ color: '#8f9bb3' }}>No days yet. Add a weekday to start building the grid.</Typography>}
        {(config.days || []).map((day) => (
          <Card key={day.uuid} sx={{ minWidth: 240, flexShrink: 0 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">{day.label || labelForDow(day.dayOfWeek)}</Typography>
                {!locked && (
                  <Tooltip title="Delete day">
                    <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, kind: 'day', target: day })}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Stack spacing={1}>
                {(day.slots || []).map((slot) => (
                  <Box key={slot.uuid} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1, bgcolor: '#f7f9fc' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>#{slot.sequence}</Typography>
                        <Chip size="small" label={slot.slotType} color={SLOT_COLORS[slot.slotType] || 'default'} variant="outlined" />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
                        {slot.label || ''}{slot.startTime ? ` ${slot.startTime}–${slot.endTime || ''}` : ''}
                      </Typography>
                    </Box>
                    {!locked && (
                      <Box>
                        <IconButton size="small" onClick={() => setSlotDialog({ open: true, day, slot })}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, kind: 'slot', target: slot })}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    )}
                  </Box>
                ))}
                {!locked && <Button size="small" startIcon={<AddIcon />} onClick={() => setSlotDialog({ open: true, day, slot: null })}>Add Slot</Button>}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <DayDialog open={dayDialog} days={daysLookup} existingDows={existingDows} onClose={() => setDayDialog(false)} onSave={addDay} />
      <SlotDialog open={slotDialog.open} slotTypes={slotTypes} slot={slotDialog.slot}
        defaultSequence={((slotDialog.day?.slots || []).reduce((m, s) => Math.max(m, s.sequence), 0)) + 1}
        onClose={() => setSlotDialog({ open: false, day: null, slot: null })} onSave={saveSlot} />
      <ConfirmDialog
        open={confirm.open} title={confirm.kind === 'day' ? 'Delete Day' : 'Delete Slot'}
        message={confirm.kind === 'day' ? 'Delete this day and all its slots?' : 'Delete this slot?'}
        onConfirm={doConfirm} onCancel={() => setConfirm({ open: false, kind: null, target: null })} loading={working}
      />
    </Box>
  );
}
