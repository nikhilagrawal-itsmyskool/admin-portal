import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, IconButton,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, inr, FEE_COLORS } from './feesUi';

const empty = { name: '', fromKm: '', toKm: '', amountPerMonth: '' };

export default function TransportSlabList() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slabs, setSlabs] = useState([]);
  const [dlg, setDlg] = useState({ open: false, data: empty, id: null, saving: false });
  const [del, setDel] = useState({ open: false, row: null, loading: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try { setSlabs(await feesService.getSlabs(academicYearId)); }
    catch (err) { setError(errMsg(err, 'Failed to load transport slabs')); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setDlg((s) => ({ ...s, saving: true }));
    try {
      const d = dlg.data;
      const payload = {
        academicYearId, name: d.name || null,
        fromKm: d.fromKm === '' ? null : Number(d.fromKm),
        toKm: d.toKm === '' ? null : Number(d.toKm),
        amountPerMonth: Number(d.amountPerMonth),
      };
      if (dlg.id) await feesService.updateSlab(dlg.id, payload);
      else await feesService.createSlab(payload);
      setDlg({ open: false, data: empty, id: null, saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setDlg((s) => ({ ...s, saving: false })); }
  };

  const doDelete = async () => {
    setDel((s) => ({ ...s, loading: true }));
    try { await feesService.deleteSlab(del.row.uuid); setDel({ open: false, row: null, loading: false }); load(); }
    catch (err) { setError(errMsg(err)); setDel((s) => ({ ...s, loading: false })); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Transport Fee Slabs</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Fee by distance band. Each student's km comes from their bus stop — we bill the <b>farther</b> of morning/evening.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDlg({ open: true, data: empty, id: null, saving: false })}>Slab</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Distance bands</Typography>
              <Typography sx={{ color: FEE_COLORS.muted, fontSize: 12 }}>reads km from the Transport module</Typography>
            </CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Band</TableCell><TableCell align="right">From (km)</TableCell><TableCell align="right">To (km)</TableCell><TableCell align="right">Fee / month</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {slabs.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No slabs yet.</TableCell></TableRow>}
                  {slabs.map((s) => (
                    <TableRow key={s.uuid} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name || '—'}</TableCell>
                      <TableCell align="right">{s.fromKm ?? '—'}</TableCell>
                      <TableCell align="right">{s.toKm ?? '—'}</TableCell>
                      <TableCell align="right">{inr(s.amountPerMonth)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton size="small" onClick={() => setDlg({ open: true, id: s.uuid, saving: false, data: { name: s.name || '', fromKm: s.fromKm ?? '', toKm: s.toKm ?? '', amountPerMonth: String(s.amountPerMonth ?? '') } })}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDel({ open: true, row: s, loading: false })}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>How a student gets billed</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${FEE_COLORS.border}` }}><span>Morning stop</span><Chip size="small" variant="outlined" label="e.g. 5.2 km" /></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${FEE_COLORS.border}` }}><span>Evening stop</span><Chip size="small" variant="outlined" label="e.g. 7.8 km" /></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${FEE_COLORS.border}` }}><b>Billed distance (max)</b><Chip size="small" color="primary" label="7.8 km → matching band" /></Box>
              <Alert severity="info" icon={false} sx={{ mt: 2, fontSize: 12.5 }}>
                The Transport module already stores <b>km per stop</b> &amp; each student's stop. This screen only adds the <b>km → ₹</b> bands — no data re-entry.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dlg.open} onClose={() => setDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{dlg.id ? 'Edit slab' : 'New slab'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Band name (e.g. Zone A)" value={dlg.data.name} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, name: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="From km" value={dlg.data.fromKm} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, fromKm: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="To km" value={dlg.data.toKm} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, toKm: e.target.value } }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" type="number" label="Fee / month" value={dlg.data.amountPerMonth} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, amountPerMonth: e.target.value } }))} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={dlg.saving || dlg.data.amountPerMonth === ''} onClick={save}>{dlg.saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={del.open} title="Delete slab" message={`Delete "${del.row?.name || 'this slab'}"?`} onConfirm={doDelete} onCancel={() => setDel({ open: false, row: null, loading: false })} loading={del.loading} />
    </Box>
  );
}
