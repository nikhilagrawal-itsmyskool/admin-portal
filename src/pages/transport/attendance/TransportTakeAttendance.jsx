import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  ToggleButton, ToggleButtonGroup, CircularProgress, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Search as SearchIcon, Save as SaveIcon, CheckCircle as FinalizeIcon } from '@mui/icons-material';
import { transportService } from '../../../services/transportService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCan } from '../../../permissions/can';
import { useAuth } from '../../../context/AuthContext';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import { visibleTransportRoutes } from '../../../permissions/transportAccess';

const STATUSES = [
  { value: 'boarded', label: 'B', color: 'success' },
  { value: 'absent', label: 'A', color: 'error' },
  { value: 'excused', label: 'E', color: 'warning' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function TransportTakeAttendance() {
  const can = useCan();
  const { user } = useAuth();
  const { academicYearId } = useAcademicYear();
  const canFinalize = can('transport.attendance.finalize');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState(today());

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [finalizeDialog, setFinalizeDialog] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rts = await transportService.getRoutes();
        setRoutes(rts || []);
      } catch {
        setError('Failed to load routes / academic years');
      }
    })();
  }, []);

  // A transport-attendance teacher only picks from routes they're staffed on.
  const routeOptions = visibleTransportRoutes(routes, { user, canViewAll: can('transport.view') });

  const finalized = session?.status === 'finalized';

  const load = async () => {
    if (!routeId || !academicYearId || !date) { setError('Select route, academic year and date'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const sess = await transportService.openAttendanceSession({ routeId, academicYearId, date });
      setSession(sess);
      const roster = await transportService.getAttendanceRoster({ routeId, date });
      setStudents((roster.students || []).map((s) => ({
        ...s,
        status: s.status || 'boarded',
        remark: s.remark || '',
        _hadRecord: Boolean(s.status),
      })));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (studentId, status) =>
    setStudents((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
  const setRemark = (studentId, remark) =>
    setStudents((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, remark } : s)));

  // Persist exceptions (non-boarded) and any previously-recorded student.
  const buildMarks = () => students
    .filter((s) => s.status !== 'boarded' || s._hadRecord)
    .map((s) => ({ studentId: s.studentId, status: s.status, remark: s.remark || undefined }));

  const counts = students.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});

  const save = async () => {
    if (!session) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await transportService.saveAttendanceMarks(session.uuid, buildMarks());
      setStudents((prev) => prev.map((s) => ({ ...s, _hadRecord: s.status !== 'boarded' || s._hadRecord })));
      setSuccess('Attendance saved');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const doFinalize = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await transportService.saveAttendanceMarks(session.uuid, buildMarks());
      const res = await transportService.finalizeAttendanceSession(session.uuid);
      setFinalizeDialog(false);
      setSession((prev) => ({ ...prev, status: 'finalized' }));
      const notified = res.absentCount ? ` ${res.absentCount} absence alert(s) queued.` : '';
      setSuccess(`Finalized: ${res.counts?.boarded || 0} boarded, ${res.counts?.absent || 0} absent.${notified}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to finalize');
      setFinalizeDialog(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Take Bus Attendance</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField fullWidth select size="small" label="Route" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                {routeOptions.map((r) => <MenuItem key={r.uuid} value={r.uuid}>{r.name} ({r.direction})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="date" size="small" label="Date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={load} disabled={loading}>Load</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

      {!loading && session && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={finalized ? 'FINALIZED' : 'OPEN'} color={finalized ? 'success' : 'default'} size="small" />
                <Chip label={`Boarded ${counts.boarded || 0}`} color="success" variant="outlined" size="small" />
                <Chip label={`Absent ${counts.absent || 0}`} color="error" variant="outlined" size="small" />
                <Chip label={`Excused ${counts.excused || 0}`} color="warning" variant="outlined" size="small" />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<SaveIcon />} onClick={save} disabled={saving || finalized}>Save</Button>
                {canFinalize && (
                  <Button variant="contained" startIcon={<FinalizeIcon />} onClick={() => setFinalizeDialog(true)} disabled={saving || finalized}>Finalize</Button>
                )}
              </Box>
            </Box>

            {finalized && <Alert severity="info" sx={{ mb: 2 }}>This session is finalized. Edit individual records from History.</Alert>}

            {isMobile ? (
              <Stack spacing={1.5}>
                {students.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                    No students assigned to this route
                  </Typography>
                ) : students.map((s, i) => (
                  <Paper key={s.studentId} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {i + 1}. {s.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Stop: {s.stopName || '-'}
                    </Typography>
                    <ToggleButtonGroup size="small" exclusive fullWidth value={s.status}
                      onChange={(_, v) => v && setStatus(s.studentId, v)} disabled={finalized} sx={{ mb: 1 }}>
                      {STATUSES.map((st) => (
                        <ToggleButton key={st.value} value={st.value} color={st.color}>{st.label}</ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <TextField size="small" fullWidth placeholder="Remark" value={s.remark}
                      onChange={(e) => setRemark(s.studentId, e.target.value)} disabled={finalized} variant="standard" />
                  </Paper>
                ))}
              </Stack>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Stop</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remark</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center">No students assigned to this route</TableCell></TableRow>
                    ) : students.map((s, i) => (
                      <TableRow key={s.studentId}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.stopName || '-'}</TableCell>
                        <TableCell>
                          <ToggleButtonGroup size="small" exclusive value={s.status}
                            onChange={(_, v) => v && setStatus(s.studentId, v)} disabled={finalized}>
                            {STATUSES.map((st) => (
                              <ToggleButton key={st.value} value={st.value} color={st.color}>{st.label}</ToggleButton>
                            ))}
                          </ToggleButtonGroup>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" placeholder="Remark" value={s.remark}
                            onChange={(e) => setRemark(s.studentId, e.target.value)} disabled={finalized} variant="standard" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={finalizeDialog}
        title="Finalize bus attendance?"
        message={`${counts.boarded || 0} boarded, ${counts.absent || 0} absent. ${counts.absent || 0} family(ies) will be notified about the absence. You can still edit records afterwards (logged).`}
        confirmLabel="Finalize & notify"
        loadingLabel="Finalizing..."
        confirmColor="primary"
        onConfirm={doFinalize}
        onCancel={() => setFinalizeDialog(false)}
        loading={saving}
      />
    </Box>
  );
}
