import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, Alert, CircularProgress, Paper, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField,
} from '@mui/material';
import { Warning as WarnIcon, HowToReg as RosterIcon } from '@mui/icons-material';
import { useCan } from '../../../permissions/can';
import { examinationService } from '../../../services/examinationService';
import { employeeService } from '../../../services/employeeService';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');
const key = (d, r) => `${d}|${r}`;
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase();

// Phone room-invigilator assignment: pick a date, see the rooms active that day as cards,
// tap to assign a teacher, and open the room roster to mark + sign.
export default function RoomInvigilatorsMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useCan()('exam.manage');

  const [view, setView] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState('');
  const [map, setMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pick, setPick] = useState(null); // { roomId, name }

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getRoomInvigilators(id);
      setView(v);
      setDate((cur) => cur || v.dates?.[0] || '');
      const m = {}; (v.assignments || []).forEach((a) => { m[key(a.examDate, a.roomId)] = a.employeeId; });
      setMap(m);
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load room invigilators'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { employeeService.searchEmployees({}).then(setEmployees).catch(() => setEmployees([])); }, []);

  const empById = useMemo(() => Object.fromEntries((employees || []).map((e) => [e.uuid, e])), [employees]);
  const roomById = useMemo(() => Object.fromEntries((view?.rooms || []).map((r) => [r.uuid, r])), [view]);
  const activeRooms = useMemo(() => (view && date ? (view.activeByDate?.[date] || []) : []), [view, date]);

  const conflictSet = useMemo(() => {
    const seen = {}; const bad = new Set();
    activeRooms.forEach((rid) => { const e = map[key(date, rid)]; if (e) (seen[e] ||= []).push(rid); });
    Object.values(seen).forEach((arr) => { if (arr.length > 1) arr.forEach((rid) => bad.add(rid)); });
    return bad;
  }, [activeRooms, map, date]);

  const setEmp = (roomId, empId) => setMap((m) => {
    const n = { ...m }; if (empId) n[key(date, roomId)] = empId; else delete n[key(date, roomId)]; return n;
  });

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const assignments = activeRooms.map((rid) => ({ roomId: rid, employeeId: map[key(date, rid)] })).filter((a) => a.employeeId);
      const v = await examinationService.saveRoomInvigilatorsForDate(id, date, assignments);
      setView(v);
      const m = {}; (v.assignments || []).forEach((a) => { m[key(a.examDate, a.roomId)] = a.employeeId; });
      setMap(m);
      setMsg('Saved.');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save'); }
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

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
        {view.dates.map((d) => (
          <Chip key={d} label={`${dayOf(d)} ${d.slice(8, 10)}`} onClick={() => setDate(d)}
            color={d === date ? 'primary' : 'default'} variant={d === date ? 'filled' : 'outlined'} />
        ))}
      </Box>
      {conflictSet.size > 0 && <Alert severity="warning" icon={<WarnIcon />} sx={{ mb: 1.5 }}>A teacher is on more than one room this day.</Alert>}

      <Stack spacing={1}>
        {activeRooms.map((rid) => {
          const rm = roomById[rid]; const empId = map[key(date, rid)]; const emp = empId ? empById[empId] : null;
          const conflict = conflictSet.has(rid);
          return (
            <Paper key={rid} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.25, borderColor: conflict ? 'warning.main' : 'divider' }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: emp ? 'primary.light' : 'action.hover', color: emp ? '#fff' : 'text.secondary' }}>
                {emp ? initials(emp.name) : (rm?.name || '?').slice(0, 2)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => canManage && setPick({ roomId: rid, name: rm?.name })}>
                <Typography sx={{ fontWeight: 700 }}>Room {rm?.name}</Typography>
                <Typography variant="caption" color={conflict ? 'warning.main' : 'text.secondary'} noWrap>
                  {emp ? emp.name : 'Tap to assign'}{conflict ? ' · double-booked' : ''}
                </Typography>
              </Box>
              <Button size="small" startIcon={<RosterIcon />} onClick={() => navigate(`/examinations/${id}/room-roster/${rid}/${date}`)}>Roster</Button>
            </Paper>
          );
        })}
        {!activeRooms.length && <Typography color="text.secondary" sx={{ py: 1 }}>No rooms are used on this day.</Typography>}
        {canManage && activeRooms.length > 0 && (
          <Button variant="contained" onClick={save} disabled={saving}>Save {dayOf(date)} {date.slice(8, 10)}</Button>
        )}
      </Stack>

      <Dialog open={!!pick} onClose={() => setPick(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Invigilator · Room {pick?.name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }} options={employees} getOptionLabel={(o) => o.name || ''}
            value={pick ? (empById[map[key(date, pick.roomId)]] || null) : null}
            onChange={(_, v) => { setEmp(pick.roomId, v ? v.uuid : null); setPick(null); }}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            renderInput={(p) => <TextField {...p} autoFocus label="Teacher" placeholder="Search…" />}
          />
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => { setEmp(pick.roomId, null); setPick(null); }}>Clear</Button>
          <Button onClick={() => setPick(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
