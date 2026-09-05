import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, Chip, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon, AttachFile as AttachIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate } from '../../utils/date';

const dateRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);

export default function Approvals() {
  const isMobile = useIsMobile();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      setApps(await leaveService.listApplications({ status: 'pending' }) || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const approve = async (a) => {
    setBusyId(a.uuid); setError(''); setSuccess('');
    try {
      await leaveService.approve(a.uuid);
      setSuccess(`Approved ${a.employeeName || 'request'}`);
      setApps((prev) => prev.filter((x) => x.uuid !== a.uuid));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    const a = rejectTarget;
    setBusyId(a.uuid); setError(''); setSuccess('');
    try {
      await leaveService.reject(a.uuid, note.trim() || undefined);
      setSuccess(`Rejected ${a.employeeName || 'request'}`);
      setApps((prev) => prev.filter((x) => x.uuid !== a.uuid));
      setRejectTarget(null); setNote('');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not reject');
    } finally {
      setBusyId(null);
    }
  };

  const openDoc = async (a) => {
    setError('');
    try {
      const att = await leaveService.getAttachment(a.uuid);
      if (att?.dataUri) {
        const w = window.open('', '_blank');
        if (w) w.document.write(`<title>${a.employeeName || 'Document'}</title><iframe src="${att.dataUri}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not open document');
    }
  };

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Leave Approvals</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : apps.length === 0 ? (
        <Alert severity="success">No pending leave requests. All clear. 🎉</Alert>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {apps.map((a) => (
            <Card key={a.uuid} variant="outlined">
              <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{a.employeeName || a.employeeId}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      {dateRange(a.fromDate, a.toDate)}{a.workingDays ? ` · ${a.workingDays} day${a.workingDays === 1 ? '' : 's'}` : ''}
                    </Typography>
                    {a.reason && <Typography sx={{ fontSize: 12.5, color: 'text.disabled', mt: 0.25 }}>{a.reason}</Typography>}
                  </Box>
                  <Chip size="small" label={a.leaveTypeName || a.leaveTypeCode} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="contained" color="success" startIcon={<ApproveIcon />}
                    onClick={() => approve(a)} disabled={busyId === a.uuid}>Approve</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<RejectIcon />}
                    onClick={() => { setRejectTarget(a); setNote(''); }} disabled={busyId === a.uuid}>Reject</Button>
                  {a.hasAttachment && (
                    <Button size="small" color="inherit" startIcon={<AttachIcon />} onClick={() => openDoc(a)}>Document</Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Staff', 'Type', 'Dates', 'Days', 'Reason', 'Action'].map((c, i) => (
                  <TableCell key={c} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((a) => (
                <TableRow key={a.uuid} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{a.employeeName || a.employeeId}</TableCell>
                  <TableCell><Chip size="small" label={a.leaveTypeName || a.leaveTypeCode} color="primary" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateRange(a.fromDate, a.toDate)}</TableCell>
                  <TableCell>{a.workingDays || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 300, color: 'text.secondary' }}>
                    {a.reason || '—'}
                    {a.hasAttachment && (
                      <Button size="small" color="inherit" startIcon={<AttachIcon />} onClick={() => openDoc(a)} sx={{ ml: 0.5, minWidth: 0 }}>Doc</Button>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" variant="contained" color="success" startIcon={<ApproveIcon />}
                      onClick={() => approve(a)} disabled={busyId === a.uuid} sx={{ mr: 1 }}>Approve</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<RejectIcon />}
                      onClick={() => { setRejectTarget(a); setNote(''); }} disabled={busyId === a.uuid}>Reject</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 2 }}>
        The daily cap (“max 2 casual leaves a day”) and monthly quota are enforced on approve — you'll get a message if a limit is hit.
      </Typography>

      <Dialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject {rejectTarget?.employeeName || 'request'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="Reason (optional — shown to the applicant)"
            multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doReject} disabled={busyId === rejectTarget?.uuid}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
