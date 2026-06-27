import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Alert, Button, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Divider,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { attendanceService } from '../../services/attendanceService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'leave'];
const statusColor = (s) => ({ present: 'success', absent: 'error', late: 'warning', leave: 'info' }[s] || 'default');

export default function AttendanceSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canEdit = can(ACTIONS.ATTENDANCE_FINALIZE);

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await attendanceService.getSession(id);
      setSession(data.session);
      setRecords(data.records || []);
      setAudit(data.audit || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeStatus = async (record, status) => {
    if (status === record.status) return;
    setSavingId(record.uuid); setError('');
    try {
      await attendanceService.editRecord(record.uuid, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update record');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!session) return <Alert severity="error">{error || 'Session not found'}</Alert>;

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/attendance/sessions')} sx={{ mb: 2 }}>Back to History</Button>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h5">{session.attendanceDate}</Typography>
            <Chip label={session.status} color={session.status === 'finalized' ? 'success' : 'default'} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Class: {session.classId}{session.finalizedAt ? ` · Finalized: ${String(session.finalizedAt).slice(0, 19).replace('T', ' ')}` : ''}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Records ({records.length})</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remark</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.uuid}>
                        <TableCell>{r.studentName || r.studentId}</TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select
                              size="small"
                              value={r.status}
                              onChange={(e) => changeStatus(r, e.target.value)}
                              disabled={savingId === r.uuid}
                              variant="standard"
                            >
                              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                          ) : (
                            <Chip size="small" label={r.status} color={statusColor(r.status)} variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>{r.remark || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Change history ({audit.length})</Typography>
              {audit.length === 0 && <Typography variant="body2" color="text.secondary">No changes recorded.</Typography>}
              {audit.map((a, i) => (
                <Box key={a.uuid || i}>
                  {i > 0 && <Divider sx={{ my: 1 }} />}
                  <Typography variant="body2">
                    <strong>{a.studentName || a.studentId}</strong>: {a.oldStatus || '—'} → {a.newStatus}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.source} · {String(a.changedAt).slice(0, 19).replace('T', ' ')}{a.changedbyUserid ? ` · by ${a.changedbyUserid}` : ''}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
