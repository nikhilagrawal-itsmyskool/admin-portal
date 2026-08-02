import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, IconButton, Chip,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Grid,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, inr, FEE_COLORS } from './feesUi';

const MODE_LABELS = { flat: 'Flat once', perday: 'Per day', pct: 'Percent of due' };
const empty = { appliesToKind: '', graceDays: '', mode: 'flat', amount: '', cap: '' };

export default function LateFeeRuleList() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [modes, setModes] = useState([]);
  const [dlg, setDlg] = useState({ open: false, data: empty, id: null, saving: false });
  const [del, setDel] = useState({ open: false, row: null, loading: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [r, lk] = await Promise.all([
        feesService.getLateFeeRules(academicYearId),
        feesService.getLookups().catch(() => ({ feeHeadKinds: [], lateFeeModes: [] })),
      ]);
      setRules(r || []); setKinds(lk.feeHeadKinds || []); setModes(lk.lateFeeModes || []);
    } catch (err) { setError(errMsg(err, 'Failed to load late-fee rules')); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setDlg((s) => ({ ...s, saving: true }));
    try {
      const d = dlg.data;
      const payload = {
        academicYearId, mode: d.mode, amount: Number(d.amount),
        appliesToKind: d.appliesToKind || null,
        graceDays: d.graceDays === '' ? null : Number(d.graceDays),
        cap: d.cap === '' ? null : Number(d.cap),
      };
      if (dlg.id) await feesService.updateLateFeeRule(dlg.id, payload);
      else await feesService.createLateFeeRule(payload);
      setDlg({ open: false, data: empty, id: null, saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setDlg((s) => ({ ...s, saving: false })); }
  };

  const doDelete = async () => {
    setDel((s) => ({ ...s, loading: true }));
    try { await feesService.deleteLateFeeRule(del.row.uuid); setDel({ open: false, row: null, loading: false }); load(); }
    catch (err) { setError(errMsg(err)); setDel((s) => ({ ...s, loading: false })); }
  };

  const amountLabel = (r) => (r.mode === 'pct' ? `${r.amount}%` : inr(r.amount));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Late-fee Rules</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Auto-charge overdue cycles after a grace period. A blank "applies to" covers all heads.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDlg({ open: true, data: empty, id: null, saving: false })}>Rule</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ maxWidth: 820 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Applies to</TableCell><TableCell align="right">Grace (days)</TableCell><TableCell>Mode</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Cap</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {rules.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No late-fee rules yet.</TableCell></TableRow>}
              {rules.map((r) => (
                <TableRow key={r.uuid} hover>
                  <TableCell>{r.appliesToKind ? <Chip size="small" variant="outlined" label={r.appliesToKind} /> : <Chip size="small" label="All heads" />}</TableCell>
                  <TableCell align="right">{r.graceDays ?? 0}</TableCell>
                  <TableCell>{MODE_LABELS[r.mode] || r.mode}</TableCell>
                  <TableCell align="right">{amountLabel(r)}</TableCell>
                  <TableCell align="right">{r.cap != null ? inr(r.cap) : '—'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" onClick={() => setDlg({ open: true, id: r.uuid, saving: false, data: { appliesToKind: r.appliesToKind || '', graceDays: r.graceDays ?? '', mode: r.mode, amount: String(r.amount ?? ''), cap: r.cap ?? '' } })}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDel({ open: true, row: r, loading: false })}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <CardContent sx={{ borderTop: `1px solid ${FEE_COLORS.border}` }}>
          <Alert severity="info" icon={false} sx={{ fontSize: 12.5 }}>
            <b>Flat once</b> = one fixed charge on overdue. <b>Per day</b> = amount × days late. <b>Percent of due</b> = % of the outstanding amount. Use <b>Cap</b> to limit the maximum late fee.
          </Alert>
        </CardContent>
      </Card>

      <Dialog open={dlg.open} onClose={() => setDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{dlg.id ? 'Edit late-fee rule' : 'New late-fee rule'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Applies to head kind" value={dlg.data.appliesToKind} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, appliesToKind: e.target.value } }))}>
                <MenuItem value="">All heads</MenuItem>
                {(kinds.length ? kinds : ['recurring', 'exam', 'annual', 'admission', 'transport', 'caution', 'other']).map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Grace days" value={dlg.data.graceDays} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, graceDays: e.target.value } }))} /></Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="Mode" value={dlg.data.mode} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, mode: e.target.value } }))}>
                {(modes.length ? modes : ['flat', 'perday', 'pct']).map((m) => <MenuItem key={m} value={m}>{MODE_LABELS[m] || m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Amount" value={dlg.data.amount} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, amount: e.target.value } }))} InputProps={{ startAdornment: <InputAdornment position="start">{dlg.data.mode === 'pct' ? '%' : '₹'}</InputAdornment> }} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Cap (optional)" value={dlg.data.cap} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, cap: e.target.value } }))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={dlg.saving || dlg.data.amount === ''} onClick={save}>{dlg.saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={del.open} title="Delete late-fee rule" message="Delete this late-fee rule?" onConfirm={doDelete} onCancel={() => setDel({ open: false, row: null, loading: false })} loading={del.loading} />
    </Box>
  );
}
