import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, Alert, CircularProgress, Paper, Divider, Autocomplete, TextField,
} from '@mui/material';
import { Warning as WarnIcon, HowToReg as RosterIcon, CheckCircle as DoneIcon, Lock as LockIcon, People as PeopleIcon } from '@mui/icons-material';
import { useCan } from '../../../permissions/can';
import { useAuth } from '../../../context/AuthContext';
import { examinationService } from '../../../services/examinationService';
import { employeeService } from '../../../services/employeeService';
import { todayIso } from '../../../utils/date';
import ManageRoomInvigilatorsDialog from '../ManageRoomInvigilatorsDialog';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');
const key = (d, r) => `${d}|${r}`;

// One assignment as "Name · 09:00–10:00" (or shift label if no times).
const invLabel = (a) => {
  const time = a.fromTime && a.toTime ? `${a.fromTime}–${a.toTime}` : (a.fromTime || a.toTime || '');
  const tag = time || a.shiftLabel || '';
  return tag ? `${a.employeeName || '—'} · ${tag}` : (a.employeeName || '—');
};

const pickDefaultDate = (dates) => {
  if (!dates?.length) return '';
  const today = todayIso();
  if (dates.includes(today)) return today;
  return dates.filter((d) => d >= today).sort()[0] || dates[dates.length - 1];
};

// Phone room-invigilator screen: pick a day, see active rooms as cards; each room can have
// MULTIPLE invigilators (shift hand-offs) managed via a dialog. Open the roster to mark + sign.
export default function RoomInvigilatorsMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useCan()('exam.manage');
  const { user } = useAuth();
  const isGod = (user?.roles || []).some((r) => r === 'god' || r === 'exam-incharge');

  // Keep the selected day in the URL so returning from a roster (Back) lands on the SAME day.
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [manage, setManage] = useState(null); // { roomId, roomName, date, current }

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getRoomInvigilators(id);
      setView(v);
      setDate((cur) => cur || pickDefaultDate(v.dates));
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load room invigilators'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { employeeService.searchEmployees({}).then(setEmployees).catch(() => setEmployees([])); }, []);
  useEffect(() => { if (date && searchParams.get('date') !== date) setSearchParams({ date }, { replace: true }); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const empById = useMemo(() => Object.fromEntries((employees || []).map((e) => [e.uuid, e])), [employees]);
  const roomById = useMemo(() => Object.fromEntries((view?.rooms || []).map((r) => [r.uuid, r])), [view]);
  const activeRooms = useMemo(() => (view && date ? (view.activeByDate?.[date] || []) : []), [view, date]);
  const submittedSet = useMemo(() => new Set((view?.submitted || []).map((s) => key(s.examDate, s.roomId))), [view]);
  const conflictSet = useMemo(() => {
    const s = new Set();
    (view?.conflicts || []).filter((c) => c.examDate === date).forEach((c) => c.roomIds.forEach((rid) => s.add(rid)));
    return s;
  }, [view, date]);
  const forRoom = (rid) => (view?.assignments || []).filter((a) => a.examDate === date && a.roomId === rid);

  const datePassed = date && date < todayIso();
  const isLocked = (rid) => !isGod && (datePassed || submittedSet.has(key(date, rid)));
  const signedCount = activeRooms.filter((rid) => submittedSet.has(key(date, rid))).length;

  const saveRelievers = async (ids) => {
    setSaving(true); setErr(''); setMsg('');
    try { setView(await examinationService.saveRelieversForDate(id, date, ids)); setMsg('Relievers saved.'); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save relievers'); await load(); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!view) return <Alert severity="error">{err || 'Not found'}</Alert>;
  if (!view.rooms.length) return <Alert severity="info">Set up the seating rooms first, then assign invigilators.</Alert>;
  if (!view.dates.length) return <Alert severity="info">Add the datesheet first.</Alert>;

  const relievers = view.relieversByDate?.[date] || [];
  const relieverIds = new Set(relievers.map((r) => r.employeeId));
  const assignedForDay = new Set((view.assignments || []).filter((a) => a.examDate === date).map((a) => a.employeeId));
  const relieverValue = relievers.map((r) => empById[r.employeeId] || { uuid: r.employeeId, name: r.employeeName });
  const relieverOptions = (employees || []).filter((e) => !assignedForDay.has(e.uuid));
  const freeTeachers = (employees || []).filter((e) => !assignedForDay.has(e.uuid) && !relieverIds.has(e.uuid));
  const dayLocked = !isGod && datePassed;

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
          const rm = roomById[rid]; const list = forRoom(rid);
          const conflict = conflictSet.has(rid);
          const submitted = submittedSet.has(key(date, rid));
          const locked = isLocked(rid);
          return (
            <Paper key={rid} variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: conflict ? 'warning.main' : 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontWeight: 700, flex: 1 }}>Room {rm?.name}</Typography>
                {submitted && (locked
                  ? <LockIcon fontSize="small" color="disabled" titleAccess="Submitted — locked" />
                  : <DoneIcon fontSize="small" color="success" titleAccess="Submitted" />)}
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {list.map((a, i) => <Chip key={i} size="small" variant="outlined" label={invLabel(a)} />)}
                {!list.length && <Typography variant="caption" color="text.secondary">Unassigned</Typography>}
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {canManage && !locked && (
                  <Button size="small" startIcon={<PeopleIcon />}
                    onClick={() => setManage({ roomId: rid, roomName: rm?.name, date, current: list })}>
                    {list.length ? 'Manage' : 'Assign'}
                  </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button size="small" startIcon={<RosterIcon />} onClick={() => navigate(`/examinations/${id}/room-roster/${rid}/${date}`)}>Roster</Button>
              </Stack>
            </Paper>
          );
        })}
        {!activeRooms.length && <Typography color="text.secondary" sx={{ py: 1 }}>No rooms are used on this day.</Typography>}
      </Stack>

      <Paper variant="outlined" sx={{ mt: 2, p: 1.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Relievers</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Break-cover pool for the day — not tied to a room, and they don't sign.
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
          Free today ({freeTeachers.length}){canManage && !dayLocked ? ' — tap to add' : ''}:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {freeTeachers.map((e) => (
            <Chip key={e.uuid} size="small" variant="outlined" label={e.name}
              onClick={canManage && !dayLocked ? () => saveRelievers([...relieverIds, e.uuid]) : undefined} />
          ))}
          {!freeTeachers.length && <Typography variant="caption" color="text.secondary">Everyone is assigned or relieving.</Typography>}
        </Box>
      </Paper>

      <ManageRoomInvigilatorsDialog
        open={!!manage} onClose={() => setManage(null)}
        examId={id} date={manage?.date} roomId={manage?.roomId} roomName={manage?.roomName}
        current={manage?.current || []}
        dayAssignments={(view.assignments || []).filter((a) => a.examDate === manage?.date)}
        employees={employees}
        onSaved={(v) => { setView(v); setMsg('Saved.'); }}
      />
    </Box>
  );
}
