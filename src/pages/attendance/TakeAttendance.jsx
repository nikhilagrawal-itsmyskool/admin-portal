import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, Autocomplete,
  MenuItem, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, ToggleButton, ToggleButtonGroup, CircularProgress, Stack,
  useMediaQuery, useTheme,
} from '@mui/material';
import { Search as SearchIcon, Save as SaveIcon, CheckCircle as FinalizeIcon } from '@mui/icons-material';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
import { academicCalendarService } from '../../services/academicCalendarService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const STATUSES = [
  { value: 'present', label: 'P', color: 'success' },
  { value: 'absent', label: 'A', color: 'error' },
  { value: 'late', label: 'L', color: 'warning' },
  { value: 'leave', label: 'Lv', color: 'info' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function TakeAttendance() {
  const can = useCan();
  const canFinalize = can(ACTIONS.ATTENDANCE_FINALIZE);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [academicYearId, setAcademicYearId] = useState('');
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
        const [cls, yrs] = await Promise.all([
          classService.getClasses(),
          academicCalendarService.getAcademicYears(),
        ]);
        setClasses(Array.isArray(cls) ? cls : cls?.classes || []);
        setYears(Array.isArray(yrs) ? yrs : yrs?.academicYears || []);
        try {
          const cur = await academicCalendarService.getCurrentAcademicYear();
          if (cur?.uuid) setAcademicYearId(cur.uuid);
        } catch { /* no current year configured */ }
      } catch {
        setError('Failed to load classes / academic years');
      }
    })();
  }, []);

  const finalized = session?.status === 'finalized';

  const load = async () => {
    if (!selectedClass || !academicYearId || !date) {
      setError('Select class, academic year and date');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const sess = await attendanceService.openSession({ classId: selectedClass.uuid, academicYearId, date });
      setSession(sess);
      const roster = await attendanceService.getRoster({ classId: selectedClass.uuid, academicYearId, date });
      setStudents((roster.students || []).map((s) => ({
        ...s,
        status: s.status || 'present',
        remark: s.remark || '',
        _hadRecord: Boolean(s.status),
      })));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (studentId, status) => {
    setStudents((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
  };
  const setRemark = (studentId, remark) => {
    setStudents((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, remark } : s)));
  };

  // Persist exceptions (non-present) and any previously-recorded student (to catch un-marks).
  const buildMarks = () => students
    .filter((s) => s.status !== 'present' || s._hadRecord)
    .map((s) => ({ studentId: s.studentId, status: s.status, remark: s.remark || undefined }));

  const counts = students.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});

  const save = async () => {
    if (!session) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await attendanceService.saveMarks(session.uuid, buildMarks());
      setStudents((prev) => prev.map((s) => ({ ...s, _hadRecord: s.status !== 'present' || s._hadRecord })));
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
      await attendanceService.saveMarks(session.uuid, buildMarks());
      const res = await attendanceService.finalize(session.uuid);
      setFinalizeDialog(false);
      setSession((prev) => ({ ...prev, status: 'finalized' }));
      const notified = res.absentCount ? ` ${res.absentCount} absence alert(s) queued.` : '';
      setSuccess(`Finalized: ${res.counts?.present || 0} present, ${res.counts?.absent || 0} absent.${notified}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to finalize');
      setFinalizeDialog(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Take Attendance</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={classes}
                getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={selectedClass}
                onChange={(_, v) => setSelectedClass(v)}
                renderInput={(params) => <TextField {...params} label="Class" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth type="date" size="small" label="Date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={load} disabled={loading}>Load roster</Button>
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
                <Chip label={`Present ${counts.present || 0}`} color="success" variant="outlined" size="small" />
                <Chip label={`Absent ${counts.absent || 0}`} color="error" variant="outlined" size="small" />
                <Chip label={`Late ${counts.late || 0}`} color="warning" variant="outlined" size="small" />
                <Chip label={`Leave ${counts.leave || 0}`} color="info" variant="outlined" size="small" />
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
                    No enrolled students for this class/year
                  </Typography>
                ) : students.map((s, i) => (
                  <Paper key={s.studentId} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {i + 1}. {s.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.admissionNumber || '-'}
                      </Typography>
                    </Box>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      fullWidth
                      value={s.status}
                      onChange={(_, v) => v && setStatus(s.studentId, v)}
                      disabled={finalized}
                      sx={{ mb: 1 }}
                    >
                      {STATUSES.map((st) => (
                        <ToggleButton key={st.value} value={st.value} color={st.color}>{st.label}</ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Remark"
                      value={s.remark}
                      onChange={(e) => setRemark(s.studentId, e.target.value)}
                      disabled={finalized}
                      variant="standard"
                    />
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
                      <TableCell>Adm. No</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remark</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center">No enrolled students for this class/year</TableCell></TableRow>
                    ) : students.map((s, i) => (
                      <TableRow key={s.studentId}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.admissionNumber || '-'}</TableCell>
                        <TableCell>
                          <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={s.status}
                            onChange={(_, v) => v && setStatus(s.studentId, v)}
                            disabled={finalized}
                          >
                            {STATUSES.map((st) => (
                              <ToggleButton key={st.value} value={st.value} color={st.color}>{st.label}</ToggleButton>
                            ))}
                          </ToggleButtonGroup>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            placeholder="Remark"
                            value={s.remark}
                            onChange={(e) => setRemark(s.studentId, e.target.value)}
                            disabled={finalized}
                            variant="standard"
                          />
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
        title="Finalize attendance?"
        message={`${counts.present || 0} present, ${counts.absent || 0} absent. ${counts.absent || 0} family(ies) will be notified about the absence. You can still edit records afterwards (logged).`}
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
