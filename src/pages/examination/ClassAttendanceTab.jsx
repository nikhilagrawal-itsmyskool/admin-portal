import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Stack, TextField, MenuItem, Autocomplete, Alert, CircularProgress, Button, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, ToggleButton, ToggleButtonGroup, Typography, Paper,
} from '@mui/material';
import { examinationService } from '../../services/examinationService';
import { fmtDate, todayIso } from '../../utils/date';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');
const pickDefaultDate = (dates) => {
  if (!dates?.length) return '';
  const today = todayIso();
  if (dates.includes(today)) return today;
  return dates.filter((d) => d >= today).sort()[0] || dates[dates.length - 1];
};

// Exam-incharge cross-verify sheet: pick a class + date → mark/correct the whole class's
// present/absent centrally (teachers only sign their rooms). Reads/writes the same attendance
// the rooms use. Desktop-only (lives in the exam's tabs) to keep the teacher PWA lean.
export default function ClassAttendanceTab({ examId, canManage }) {
  const [sections, setSections] = useState([]);
  const [dates, setDates] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState('');
  const [sheet, setSheet] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    examinationService.getInvigilators(examId)
      .then((v) => { setSections(v.sections || []); setDates(v.dates || []); setDate((cur) => cur || pickDefaultDate(v.dates || [])); })
      .catch((e) => setErr(e.response?.data?.error?.description || 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, [examId]);

  const loadSheet = useCallback(async () => {
    if (!sectionId || !date) { setSheet(null); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const s = await examinationService.classAttendance(examId, sectionId, date);
      setSheet(s);
      const m = {}; (s.students || []).forEach((st) => { m[st.studentId] = st.status || 'present'; });
      setStatusMap(m);
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load attendance'); }
    finally { setBusy(false); }
  }, [examId, sectionId, date]);
  useEffect(() => { loadSheet(); }, [loadSheet]);

  const setStatus = (sid, v) => { if (v) setStatusMap((m) => ({ ...m, [sid]: v })); };
  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const marks = (sheet.students || []).map((s) => ({ studentId: s.studentId, status: statusMap[s.studentId] || 'present' }));
      const s = await examinationService.markClassAttendance(examId, sectionId, date, marks);
      setSheet(s);
      const m = {}; (s.students || []).forEach((st) => { m[st.studentId] = st.status || 'present'; });
      setStatusMap(m);
      setMsg('Attendance saved.');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save attendance'); }
    finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  const present = (sheet?.students || []).filter((s) => (statusMap[s.studentId] || 'present') === 'present').length;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Cross-verify a class's present/absent for a date — filled centrally by the incharge; teachers only sign their rooms.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Autocomplete
          size="small" sx={{ minWidth: 220 }} options={sections} getOptionLabel={(o) => o.name || ''}
          value={sections.find((s) => s.classId === sectionId) || null}
          onChange={(_, v) => setSectionId(v ? v.classId : '')}
          isOptionEqualToValue={(o, v) => o.classId === v.classId}
          renderInput={(p) => <TextField {...p} label="Class" />}
        />
        <TextField select size="small" sx={{ minWidth: 200 }} label="Date" value={date} onChange={(e) => setDate(e.target.value)}>
          {dates.map((d) => <MenuItem key={d} value={d}>{fmtDate(d)} · {dayOf(d)}</MenuItem>)}
        </TextField>
      </Stack>

      {!sectionId ? (
        <Alert severity="info">Pick a class to view its attendance.</Alert>
      ) : busy && !sheet ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : !sheet?.paper ? (
        <Alert severity="info">This class has no paper on {fmtDate(date)}.</Alert>
      ) : (
        <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{sheet.section?.name} · {sheet.paper?.subjectLabel}</Typography>
            <Chip size="small" color="success" variant="outlined" label={`${present} present`} />
            <Chip size="small" color="error" variant="outlined" label={`${sheet.total - present} absent`} />
            <Box sx={{ flex: 1 }} />
            {canManage && <Button variant="contained" onClick={save} disabled={busy}>Save attendance</Button>}
          </Stack>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Present / Absent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(sheet.students || []).map((s) => (
                  <TableRow key={s.studentId} hover>
                    <TableCell>
                      {s.name}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {[s.rollNumber != null ? `Roll ${s.rollNumber}` : null, s.admissionNumber].filter(Boolean).join(' · ')}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{s.roomName || '—'}</Typography></TableCell>
                    <TableCell align="right">
                      <ToggleButtonGroup exclusive size="small" value={statusMap[s.studentId] || 'present'} disabled={!canManage || busy}
                        onChange={(_, v) => setStatus(s.studentId, v)}>
                        <ToggleButton value="present" color="success" sx={{ px: 1.5, py: 0.25 }}>P</ToggleButton>
                        <ToggleButton value="absent" color="error" sx={{ px: 1.5, py: 0.25 }}>A</ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                  </TableRow>
                ))}
                {!(sheet.students || []).length && (
                  <TableRow><TableCell colSpan={3}><Typography color="text.secondary" sx={{ py: 1 }}>No students in this class.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
