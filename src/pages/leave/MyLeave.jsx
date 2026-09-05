import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Add as AddIcon, AttachFile as AttachIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { APP_STATUS_COLOR, thisMonth } from './LeaveShared';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate, todayIso } from '../../utils/date';
import ConfirmDialog from '../../components/common/ConfirmDialog';

function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const dateRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);

export default function MyLeave() {
  const isMobile = useIsMobile();
  const [types, setTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leaveTypeCode: '', fromDate: todayIso(), toDate: todayIso(), reason: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [t, s, a] = await Promise.all([
        leaveService.myTypes(),
        leaveService.mySummary(thisMonth()),
        leaveService.myApplications(),
      ]);
      setTypes(t || []);
      setSummary(s);
      setApps(a || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load your leave');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const selectedType = types.find((t) => t.code === form.leaveTypeCode);

  const submit = async () => {
    if (!form.leaveTypeCode) { setError('Choose a leave type'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const payload = { ...form, reason: form.reason.trim() || undefined };
      if (file) {
        const base64Data = await readFileB64(file);
        payload.attachment = { fileName: file.name, mimeType: file.type, base64Data };
      }
      await leaveService.apply(payload);
      setOpen(false); setFile(null);
      setForm({ leaveTypeCode: '', fromDate: todayIso(), toDate: todayIso(), reason: '' });
      setSuccess('Leave request submitted');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to submit');
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true); setError('');
    try {
      await leaveService.cancel(cancelTarget.uuid);
      setCancelTarget(null);
      setSuccess('Leave cancelled');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to cancel');
      setCancelTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const canCancel = (a) => a.status === 'pending' || (a.status === 'approved' && a.fromDate > todayIso());

  return (
    <Box sx={{ maxWidth: 1040 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">My Leave</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Apply for leave</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {summary && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Casual leave · {summary.month}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography sx={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
                    {summary.clRemaining}<Typography component="span" sx={{ fontSize: 15, color: 'text.secondary', fontWeight: 600 }}> / {summary.clPerMonth} left</Typography>
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`${summary.pending} pending`} color="warning" variant="outlined" />
                    <Chip size="small" label={`${summary.approved} approved`} color="success" variant="outlined" />
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          )}

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>My requests</Typography>
          {apps.length === 0 ? (
            <Alert severity="info">No leave requests yet. Use "Apply for leave" above.</Alert>
          ) : isMobile ? (
            <Stack spacing={1.25}>
              {apps.map((a) => (
                <Card key={a.uuid} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{a.leaveTypeName || a.leaveTypeCode}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                          {dateRange(a.fromDate, a.toDate)}{a.workingDays ? ` · ${a.workingDays} day${a.workingDays === 1 ? '' : 's'}` : ''}
                          {a.hasAttachment ? ' · 📎' : ''}
                        </Typography>
                        {a.reason && <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{a.reason}</Typography>}
                        {a.status === 'rejected' && a.decisionNote && (
                          <Typography sx={{ fontSize: 12, color: '#c42a56' }}>“{a.decisionNote}”</Typography>
                        )}
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Chip size="small" label={a.status} color={APP_STATUS_COLOR[a.status] || 'default'} sx={{ textTransform: 'capitalize', fontWeight: 700 }} />
                        {canCancel(a) && (
                          <Button size="small" color="inherit" onClick={() => setCancelTarget(a)} sx={{ minWidth: 0, fontSize: 12 }}>Cancel</Button>
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Type', 'Dates', 'Days', 'Reason', 'Status', ''].map((c, i) => (
                      <TableCell key={c || i} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.map((a) => (
                    <TableRow key={a.uuid} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{a.leaveTypeName || a.leaveTypeCode}{a.hasAttachment ? ' 📎' : ''}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateRange(a.fromDate, a.toDate)}</TableCell>
                      <TableCell>{a.workingDays || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 320, color: 'text.secondary' }}>
                        {a.reason || '—'}
                        {a.status === 'rejected' && a.decisionNote && (
                          <Typography component="span" sx={{ display: 'block', fontSize: 12, color: '#c42a56' }}>“{a.decisionNote}”</Typography>
                        )}
                      </TableCell>
                      <TableCell><Chip size="small" label={a.status} color={APP_STATUS_COLOR[a.status] || 'default'} sx={{ textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                      <TableCell align="right">
                        {canCancel(a) && (
                          <Button size="small" color="inherit" onClick={() => setCancelTarget(a)} sx={{ minWidth: 0, fontSize: 12 }}>Cancel</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Apply dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Apply for leave</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="Leave type" value={form.leaveTypeCode}
                onChange={(e) => setForm((f) => ({ ...f, leaveTypeCode: e.target.value }))}>
                {types.map((t) => <MenuItem key={t.code} value={t.code}>{t.name} ({t.code})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" size="small" label="From" value={form.fromDate}
                onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="date" size="small" label="To" value={form.toDate}
                onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Reason" multiline minRows={2} value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Button component="label" variant="outlined" startIcon={<AttachIcon />} fullWidth>
                {file ? file.name : (selectedType?.requiresAttachment ? 'Attach certificate (required)' : 'Attach document (optional)')}
                <input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
              {selectedType?.requiresAttachment && !file && (
                <Typography sx={{ fontSize: 12, color: '#c42a56', mt: 0.5 }}>{selectedType.name} needs a supporting document.</Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>Submit request</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this leave request?"
        message="The request will be withdrawn. You can apply again if needed."
        confirmLabel="Cancel leave"
        confirmColor="error"
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
        loading={busy}
      />
    </Box>
  );
}
