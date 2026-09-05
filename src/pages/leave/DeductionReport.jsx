import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Card, CardContent, Chip, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar,
} from '@mui/material';
import { PlayArrow as RunIcon, Download as ExportIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { thisMonth } from './LeaveShared';

const COLS = ['Employee', 'Present', 'CL', 'Counted', 'Plain', 'Ladder', 'Applied', 'Status'];

export default function DeductionReport() {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [finalizeTarget, setFinalizeTarget] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      setRows(await leaveService.listDeductions(month) || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const run = async () => {
    setBusy(true); setError('');
    try {
      const res = await leaveService.runDeductions(month);
      setRows(res.runs || []);
      setToast(`Recomputed ${res.drafted} draft${res.drafted === 1 ? '' : 's'}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Run failed');
    } finally {
      setBusy(false);
    }
  };

  const finalize = async (applyLadder) => {
    const r = finalizeTarget;
    setBusy(true); setError('');
    try {
      await leaveService.finalizeDeduction(r.uuid, applyLadder);
      setFinalizeTarget(null);
      setToast('Finalized');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Finalize failed');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const header = ['Employee', 'Present', 'CL used', 'Counted absences', 'Unauthorized', 'Plain LWP days', 'Ladder days', 'Applied days', 'Status'];
    const lines = rows.map((r) => [
      `"${(r.employeeName || r.employeeId).replace(/"/g, '""')}"`,
      r.paidDays, r.clUsed, r.authorizedUnpaidAbsences + r.unauthorizedAbsences, r.unauthorizedAbsences,
      r.plainLwpDays, r.ladderDeductionDays, r.appliedDeductionDays, r.status,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leave-deductions-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalApplied = rows.reduce((s, r) => s + (r.appliedDeductionDays || 0), 0);

  return (
    <Box sx={{ maxWidth: 940 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Deduction Report</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" startIcon={<RunIcon />} onClick={run} disabled={busy}>Run</Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportCsv} disabled={rows.length === 0}>CSV</Button>
        </Stack>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        Deductions are in <b>days of pay</b> — payroll converts to ₹. Plain LWP is the standard figure; the escalated ladder is applied only if you confirm it per person.
        {rows.length > 0 && <> Total applied this month: <b>{totalApplied} days</b>.</>}
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Alert severity="success">No deductions for {month}. Press "Run" to (re)compute from attendance.</Alert>
      ) : isMobile ? (
        <Stack spacing={1}>
          {rows.map((r) => (
            <Card key={r.uuid} variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.employeeName || r.employeeId}</Typography>
                <Chip size="small" label={r.status} color={r.status === 'finalized' ? 'success' : 'default'} sx={{ textTransform: 'capitalize' }} />
              </Box>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                {r.paidDays} present · {r.unauthorizedAbsences + r.authorizedUnpaidAbsences} counted · applied <b>{r.appliedDeductionDays}d</b> (plain {r.plainLwpDays} / ladder {r.ladderDeductionDays})
              </Typography>
              {r.status !== 'finalized' && (
                <Button size="small" variant="contained" sx={{ mt: 1 }} onClick={() => setFinalizeTarget(r)}>Finalize</Button>
              )}
            </CardContent></Card>
          ))}
        </Stack>
      ) : (
        <Card variant="outlined">
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow>{COLS.map((c) => <TableCell key={c} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>)}<TableCell /></TableRow></TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.uuid} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.employeeName || r.employeeId}</TableCell>
                    <TableCell>{r.paidDays}</TableCell>
                    <TableCell>{r.clUsed}</TableCell>
                    <TableCell>{r.unauthorizedAbsences + r.authorizedUnpaidAbsences}</TableCell>
                    <TableCell>{r.plainLwpDays}</TableCell>
                    <TableCell sx={{ color: '#d99400' }}>{r.ladderDeductionDays}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{r.appliedDeductionDays}</TableCell>
                    <TableCell><Chip size="small" label={r.status} color={r.status === 'finalized' ? 'success' : 'default'} sx={{ textTransform: 'capitalize' }} /></TableCell>
                    <TableCell align="right">
                      {r.status !== 'finalized'
                        ? <Button size="small" variant="contained" onClick={() => setFinalizeTarget(r)}>Finalize</Button>
                        : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>confirmed</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Finalize: standard vs escalated */}
      <Dialog open={Boolean(finalizeTarget)} onClose={() => setFinalizeTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Finalize — {finalizeTarget?.employeeName}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
            {finalizeTarget?.unauthorizedAbsences + finalizeTarget?.authorizedUnpaidAbsences} counted absence(s). Choose the deduction to lock in for payroll.
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Button variant="contained" onClick={() => finalize(false)} disabled={busy}>
              Standard — {finalizeTarget?.plainLwpDays} day(s)' pay
            </Button>
            <Button variant="outlined" color="warning" onClick={() => finalize(true)} disabled={busy}>
              Escalated ladder — {finalizeTarget?.ladderDeductionDays} day(s)' pay
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setFinalizeTarget(null)}>Cancel</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
