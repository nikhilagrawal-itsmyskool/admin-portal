import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, Alert, CircularProgress, Paper, Avatar, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField,
  ToggleButton, ToggleButtonGroup, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Warning as WarnIcon } from '@mui/icons-material';
import { useCan } from '../../../permissions/can';
import { examinationService } from '../../../services/examinationService';
import { employeeService } from '../../../services/employeeService';
import { fmtDate } from '../../../utils/date';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');
const key = (d, s) => `${d}|${s}`;
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase();

export default function InvigilatorsMobile() {
  const { id } = useParams();
  const canManage = useCan()('exam.manage');

  const [view, setView] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState('');
  const [map, setMap] = useState({}); // key(d,s) -> employeeId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pick, setPick] = useState(null); // { sectionClassId, name }
  const [tab, setTab] = useState('assign'); // assign (per-day) | sheet (full wide sheet, inline)

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getInvigilators(id);
      setView(v);
      setDate((cur) => cur || v.dates?.[0] || '');
      const m = {};
      (v.assignments || []).forEach((a) => { m[key(a.examDate, a.sectionClassId)] = a.employeeId; });
      setMap(m);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load invigilators');
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { employeeService.searchEmployees({}).then(setEmployees).catch(() => setEmployees([])); }, []);

  const empById = useMemo(() => Object.fromEntries((employees || []).map((e) => [e.uuid, e])), [employees]);

  const sectionsForDate = useMemo(() => {
    if (!view || !date) return [];
    const grades = view.gradesByDate?.[date] || [];
    return view.sections.filter((s) => grades.includes(s.grade));
  }, [view, date]);

  // Live conflicts for the current date (same teacher, >1 room).
  const conflictSet = useMemo(() => {
    const seen = {}; const bad = new Set();
    sectionsForDate.forEach((s) => { const e = map[key(date, s.classId)]; if (e) (seen[e] ||= []).push(s.classId); });
    Object.values(seen).forEach((arr) => { if (arr.length > 1) arr.forEach((sid) => bad.add(sid)); });
    return bad;
  }, [sectionsForDate, map, date]);

  const setEmp = (sectionClassId, empId) => setMap((m) => {
    const n = { ...m }; if (empId) n[key(date, sectionClassId)] = empId; else delete n[key(date, sectionClassId)]; return n;
  });

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const assignments = sectionsForDate
        .map((s) => ({ sectionClassId: s.classId, employeeId: map[key(date, s.classId)] }))
        .filter((a) => a.employeeId);
      const v = await examinationService.saveInvigilatorsForDate(id, date, assignments);
      setView(v);
      const m = {};
      (v.assignments || []).forEach((a) => { m[key(a.examDate, a.sectionClassId)] = a.employeeId; });
      setMap(m);
      setMsg(`Saved ${fmtDate(date)}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!view) return <Alert severity="error">{err || 'Not found'}</Alert>;

  const hasConflict = conflictSet.size > 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">Invigilators</Typography>
        {view.dates.length > 0 && (
          <ToggleButtonGroup exclusive size="small" value={tab} onChange={(_, v) => v && setTab(v)}>
            <ToggleButton value="assign" sx={{ px: 1.25, py: 0.3 }}>Assign</ToggleButton>
            <ToggleButton value="sheet" sx={{ px: 1.25, py: 0.3 }}>Full sheet</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {!view.dates.length ? (
        <Alert severity="info">Add the datesheet first — invigilators are assigned per exam day.</Alert>
      ) : tab === 'sheet' ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 160 + view.dates.length * 120, '& th,& td': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                {view.dates.map((d) => <TableCell key={d} sx={{ fontWeight: 700 }}>{`${dayOf(d)} ${d.slice(8, 10)}`}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {view.sections.map((s) => (
                <TableRow key={s.classId}>
                  <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                  {view.dates.map((d) => {
                    const assignable = (view.gradesByDate?.[d] || []).includes(s.grade);
                    const e = map[key(d, s.classId)];
                    return <TableCell key={d} sx={{ bgcolor: assignable ? undefined : 'action.hover' }}>{assignable ? (empById[e]?.name || '—') : ''}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
            {view.dates.map((d) => (
              <Chip key={d} label={`${dayOf(d)} ${d.slice(8, 10)}`} onClick={() => setDate(d)}
                color={d === date ? 'primary' : 'default'} variant={d === date ? 'filled' : 'outlined'} />
            ))}
          </Box>
          {hasConflict && (
            <Alert severity="warning" icon={<WarnIcon />} sx={{ mb: 1.5 }}>A teacher is on more than one room this day.</Alert>
          )}
          <Stack spacing={1}>
            {sectionsForDate.map((s) => {
              const empId = map[key(date, s.classId)];
              const emp = empId ? empById[empId] : null;
              const conflict = conflictSet.has(s.classId);
              return (
                <Paper key={s.classId} variant="outlined"
                  sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.25, borderColor: conflict ? 'warning.main' : 'divider' }}
                  onClick={() => canManage && setPick({ sectionClassId: s.classId, name: s.name })}>
                  <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: emp ? 'primary.light' : 'action.hover', color: emp ? '#fff' : 'text.secondary' }}>
                    {emp ? initials(emp.name) : s.grade}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                    <Typography variant="caption" color={conflict ? 'warning.main' : 'text.secondary'} noWrap>
                      {emp ? emp.name : 'Tap to assign'}{conflict ? ' · double-booked' : ''}
                    </Typography>
                  </Box>
                  {canManage && (emp
                    ? <Chip size="small" variant="outlined" label="Change" />
                    : <Chip size="small" color="primary" variant="outlined" label="Assign" />)}
                </Paper>
              );
            })}
            {!sectionsForDate.length && <Typography color="text.secondary" sx={{ py: 1 }}>No exam sections on this day.</Typography>}
            {canManage && sectionsForDate.length > 0 && (
              <Button variant="contained" onClick={save} disabled={saving}>Save {dayOf(date)} {date.slice(8, 10)}</Button>
            )}
          </Stack>
        </>
      )}

      {/* Employee picker */}
      <Dialog open={!!pick} onClose={() => setPick(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Invigilator · {pick?.name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }} options={employees} getOptionLabel={(o) => o.name || ''}
            value={pick ? (empById[map[key(date, pick.sectionClassId)]] || null) : null}
            onChange={(_, v) => { setEmp(pick.sectionClassId, v ? v.uuid : null); setPick(null); }}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            renderInput={(p) => <TextField {...p} autoFocus label="Teacher" placeholder="Search…" />}
          />
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => { setEmp(pick.sectionClassId, null); setPick(null); }}>Clear</Button>
          <Button onClick={() => setPick(null)}>Done</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
