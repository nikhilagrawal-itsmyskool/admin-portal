import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Alert, CircularProgress, Stack, Autocomplete, TextField, Paper, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Typography, MenuItem, Chip, Divider,
} from '@mui/material';
import { HowToReg as RosterIcon, CheckCircle as DoneIcon, Lock as LockIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, todayIso } from '../../utils/date';

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

// Per-(room, date) invigilator assignment for a seating-room exam. A cell is assignable
// only when the room is active that date (a section in it has a paper). Open the roster
// from any active cell to mark attendance + sign the room for that day.
export default function RoomInvigilatorGrid({ examId, canManage, employees }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');
  const [view, setView] = useState(null);
  const [map, setMap] = useState({}); // cellKey -> employeeId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [focusDate, setFocusDate] = useState(''); // '' = all days; else assign just that day's active rooms

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getRoomInvigilators(examId);
      setView(v);
      setFocusDate((cur) => cur || pickDefaultDate(v.dates));
      const m = {};
      for (const a of v.assignments || []) m[cellKey(a.examDate, a.roomId)] = a.employeeId;
      setMap(m);
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

  // Submitted (signed) room-days — the completion board. A submitted cell is ticked and its
  // invigilator is locked (except for god).
  const submittedSet = useMemo(() => {
    const s = new Set();
    if (view) for (const x of (view.submitted || [])) s.add(cellKey(x.examDate, x.roomId));
    return s;
  }, [view]);

  const conflictCells = useMemo(() => {
    const set = new Set();
    if (!view) return set;
    for (const date of view.dates) {
      const seen = {};
      for (const rm of view.rooms) {
        const emp = map[cellKey(date, rm.uuid)];
        if (emp) (seen[emp] ||= []).push(rm.uuid);
      }
      for (const emp of Object.keys(seen)) if (seen[emp].length > 1) seen[emp].forEach((rid) => set.add(cellKey(date, rid)));
    }
    return set;
  }, [view, map]);

  // Assign/clear a cell and auto-save that day at once — no Save button, so the grid never
  // shows a stale "unsaved" state. A submitted room is locked (god excepted). On failure we
  // reload to the server's truth.
  const onAssign = async (date, roomId, empId) => {
    if (submittedSet.has(cellKey(date, roomId)) && !isGod) return;
    const next = { ...map };
    if (empId) next[cellKey(date, roomId)] = empId; else delete next[cellKey(date, roomId)];
    setMap(next);
    setSaving(true); setErr(''); setMsg('');
    try {
      const assignments = view.rooms
        .filter((rm) => activeSet.has(cellKey(date, rm.uuid)))
        .map((rm) => ({ roomId: rm.uuid, employeeId: next[cellKey(date, rm.uuid)] }))
        .filter((a) => a.employeeId);
      const v = await examinationService.saveRoomInvigilatorsForDate(examId, date, assignments);
      setView(v);
      const m = {};
      for (const a of v.assignments || []) m[cellKey(a.examDate, a.roomId)] = a.employeeId;
      setMap(m);
      setMsg('Saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
      await load();
    } finally { setSaving(false); }
  };

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

  // Date focus: assignment usually happens a day before, so narrow to one day and show
  // only the rooms actually used that day (the sections sitting then).
  const shownDates = focusDate ? [focusDate] : view.dates;
  const shownRooms = focusDate ? view.rooms.filter((rm) => activeSet.has(cellKey(focusDate, rm.uuid))) : view.rooms;

  // Per-day completion: how many of the active rooms have a submitted roster.
  const dayTally = (d) => {
    const active = view.activeByDate?.[d] || [];
    return { signed: active.filter((rid) => submittedSet.has(cellKey(d, rid))).length, total: active.length };
  };

  // Relievers + free teachers for the focused day (the panel only shows when a day is focused).
  const relievers = focusDate ? (view.relieversByDate?.[focusDate] || []) : [];
  const relieverIds = new Set(relievers.map((r) => r.employeeId));
  const assignedForDay = new Set((focusDate ? (view.activeByDate?.[focusDate] || []) : []).map((rid) => map[cellKey(focusDate, rid)]).filter(Boolean));
  const relieverValue = relievers.map((r) => empById[r.employeeId] || { uuid: r.employeeId, name: r.employeeName });
  const relieverOptions = (employees || []).filter((e) => !assignedForDay.has(e.uuid));
  const freeTeachers = (employees || []).filter((e) => !assignedForDay.has(e.uuid) && !relieverIds.has(e.uuid));
  const dayLocked = !isGod && focusDate && focusDate < todayIso();

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {conflictCells.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>A teacher is assigned to more than one room on the same day (highlighted). Allowed, but double-check.</Alert>
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
          minWidth: 160 + shownDates.length * 220,
          '& thead th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', borderBottom: 2, borderColor: 'divider' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 140, position: 'sticky', left: 0, bgcolor: 'action.hover !important', zIndex: 2 }}>Room</TableCell>
              {shownDates.map((d) => {
                const t = dayTally(d);
                return (
                  <TableCell key={d} sx={{ minWidth: 210, lineHeight: 1.25 }}>
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
              <TableRow key={rm.uuid} sx={{ '& td': { height: 58, py: 1 } }}>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 600 }}>{rm.name}</TableCell>
                {shownDates.map((d) => {
                  if (!activeSet.has(cellKey(d, rm.uuid))) {
                    return <TableCell key={d} sx={{ bgcolor: 'action.hover' }}><span style={{ opacity: 0.3 }}>—</span></TableCell>;
                  }
                  const empId = map[cellKey(d, rm.uuid)] || null;
                  const conflict = conflictCells.has(cellKey(d, rm.uuid));
                  const submitted = submittedSet.has(cellKey(d, rm.uuid));
                  const locked = (submitted || d < todayIso()) && !isGod;
                  return (
                    <TableCell key={d} sx={{ bgcolor: conflict ? 'warning.light' : undefined }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Autocomplete
                          size="small" sx={{ flex: 1 }} options={employees || []} getOptionLabel={(o) => o.name || ''}
                          value={empId ? (empById[empId] || null) : null}
                          disabled={!canManage || saving || locked}
                          onChange={(_, v) => onAssign(d, rm.uuid, v ? v.uuid : null)}
                          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                          renderInput={(p) => <TextField {...p} placeholder="Assign…" />}
                        />
                        {submitted && (
                          <Tooltip title={locked ? 'Roster submitted — reassignment locked (god only)' : 'Roster submitted'}>
                            {locked ? <LockIcon fontSize="small" color="disabled" /> : <DoneIcon fontSize="small" color="success" />}
                          </Tooltip>
                        )}
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
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Grey = no section sits that day. Changes save automatically; a ✓ means that room's roster is submitted (and locked).
          </Typography>
          <Box sx={{ flex: 1 }} />
          {saving && <><CircularProgress size={14} /><Typography variant="caption" color="text.secondary">Saving…</Typography></>}
        </Stack>
      )}
    </Box>
  );
}
