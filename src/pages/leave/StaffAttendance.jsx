import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Alert, CircularProgress, Autocomplete, Grid, Card,
  CardContent, Button, MenuItem, Stack, Snackbar,
} from '@mui/material';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';
import { MonthAttendanceView, PenaltyCard, thisMonth } from './LeaveShared';
import { todayIso } from '../../utils/date';

const MARK_STATUSES = [
  { v: 'present', l: 'Present' }, { v: 'absent', l: 'Absent' },
  { v: 'holiday', l: 'Holiday' }, { v: 'off', l: 'Weekly off' },
];

export default function StaffAttendance() {
  const [options, setOptions] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [month, setMonth] = useState(thisMonth());
  const [att, setAtt] = useState(null);
  const [ded, setDed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Manual mark
  const [markDate, setMarkDate] = useState(todayIso());
  const [markStatus, setMarkStatus] = useState('present');
  const [firstIn, setFirstIn] = useState('');
  const [lastOut, setLastOut] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (name) => {
    if (!name || name.length < 2) return;
    try {
      const res = await employeeService.searchEmployees({ name });
      const list = Array.isArray(res) ? res : (res?.employees || res?.data || []);
      setOptions(list.map((e) => ({ uuid: e.uuid, name: e.name })));
    } catch { /* ignore */ }
  };

  const load = async () => {
    if (!employee) return;
    setLoading(true); setError('');
    try {
      const [a, d] = await Promise.all([
        leaveService.employeeAttendance(employee.uuid, month),
        leaveService.employeeDeductions(employee.uuid, month),
      ]);
      setAtt(a); setDed(d);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (employee) load(); /* eslint-disable-next-line */ }, [employee, month]);

  const mark = async () => {
    if (!employee) return;
    setBusy(true); setError('');
    try {
      await leaveService.markAttendance({
        employeeId: employee.uuid, date: markDate, status: markStatus,
        firstIn: firstIn ? `${markDate}T${firstIn}:00` : undefined,
        lastOut: lastOut ? `${markDate}T${lastOut}:00` : undefined,
      });
      setToast('Attendance marked');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to mark');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Staff Attendance</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={8}>
          <Autocomplete
            options={options}
            getOptionLabel={(o) => o.name || ''}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            value={employee}
            onChange={(_, v) => setEmployee(v)}
            onInputChange={(_, val) => search(val)}
            renderInput={(params) => <TextField {...params} label="Search staff by name" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField type="month" size="small" fullWidth value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>

      {!employee ? (
        <Alert severity="info">Search for a staff member to see their attendance and penalty.</Alert>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={2}>
          {ded && ded.countedAbsences > 0 && <PenaltyCard summary={ded} />}
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Correct a day (manual override)</Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={6} sm={3}><TextField type="date" size="small" fullWidth label="Date" value={markDate} onChange={(e) => setMarkDate(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={6} sm={3}>
                  <TextField select size="small" fullWidth label="Status" value={markStatus} onChange={(e) => setMarkStatus(e.target.value)}>
                    {MARK_STATUSES.map((s) => <MenuItem key={s.v} value={s.v}>{s.l}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={2}><TextField type="time" size="small" fullWidth label="In" value={firstIn} onChange={(e) => setFirstIn(e.target.value)} InputLabelProps={{ shrink: true }} disabled={markStatus !== 'present'} /></Grid>
                <Grid item xs={6} sm={2}><TextField type="time" size="small" fullWidth label="Out" value={lastOut} onChange={(e) => setLastOut(e.target.value)} InputLabelProps={{ shrink: true }} disabled={markStatus !== 'present'} /></Grid>
                <Grid item xs={12} sm={2}><Button variant="contained" fullWidth onClick={mark} disabled={busy}>Save</Button></Grid>
              </Grid>
            </CardContent>
          </Card>
          <MonthAttendanceView data={att} />
        </Stack>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
