import React, { useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Stack, TextField, Button, MenuItem,
  Switch, Chip, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { activityCalendarService } from '../../services/activityCalendarService';
import { typeMeta, WEEKDAY_LONG } from './calendarUtils';
import { fmtDateLong } from '../../utils/date';

// Right-hand editor for a single day: holiday toggle + one section per type with
// add / edit / delete line items. Mutations call the API then onChanged() so the
// parent reloads the month and re-feeds this drawer with fresh data.
export default function DayEditorDrawer({ day, types, academicYearId, canManage, onClose, onChanged }) {
  const open = !!day;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState({ value: '', detail: '' });
  const [addFor, setAddFor] = useState(null); // typeCode being added to
  const [addVal, setAddVal] = useState({ value: '', detail: '' });
  const [holName, setHolName] = useState('');
  const [holKind, setHolKind] = useState('full');

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); await onChanged(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  if (!day) return <Drawer anchor="right" open={false} onClose={onClose} />;

  const entriesByType = (code) => (day.entries || []).filter((e) => e.typeCode === code);
  const hol = day.holiday;

  const startEdit = (e) => { setEditId(e.uuid); setEditVal({ value: e.value, detail: e.detail || '' }); };
  const saveEdit = (e) => run(async () => {
    await activityCalendarService.updateEntry(e.uuid, { value: editVal.value.trim(), detail: editVal.detail.trim() || null });
    setEditId(null);
  });
  const remove = (e) => run(() => activityCalendarService.deleteEntry(e.uuid));

  const startAdd = (code) => { setAddFor(code); setAddVal({ value: '', detail: '' }); };
  const saveAdd = (code) => run(async () => {
    await activityCalendarService.addEntry({
      entryDate: day.date, typeCode: code, academicYearId,
      value: addVal.value.trim(), detail: addVal.detail.trim() || null,
    });
    setAddFor(null);
  });

  const toggleHoliday = (checked) => run(async () => {
    if (checked) await activityCalendarService.setHoliday({ holidayDate: day.date, academicYearId, name: holName.trim() || 'Holiday', kind: holKind });
    else if (hol) await activityCalendarService.deleteHoliday(hol.uuid);
  });
  const updateHoliday = () => run(() => activityCalendarService.setHoliday({ holidayDate: day.date, academicYearId, name: holName.trim() || 'Holiday', kind: holKind }));

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '92vw', sm: 400 } } }}>
      <Box sx={{ p: 2.25, borderBottom: '1px solid', borderColor: 'divider', position: 'relative' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {WEEKDAY_LONG[day.weekday] || ''}{day.isWeeklyOff ? ' · Weekly off' : ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">{fmtDateLong(day.date)}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10 }}><CloseIcon fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ p: 2.25, overflowY: 'auto', flex: 1 }}>
        {err && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{err}</Typography>}

        {/* Holiday */}
        <Box sx={{ bgcolor: hol ? 'error.50' : 'grey.50', border: '1px solid', borderColor: hol ? 'error.light' : 'divider', borderRadius: 1.5, p: 1.5, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">{hol ? `Holiday · ${hol.name}` : 'Not a holiday'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {hol ? (hol.kind === 'full' ? 'Full day — school closed (flows to attendance)' : 'Restricted — optional') : 'Turn on to close school & warn attendance'}
              </Typography>
            </Box>
            <Switch checked={!!hol} disabled={!canManage || busy} onChange={(e) => toggleHoliday(e.target.checked)}
              color={hol?.kind === 'restricted' ? 'warning' : 'error'} />
          </Stack>
          {hol && canManage && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField size="small" label="Name" value={holName || hol.name} onChange={(e) => setHolName(e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" select label="Kind" value={holKind || hol.kind} onChange={(e) => setHolKind(e.target.value)} sx={{ width: 120 }}>
                <MenuItem value="full">Full</MenuItem>
                <MenuItem value="restricted">Restricted</MenuItem>
              </TextField>
              <IconButton size="small" color="primary" onClick={updateHoliday} disabled={busy}><CheckIcon fontSize="small" /></IconButton>
            </Stack>
          )}
        </Box>

        {/* Type sections */}
        {types.map((t) => {
          const meta = typeMeta(t.code);
          const items = entriesByType(t.code);
          const isTheme = t.code === 'theme';
          return (
            <Box key={t.uuid} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: meta.color }} />
                <Typography variant="overline" sx={{ color: meta.color, fontWeight: 700, letterSpacing: 0.4 }}>{t.name}</Typography>
                {canManage && <Button size="small" startIcon={<AddIcon />} sx={{ ml: 'auto' }} onClick={() => startAdd(t.code)}>add</Button>}
              </Stack>

              {items.length === 0 && addFor !== t.code && (
                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>No {isTheme ? 'thought' : 'entry'} yet.</Typography>
              )}

              {items.map((e) => (
                <Box key={e.uuid} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, mb: 0.75 }}>
                  {editId === e.uuid ? (
                    <Stack spacing={1}>
                      <TextField size="small" fullWidth multiline value={editVal.value} onChange={(ev) => setEditVal((v) => ({ ...v, value: ev.target.value }))} />
                      {t.code === 'remembrance' && (
                        <TextField size="small" fullWidth label="Detail (e.g. role)" value={editVal.detail} onChange={(ev) => setEditVal((v) => ({ ...v, detail: ev.target.value }))} />
                      )}
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => setEditId(null)}>Cancel</Button>
                        <Button size="small" variant="contained" onClick={() => saveEdit(e)} disabled={busy || !editVal.value.trim()}>Save</Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontStyle: isTheme ? 'italic' : 'normal' }}>{e.value}</Typography>
                        {e.detail && <Typography variant="caption" color="text.secondary">{e.detail}</Typography>}
                      </Box>
                      {canManage && (
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => startEdit(e)}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(e)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Box>
              ))}

              {addFor === t.code && (
                <Box sx={{ border: '1px dashed', borderColor: 'primary.light', borderRadius: 1, p: 1, mb: 0.75 }}>
                  <Stack spacing={1}>
                    <TextField size="small" fullWidth autoFocus multiline placeholder={isTheme ? 'Thought of the day…' : 'Value…'}
                      value={addVal.value} onChange={(e) => setAddVal((v) => ({ ...v, value: e.target.value }))} />
                    {t.code === 'remembrance' && (
                      <TextField size="small" fullWidth label="Detail (e.g. role)" value={addVal.detail} onChange={(e) => setAddVal((v) => ({ ...v, detail: e.target.value }))} />
                    )}
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => setAddFor(null)}>Cancel</Button>
                      <Button size="small" variant="contained" onClick={() => saveAdd(t.code)} disabled={busy || !addVal.value.trim()}>Add</Button>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {busy && (
        <Box sx={{ position: 'absolute', top: 12, right: 44 }}><CircularProgress size={18} /></Box>
      )}
    </Drawer>
  );
}
