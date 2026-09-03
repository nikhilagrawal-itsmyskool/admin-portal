import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Alert, CircularProgress, Stack, Autocomplete, TextField, Paper, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Typography,
} from '@mui/material';
import { Save as SaveIcon, HowToReg as RosterIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';

const cellKey = (date, roomId) => `${date}|${roomId}`;
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOf = (d) => DOW[new Date(`${d}T00:00:00`).getDay()];

// Per-(room, date) invigilator assignment for a seating-room exam. A cell is assignable
// only when the room is active that date (a section in it has a paper). Open the roster
// from any active cell to mark attendance + sign the room for that day.
export default function RoomInvigilatorGrid({ examId, canManage, employees }) {
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [map, setMap] = useState({}); // cellKey -> employeeId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getRoomInvigilators(examId);
      setView(v);
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

  const setCell = (date, roomId, empId) => setMap((m) => {
    const next = { ...m };
    if (empId) next[cellKey(date, roomId)] = empId; else delete next[cellKey(date, roomId)];
    return next;
  });

  const saveDate = async (date) => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const assignments = view.rooms
        .filter((rm) => activeSet.has(cellKey(date, rm.uuid)))
        .map((rm) => ({ roomId: rm.uuid, employeeId: map[cellKey(date, rm.uuid)] }))
        .filter((a) => a.employeeId);
      const v = await examinationService.saveRoomInvigilatorsForDate(examId, date, assignments);
      setView(v);
      const m = {};
      for (const a of v.assignments || []) m[cellKey(a.examDate, a.roomId)] = a.employeeId;
      setMap(m);
      setMsg(`Saved ${fmtDate(date)}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setSaving(false); }
  };

  const saveAll = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      for (const d of view.dates) {
        const assignments = view.rooms
          .filter((rm) => activeSet.has(cellKey(d, rm.uuid)))
          .map((rm) => ({ roomId: rm.uuid, employeeId: map[cellKey(d, rm.uuid)] }))
          .filter((a) => a.employeeId);
        await examinationService.saveRoomInvigilatorsForDate(examId, d, assignments);
      }
      await load();
      setMsg('All invigilators saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!view) return <Alert severity="error">{err || 'Failed to load'}</Alert>;
  if (!view.rooms.length) return <Alert severity="info">Set up the seating rooms first (Seating tab), then assign invigilators per room.</Alert>;
  if (!view.dates.length) return <Alert severity="info">Add the datesheet first — invigilators are assigned per exam date.</Alert>;

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {conflictCells.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>A teacher is assigned to more than one room on the same day (highlighted). Allowed, but double-check.</Alert>
      )}

      <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: 2 }}>
        <Table size="small" sx={{
          minWidth: 160 + view.dates.length * 220,
          '& thead th': { bgcolor: 'action.hover', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', borderBottom: 2, borderColor: 'divider' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 140, position: 'sticky', left: 0, bgcolor: 'action.hover !important', zIndex: 2 }}>Room</TableCell>
              {view.dates.map((d) => (
                <TableCell key={d} sx={{ minWidth: 210, lineHeight: 1.25 }}>
                  {fmtDate(d)}
                  <Typography variant="caption" display="block" color="primary.main" sx={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{dayOf(d)}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {view.rooms.map((rm) => (
              <TableRow key={rm.uuid} sx={{ '& td': { height: 58, py: 1 } }}>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 600 }}>{rm.name}</TableCell>
                {view.dates.map((d) => {
                  if (!activeSet.has(cellKey(d, rm.uuid))) {
                    return <TableCell key={d} sx={{ bgcolor: 'action.hover' }}><span style={{ opacity: 0.3 }}>—</span></TableCell>;
                  }
                  const empId = map[cellKey(d, rm.uuid)] || null;
                  const conflict = conflictCells.has(cellKey(d, rm.uuid));
                  return (
                    <TableCell key={d} sx={{ bgcolor: conflict ? 'warning.light' : undefined }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Autocomplete
                          size="small" sx={{ flex: 1 }} options={employees || []} getOptionLabel={(o) => o.name || ''}
                          value={empId ? (empById[empId] || null) : null}
                          disabled={!canManage}
                          onChange={(_, v) => setCell(d, rm.uuid, v ? v.uuid : null)}
                          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                          renderInput={(p) => <TextField {...p} placeholder="Assign…" />}
                        />
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

      {canManage && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
          <Typography variant="caption" color="text.secondary">Grey cells = no section in that room sits that day.</Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveAll} disabled={saving}>Save invigilators</Button>
        </Stack>
      )}
    </Box>
  );
}
