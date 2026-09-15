import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Alert, CircularProgress, Stack, Autocomplete, TextField, Paper, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Typography, MenuItem, Chip, Divider,
} from '@mui/material';
import { HowToReg as RosterIcon, CheckCircle as DoneIcon, Lock as LockIcon, People as PeopleIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, todayIso } from '../../utils/date';
import ManageRoomInvigilatorsDialog from './ManageRoomInvigilatorsDialog';

const cellKey = (date, roomId) => `${date}|${roomId}`;
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOf = (d) => DOW[new Date(`${d}T00:00:00`).getDay()];

// Default the "Focus a day" to today's exam day, else the next upcoming, else the most recent.
const pickDefaultDate = (dates) => {
  if (!dates?.length) return '';
  const today = todayIso();
  if (dates.includes(today)) return today;
  return dates.filter((d) => d >= today).sort()[0] || dates[dates.length - 1];
};

// One assignment as "Name · 09:00–10:00" (or the shift label if no times).
const invLabel = (a) => {
  const time = a.fromTime && a.toTime ? `${a.fromTime}–${a.toTime}` : (a.fromTime || a.toTime || '');
  const tag = time || a.shiftLabel || '';
  return tag ? `${a.employeeName || '—'} · ${tag}` : (a.employeeName || '—');
};

// Per-(room, date) invigilators for a seating-room exam — MULTIPLE teachers per room, each with
// an optional shift + time (hand-offs). Manage a cell via the dialog; open the roster to sign.
export default function RoomInvigilatorGrid({ examId, canManage, employees }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGod = (user?.roles || []).some((r) => r === 'god' || r === 'exam-incharge');
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [focusDate, setFocusDate] = useState(''); // '' = all days; else just that day's active rooms
  const [manage, setManage] = useState(null); // { roomId, roomName, date, current }

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getRoomInvigilators(examId);
      setView(v);
      setFocusDate((cur) => cur || pickDefaultDate(v.dates));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load room invigilators');
    } finally { setLoading(false); }
  }, [examId]);
  useEffect(() => { load(); }, [load]);

  const empById = useMemo(() => { const m = {}; for (const e of employees || []) m[e.uuid] = e; return m; }, [employees]);

  const activeSet = useMemo(() => {
    const s = new Set();
    if (view) for (const d of view.dates) for (const rid of (view.activeByDate?.[d] || [])) s.add(cellKey(d, rid));
    return s;
  }, [view]);

  const submittedSet = useMemo(() => {
    const s = new Set();
    if (view) for (const x of (view.submitted || [])) s.add(cellKey(x.examDate, x.roomId));
    return s;
  }, [view]);

  // All invigilators of a (room, date), grouped from the server's assignment list.
  const cellAssignments = useMemo(() => {
    const m = new Map();
    if (view) for (const a of view.assignments || []) {
      const k = cellKey(a.examDate, a.roomId);
      (m.get(k) || m.set(k, []).get(k)).push(a);
    }
    return m;
  }, [view]);

  // Same teacher on more than one room the same day (soft warning, from the server).
  const conflictCells = useMemo(() => {
    const s = new Set();
    if (view) for (const c of view.conflicts || []) for (const rid of c.roomIds) s.add(cellKey(c.examDate, rid));
    return s;
  }, [view]);

  const saveRelievers = async (ids) => {
    setSaving(true); setErr(''); setMsg('');
    try { setView(await examinationService.saveRelieversForDate(examId, focusDate, ids)); setMsg('Relievers saved.'); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save relievers'); await load(); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!view) return <Alert severity="error">{err || 'Failed to load'}</Alert>;
  if (!view.rooms.length) return <Alert severity="info">Set up the seating rooms first (Seating tab), then assign invigilators per room.</Alert>;
  if (!view.dates.length) return <Alert severity="info">Add the datesheet first — invigilators are assigned per exam date.</Alert>;

  const shownDates = focusDate ? [focusDate] : view.dates;
  const shownRooms = focusDate ? view.rooms.filter((rm) => activeSet.has(cellKey(focusDate, rm.uuid))) : view.rooms;

  const dayTally = (d) => {
    const active = view.activeByDate?.[d] || [];
    return { signed: active.filter((rid) => submittedSet.has(cellKey(d, rid))).length, total: active.length };
  };

  // Relievers + free teachers for the focused day. "Assigned" now spans every invigilator of
  // every room that day (any shift) — so an on-duty teacher is never offered/shown as free.
  const relievers = focusDate ? (view.relieversByDate?.[focusDate] || []) : [];
  const relieverIds = new Set(relievers.map((r) => r.employeeId));
  const assignedForDay = new Set((view.assignments || []).filter((a) => a.examDate === focusDate).map((a) => a.employeeId));
  const relieverValue = relievers.map((r) => empById[r.employeeId] || { uuid: r.employeeId, name: r.employeeName });
  const relieverOptions = (employees || []).filter((e) => !assignedForDay.has(e.uuid));
  const freeTeachers = (employees || []).filter((e) => !assignedForDay.has(e.uuid) && !relieverIds.has(e.uuid));
  const dayLocked = !isGod && focusDate && focusDate < todayIso();

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {conflictCells.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>A teacher is assigned to more than one room on the same day (highlighted). Fine for split shifts — double-check the times.</Alert>
      )}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <TextField select size="small" label="Focus a day" sx={{ minWidth: 220 }} value={focusDate} onChange={(e) => setFocusDate(e.target.value)}>
          <MenuItem value=""><em>All days (full grid)</em></MenuItem>
          {view.dates.map((d) => <MenuItem key={d} value={d}>{fmtDate(d)} · {dayOf(d)} · {(view.activeByDate?.[d] || []).length} rooms</MenuItem>)}
        </TextField>
        {focusDate && <Typography variant="caption" color="text.secondary">Showing only the {shownRooms.length} room(s) used on {fmtDate(focusDate)}.</Typography>}
      </Stack>

      <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: 2 }}>
        <Table size="small" sx={{
          minWidth: 160 + shownDates.length * 240,
          '& thead th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', borderBottom: 2, borderColor: 'divider' },
          '& td': { verticalAlign: 'top' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 140, position: 'sticky', left: 0, bgcolor: 'action.hover !important', zIndex: 2 }}>Room</TableCell>
              {shownDates.map((d) => {
                const t = dayTally(d);
                return (
                  <TableCell key={d} sx={{ minWidth: 230, lineHeight: 1.25 }}>
                    {fmtDate(d)}
                    <Typography variant="caption" display="block" color="primary.main" sx={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{dayOf(d)}</Typography>
                    <Typography variant="caption" display="block" sx={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600, color: t.total && t.signed === t.total ? 'success.main' : 'text.secondary' }}>
                      {t.signed}/{t.total} signed
                    </Typography>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {shownRooms.map((rm) => (
              <TableRow key={rm.uuid}>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 600 }}>{rm.name}</TableCell>
                {shownDates.map((d) => {
                  if (!activeSet.has(cellKey(d, rm.uuid))) {
                    return <TableCell key={d} sx={{ bgcolor: 'action.hover' }}><span style={{ opacity: 0.3 }}>—</span></TableCell>;
                  }
                  const list = cellAssignments.get(cellKey(d, rm.uuid)) || [];
                  const conflict = conflictCells.has(cellKey(d, rm.uuid));
                  const submitted = submittedSet.has(cellKey(d, rm.uuid));
                  const locked = (submitted || d < todayIso()) && !isGod;
                  return (
                    <TableCell key={d} sx={{ bgcolor: conflict ? 'warning.light' : undefined }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                        {list.map((a, i) => <Chip key={i} size="small" variant="outlined" label={invLabel(a)} />)}
                        {!list.length && <Typography variant="caption" color="text.secondary">Unassigned</Typography>}
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {canManage && !locked && (
                          <Button size="small" startIcon={<PeopleIcon fontSize="small" />}
                            onClick={() => setManage({ roomId: rm.uuid, roomName: rm.name, date: d, current: list })}>
                            {list.length ? 'Manage' : 'Assign'}
                          </Button>
                        )}
                        {locked && <Tooltip title="Locked (submitted or day passed)"><LockIcon fontSize="small" color="disabled" /></Tooltip>}
                        {submitted && <Tooltip title="Roster submitted"><DoneIcon fontSize="small" color="success" /></Tooltip>}
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Open room roster (mark + sign)">
                          <IconButton size="small" onClick={() => navigate(`/examinations/${examId}/room-roster/${rm.uuid}/${d}`)}>
                            <RosterIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {focusDate && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Relievers · {fmtDate(focusDate)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            A day pool that covers invigilators' breaks — they aren't tied to a room and don't sign anything.
          </Typography>
          <Autocomplete
            multiple size="small" options={relieverOptions} getOptionLabel={(o) => o.name || ''}
            value={relieverValue} disabled={!canManage || saving || dayLocked}
            onChange={(_, v) => saveRelievers(v.map((x) => x.uuid))}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            renderInput={(p) => <TextField {...p} placeholder={relieverValue.length ? '' : 'Add relievers…'} />}
          />
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Free that day ({freeTeachers.length}) — not on a room or in the pool{canManage && !dayLocked ? '; tap to add as a reliever' : ''}:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {freeTeachers.map((e) => (
              <Chip key={e.uuid} size="small" variant="outlined" label={e.name}
                onClick={canManage && !dayLocked ? () => saveRelievers([...relieverIds, e.uuid]) : undefined} />
            ))}
            {!freeTeachers.length && <Typography variant="caption" color="text.secondary">Everyone is assigned or relieving.</Typography>}
          </Box>
        </Paper>
      )}

      {canManage && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Grey = no section sits that day. Use <b>Manage</b> to assign one or more teachers per room (add shifts + times). A ✓ means that room's roster is submitted (and locked).
        </Typography>
      )}

      <ManageRoomInvigilatorsDialog
        open={!!manage} onClose={() => setManage(null)}
        examId={examId} date={manage?.date} roomId={manage?.roomId} roomName={manage?.roomName}
        current={manage?.current || []}
        dayAssignments={(view.assignments || []).filter((a) => a.examDate === manage?.date)}
        employees={employees}
        onSaved={(v) => { setView(v); setMsg('Saved.'); }}
      />
    </Box>
  );
}
