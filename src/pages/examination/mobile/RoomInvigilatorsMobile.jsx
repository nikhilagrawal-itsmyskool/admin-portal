import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, Alert, CircularProgress, Paper, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField,
} from '@mui/material';
import { Warning as WarnIcon, HowToReg as RosterIcon, CheckCircle as DoneIcon, Lock as LockIcon } from '@mui/icons-material';
import { useCan } from '../../../permissions/can';
import { useAuth } from '../../../context/AuthContext';
import { examinationService } from '../../../services/examinationService';
import { employeeService } from '../../../services/employeeService';
import { todayIso } from '../../../utils/date';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');
const key = (d, r) => `${d}|${r}`;
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase();

// Default to today's exam day, else the next upcoming, else the most recent.
const pickDefaultDate = (dates) => {
  if (!dates?.length) return '';
  const today = todayIso();
  if (dates.includes(today)) return today;
  const upcoming = dates.filter((d) => d >= today).sort()[0];
  return upcoming || dates[dates.length - 1];
};

// Phone room-invigilator assignment: pick a date, see the rooms active that day as cards,
// tap to assign a teacher (auto-saves), and open the room roster to mark + submit. Submitted
// room-days are ticked + locked (god excepted); a per-day "X/Y signed" tally sits up top.
export default function RoomInvigilatorsMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useCan()('exam.manage');
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');

  const [view, setView] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState('');
  const [map, setMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pick, setPick] = useState(null); // { roomId, name }

  const applyView = (v) => {
    setView(v);
    const m = {}; (v.assignments || []).forEach((a) => { m[key(a.examDate, a.roomId)] = a.employeeId; });
    setMap(m);
  };

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getRoomInvigilators(id);
      applyView(v);
      setDate((cur) => cur || pickDefaultDate(v.dates));
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load room invigilators'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { employeeService.searchEmployees({}).then(setEmployees).catch(() => setEmployees([])); }, []);

  const empById = useMemo(() => Object.fromEntries((employees || []).map((e) => [e.uuid, e])), [employees]);
  const roomById = useMemo(() => Object.fromEntries((view?.rooms || []).map((r) => [r.uuid, r])), [view]);
  const activeRooms = useMemo(() => (view && date ? (view.activeByDate?.[date] || []) : []), [view, date]);
  const submittedSet = useMemo(() => new Set((view?.submitted || []).map((s) => key(s.examDate, s.roomId))), [view]);

  const datePassed = date && date < todayIso();
  const isLocked = (rid) => !isGod && (datePassed || submittedSet.has(key(date, rid)));
  const signedCount = activeRooms.filter((rid) => submittedSet.has(key(date, rid))).length;

  const conflictSet = useMemo(() => {
    const seen = {}; const bad = new Set();
    activeRooms.forEach((rid) => { const e = map[key(date, rid)]; if (e) (seen[e] ||= []).push(rid); });
    Object.values(seen).forEach((arr) => { if (arr.length > 1) arr.forEach((rid) => bad.add(rid)); });
    return bad;
  }, [activeRooms, map, date]);

  // Assign/clear a room and auto-save the day at once (no Save button).
  const onAssign = async (roomId, empId) => {
    if (isLocked(roomId)) return;
    const next = { ...map };
    if (empId) next[key(date, roomId)] = empId; else delete next[key(date, roomId)];
    setMap(next);
    setSaving(true); setErr(''); setMsg('');
    try {
      const assignments = activeRooms.map((rid) => ({ roomId: rid, employeeId: next[key(date, rid)] })).filter((a) => a.employeeId);
      applyView(await examinationService.saveRoomInvigilatorsForDate(id, date, assignments));
      setMsg('Saved.');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save'); await load(); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!view) return <Alert severity="error">{err || 'Not found'}</Alert>;
  if (!view.rooms.length) return <Alert severity="info">Set up the seating rooms first, then assign invigilators.</Alert>;
  if (!view.dates.length) return <Alert severity="info">Add the datesheet first.</Alert>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>Room Invigilators</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {view.dates.map((d) => (
          <Chip key={d} label={`${dayOf(d)} ${d.slice(8, 10)}`} onClick={() => setDate(d)}
            color={d === date ? 'primary' : 'default'} variant={d === date ? 'filled' : 'outlined'} />
        ))}
      </Box>

      {activeRooms.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 600, color: signedCount === activeRooms.length ? 'success.main' : 'text.secondary' }}>
          {signedCount}/{activeRooms.length} rooms signed{datePassed && !isGod ? ' · day locked' : ''}
        </Typography>
      )}
      {conflictSet.size > 0 && <Alert severity="warning" icon={<WarnIcon />} sx={{ mb: 1.5 }}>A teacher is on more than one room this day.</Alert>}

      <Stack spacing={1}>
        {activeRooms.map((rid) => {
          const rm = roomById[rid]; const empId = map[key(date, rid)]; const emp = empId ? empById[empId] : null;
          const conflict = conflictSet.has(rid);
          const submitted = submittedSet.has(key(date, rid));
          const locked = isLocked(rid);
          return (
            <Paper key={rid} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.25, borderColor: conflict ? 'warning.main' : 'divider' }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: emp ? 'primary.light' : 'action.hover', color: emp ? '#fff' : 'text.secondary' }}>
                {emp ? initials(emp.name) : (rm?.name || '?').slice(0, 2)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => canManage && !locked && setPick({ roomId: rid, name: rm?.name })}>
                <Typography sx={{ fontWeight: 700 }}>Room {rm?.name}</Typography>
                <Typography variant="caption" color={conflict ? 'warning.main' : 'text.secondary'} noWrap>
                  {emp ? emp.name : (locked ? '—' : 'Tap to assign')}{conflict ? ' · double-booked' : ''}
                </Typography>
              </Box>
              {submitted && (locked
                ? <LockIcon fontSize="small" color="disabled" titleAccess="Submitted — locked" />
                : <DoneIcon fontSize="small" color="success" titleAccess="Submitted" />)}
              <Button size="small" startIcon={<RosterIcon />} onClick={() => navigate(`/examinations/${id}/room-roster/${rid}/${date}`)}>Roster</Button>
            </Paper>
          );
        })}
        {!activeRooms.length && <Typography color="text.secondary" sx={{ py: 1 }}>No rooms are used on this day.</Typography>}
      </Stack>
      {canManage && activeRooms.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {saving ? 'Saving…' : 'Tap a room to assign — changes save automatically. A ✓ means its roster is submitted (and locked).'}
        </Typography>
      )}

      <Dialog open={!!pick} onClose={() => setPick(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Invigilator · Room {pick?.name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }} options={employees} getOptionLabel={(o) => o.name || ''}
            value={pick ? (empById[map[key(date, pick.roomId)]] || null) : null}
            onChange={(_, v) => { const rid = pick.roomId; setPick(null); onAssign(rid, v ? v.uuid : null); }}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            renderInput={(p) => <TextField {...p} autoFocus label="Teacher" placeholder="Search…" />}
          />
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => { const rid = pick.roomId; setPick(null); onAssign(rid, null); }}>Clear</Button>
          <Button onClick={() => setPick(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
