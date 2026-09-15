import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Autocomplete, TextField,
  IconButton, Typography, Box, Divider, Alert,
} from '@mui/material';
import { Add as AddIcon, Close as RemoveIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';

// Manage the invigilators of ONE room on ONE day — multiple teachers allowed, each with an
// optional shift label + from/to time (shift hand-offs; logs actual hours). Saving replaces
// the whole day's assignments (this room's new list merged with the other rooms, untouched).
export default function ManageRoomInvigilatorsDialog({
  open, onClose, examId, date, roomId, roomName, current = [], dayAssignments = [], employees = [], onSaved,
}) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Seed the editable list each time the dialog opens for a room.
  React.useEffect(() => {
    if (open) {
      setErr('');
      setList((current || []).map((a) => ({
        employeeId: a.employeeId, employeeName: a.employeeName,
        shiftLabel: a.shiftLabel || '', fromTime: a.fromTime || '', toTime: a.toTime || '',
      })));
    }
  }, [open, roomId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const empById = React.useMemo(() => Object.fromEntries((employees || []).map((e) => [e.uuid, e])), [employees]);
  const addRow = () => setList((l) => [...l, { employeeId: '', employeeName: '', shiftLabel: '', fromTime: '', toTime: '' }]);
  const setRow = (i, patch) => setList((l) => l.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i) => setList((l) => l.filter((_, idx) => idx !== i));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const mine = list.filter((r) => r.employeeId).map((r) => ({
        roomId, employeeId: r.employeeId, shiftLabel: r.shiftLabel || null, fromTime: r.fromTime || null, toTime: r.toTime || null,
      }));
      // Keep every OTHER room's assignments for the day exactly as they are (replace-all save).
      const others = (dayAssignments || [])
        .filter((a) => a.roomId !== roomId)
        .map((a) => ({ roomId: a.roomId, employeeId: a.employeeId, shiftLabel: a.shiftLabel || null, fromTime: a.fromTime || null, toTime: a.toTime || null }));
      const view = await examinationService.saveRoomInvigilatorsForDate(examId, date, [...others, ...mine]);
      onSaved?.(view);
      onClose?.();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save invigilators');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Room {roomName} · {fmtDate(date)}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Assign one or more teachers. Add a shift + time when duties are split (e.g. 09:00–10:00, then a hand-off).
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setErr('')}>{err}</Alert>}

        <Stack spacing={1.5}>
          {list.map((r, i) => (
            <Box key={i}>
              {i > 0 && <Divider sx={{ mb: 1.5 }} />}
              <Stack direction="row" spacing={1} alignItems="center">
                <Autocomplete
                  size="small" sx={{ flex: 1, minWidth: 160 }} options={employees}
                  getOptionLabel={(o) => o.name || ''}
                  value={r.employeeId ? (empById[r.employeeId] || { uuid: r.employeeId, name: r.employeeName }) : null}
                  onChange={(_, v) => setRow(i, { employeeId: v ? v.uuid : '', employeeName: v ? v.name : '' })}
                  isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                  renderInput={(p) => <TextField {...p} placeholder="Teacher" />}
                />
                <IconButton size="small" color="error" onClick={() => removeRow(i)} aria-label="Remove"><RemoveIcon fontSize="small" /></IconButton>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField size="small" label="Shift" placeholder="e.g. Shift 1" sx={{ flex: 1 }}
                  value={r.shiftLabel} onChange={(e) => setRow(i, { shiftLabel: e.target.value })} />
                <TextField size="small" label="From" type="time" sx={{ width: 120 }} InputLabelProps={{ shrink: true }}
                  value={r.fromTime} onChange={(e) => setRow(i, { fromTime: e.target.value })} />
                <TextField size="small" label="To" type="time" sx={{ width: 120 }} InputLabelProps={{ shrink: true }}
                  value={r.toTime} onChange={(e) => setRow(i, { toTime: e.target.value })} />
              </Stack>
            </Box>
          ))}
          {!list.length && <Typography variant="body2" color="text.secondary">No invigilator yet — add one below.</Typography>}
          <Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: 'flex-start' }}>Add teacher / shift</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
