import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, IconButton, Chip,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, InputAdornment,
} from '@mui/material';
import { Add as AddIcon, PersonSearch as PersonSearchIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { studentService } from '../../services/studentService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import { errMsg, inr, FEE_COLORS } from './feesUi';
import { todayIso } from '../../utils/date';

const STATUS = { not_refunded: { label: 'Not refunded', color: 'warning' }, refunded: { label: 'Refunded', color: 'primary' }, dispersed: { label: 'Received by parent', color: 'success' } };
const today = () => todayIso();

export default function RefundList() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [heads, setHeads] = useState([]);
  const [names, setNames] = useState({});
  const [filter, setFilter] = useState('');

  const [dlg, setDlg] = useState({ open: false, student: null, amount: '', feeHeadId: '', refundStatus: 'not_refunded', refundDate: today(), remarks: '', saving: false });
  const [pick, setPick] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId, filter]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = { academicYearId };
      if (filter) params.refundStatus = filter;
      const [rf, h] = await Promise.all([feesService.getRefunds(params), feesService.getHeads(academicYearId)]);
      setRows(rf || []); setHeads(h || []);
      const ids = [...new Set((rf || []).map((r) => r.studentId))].filter((id) => id && !names[id]);
      if (ids.length) {
        const resolved = await Promise.all(ids.map(async (id) => { try { const s = await studentService.getStudentById(id); return [id, s?.name || id]; } catch { return [id, id]; } }));
        setNames((prev) => ({ ...prev, ...Object.fromEntries(resolved) }));
      }
    } catch (err) { setError(errMsg(err, 'Failed to load refunds')); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setDlg((s) => ({ ...s, saving: true }));
    try {
      await feesService.createRefund({
        academicYearId, studentId: dlg.student.uuid, amount: Number(dlg.amount),
        feeHeadId: dlg.feeHeadId || null, refundStatus: dlg.refundStatus, refundDate: dlg.refundDate || null, remarks: dlg.remarks || null,
      });
      setDlg({ open: false, student: null, amount: '', feeHeadId: '', refundStatus: 'not_refunded', refundDate: today(), remarks: '', saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setDlg((s) => ({ ...s, saving: false })); }
  };

  const headName = (id) => (id ? heads.find((h) => h.uuid === id)?.name || '—' : '—');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Refunds</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Security / caution refunds on leaving — track status until the parent receives it.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" select label="Status" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            {Object.entries(STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDlg((s) => ({ ...s, open: true }))}>New refund</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Student</TableCell><TableCell>Head</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell>Date</TableCell><TableCell>Remarks</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No refunds.</TableCell></TableRow>}
              {rows.map((r) => {
                const st = STATUS[r.refundStatus] || { label: r.refundStatus, color: 'default' };
                return (
                  <TableRow key={r.uuid} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{names[r.studentId] || r.studentId}</TableCell>
                    <TableCell>{headName(r.feeHeadId)}</TableCell>
                    <TableCell align="right">{inr(r.amount)}</TableCell>
                    <TableCell><Chip size="small" color={st.color} variant={st.color === 'default' ? 'outlined' : 'filled'} label={st.label} /></TableCell>
                    <TableCell>{r.refundDate || '—'}</TableCell>
                    <TableCell sx={{ color: FEE_COLORS.muted }}>{r.remarks || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={dlg.open} onClose={() => setDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>New refund</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 2 }}>
            <Button variant="outlined" startIcon={<PersonSearchIcon />} onClick={() => setPick(true)}>{dlg.student ? 'Change student' : 'Pick student'}</Button>
            {dlg.student && <Chip sx={{ ml: 1 }} label={`${dlg.student.name}${dlg.student.admissionNumber ? ' · ' + dlg.student.admissionNumber : ''}`} />}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Amount" value={dlg.amount} onChange={(e) => setDlg((s) => ({ ...s, amount: e.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="date" label="Refund date" InputLabelProps={{ shrink: true }} value={dlg.refundDate} onChange={(e) => setDlg((s) => ({ ...s, refundDate: e.target.value }))} /></Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Head (optional, e.g. Caution)" value={dlg.feeHeadId} onChange={(e) => setDlg((s) => ({ ...s, feeHeadId: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {heads.map((h) => <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Status" value={dlg.refundStatus} onChange={(e) => setDlg((s) => ({ ...s, refundStatus: e.target.value }))}>
                {Object.entries(STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Remarks" value={dlg.remarks} onChange={(e) => setDlg((s) => ({ ...s, remarks: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={dlg.saving || !dlg.student || dlg.amount === ''} onClick={save}>{dlg.saving ? 'Saving…' : 'Create refund'}</Button>
        </DialogActions>
      </Dialog>

      <StudentSearchDialog open={pick} onClose={() => setPick(false)} onSelect={(s) => { setPick(false); setDlg((d) => ({ ...d, student: s })); }} />
    </Box>
  );
}
