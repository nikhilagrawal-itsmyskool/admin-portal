import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, IconButton,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControlLabel, Checkbox,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, FEE_COLORS, fmtDate, toDateInput } from './feesUi';

const KIND_CHIP = {
  recurring: { label: 'Monthly', color: 'primary' },
  exam: { label: 'Biannual', color: 'warning' },
  admission: { label: 'One-time', color: 'default' },
  annual: { label: 'One-time', color: 'default' },
  caution: { label: 'Refundable', color: 'success' },
  transport: { label: 'Monthly', color: 'primary' },
  other: { label: 'Other', color: 'default' },
};

const emptyHead = { name: '', kind: 'recurring', abbreviation: '', oneTime: false, refundable: false, amountEditable: false, sortOrder: '' };
const emptyCycle = { name: '', abbreviation: '', fromDate: '', toDate: '', dueDate: '', sortOrder: '' };

export default function FeesSetup() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heads, setHeads] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [kinds, setKinds] = useState([]);

  const [headDlg, setHeadDlg] = useState({ open: false, data: emptyHead, id: null, saving: false });
  const [cycleDlg, setCycleDlg] = useState({ open: false, data: emptyCycle, id: null, saving: false });
  const [del, setDel] = useState({ open: false, kind: null, row: null, loading: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [h, c, lk] = await Promise.all([
        feesService.getHeads(academicYearId),
        feesService.getCycles(academicYearId),
        feesService.getLookups().catch(() => ({ feeHeadKinds: [] })),
      ]);
      setHeads(h || []); setCycles(c || []); setKinds(lk.feeHeadKinds || []);
    } catch (err) { setError(errMsg(err, 'Failed to load setup')); }
    finally { setLoading(false); }
  };

  // ---- Heads ----
  const saveHead = async () => {
    setHeadDlg((s) => ({ ...s, saving: true }));
    try {
      const d = headDlg.data;
      const payload = {
        academicYearId, name: d.name.trim(), kind: d.kind,
        abbreviation: d.abbreviation || null, oneTime: !!d.oneTime,
        refundable: !!d.refundable, amountEditable: !!d.amountEditable,
        sortOrder: d.sortOrder === '' ? null : Number(d.sortOrder),
      };
      if (headDlg.id) await feesService.updateHead(headDlg.id, payload);
      else await feesService.createHead(payload);
      setHeadDlg({ open: false, data: emptyHead, id: null, saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setHeadDlg((s) => ({ ...s, saving: false })); }
  };

  // ---- Cycles ----
  const saveCycle = async () => {
    setCycleDlg((s) => ({ ...s, saving: true }));
    try {
      const d = cycleDlg.data;
      const payload = {
        academicYearId, name: d.name.trim(), abbreviation: d.abbreviation || null,
        fromDate: d.fromDate || null, toDate: d.toDate || null, dueDate: d.dueDate || null,
        sortOrder: d.sortOrder === '' ? null : Number(d.sortOrder),
      };
      if (cycleDlg.id) await feesService.updateCycle(cycleDlg.id, payload);
      else await feesService.createCycle(payload);
      setCycleDlg({ open: false, data: emptyCycle, id: null, saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setCycleDlg((s) => ({ ...s, saving: false })); }
  };

  const doDelete = async () => {
    setDel((s) => ({ ...s, loading: true }));
    try {
      if (del.kind === 'head') await feesService.deleteHead(del.row.uuid);
      else await feesService.deleteCycle(del.row.uuid);
      setDel({ open: false, kind: null, row: null, loading: false });
      load();
    } catch (err) { setError(errMsg(err)); setDel((s) => ({ ...s, loading: false })); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Setup · Heads &amp; Cycles</Typography>
        <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>
          Define <em>what</em> you charge and <em>when</em> — set once per session.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* HEADS */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Fee Heads</Typography>
                <Typography sx={{ color: FEE_COLORS.muted, fontSize: 12 }}>what you charge</Typography>
              </Box>
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => setHeadDlg({ open: true, data: emptyHead, id: null, saving: false })}>Head</Button>
            </CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Head</TableCell><TableCell>Flags</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {heads.length === 0 && <TableRow><TableCell colSpan={3} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No heads yet.</TableCell></TableRow>}
                  {heads.map((h) => {
                    const chip = KIND_CHIP[h.kind] || { label: h.kind, color: 'default' };
                    return (
                      <TableRow key={h.uuid} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{h.name}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            <Chip size="small" color={chip.color} variant={chip.color === 'default' ? 'outlined' : 'filled'} label={chip.label} />
                            {h.refundable && h.kind !== 'caution' && <Chip size="small" color="success" label="Refundable" />}
                            {h.oneTime && h.kind === 'transport' && <Chip size="small" variant="outlined" label="Zone-based" />}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton size="small" onClick={() => setHeadDlg({ open: true, id: h.uuid, saving: false, data: { name: h.name || '', kind: h.kind || 'recurring', abbreviation: h.abbreviation || '', oneTime: !!h.oneTime, refundable: !!h.refundable, amountEditable: !!h.amountEditable, sortOrder: h.sortOrder ?? '' } })}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => setDel({ open: true, kind: 'head', row: h, loading: false })}><DeleteIcon fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            <CardContent sx={{ borderTop: `1px solid ${FEE_COLORS.border}` }}>
              <Alert severity="info" icon={false} sx={{ fontSize: 12.5 }}>
                A head's <b>kind</b> (monthly / biannual / one-time) decides which cycles it applies to — no need to repeat amounts per month.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* CYCLES */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Fee Cycles</Typography>
                <Typography sx={{ color: FEE_COLORS.muted, fontSize: 12 }}>when it's due</Typography>
              </Box>
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => setCycleDlg({ open: true, data: emptyCycle, id: null, saving: false })}>Cycle</Button>
            </CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Cycle</TableCell><TableCell>From</TableCell><TableCell>To</TableCell><TableCell>Due</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {cycles.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No cycles yet.</TableCell></TableRow>}
                  {cycles.map((c) => (
                    <TableRow key={c.uuid} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                      <TableCell>{fmtDate(c.fromDate)}</TableCell>
                      <TableCell>{fmtDate(c.toDate)}</TableCell>
                      <TableCell>{fmtDate(c.dueDate)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton size="small" onClick={() => setCycleDlg({ open: true, id: c.uuid, saving: false, data: { name: c.name || '', abbreviation: c.abbreviation || '', fromDate: toDateInput(c.fromDate), toDate: toDateInput(c.toDate), dueDate: toDateInput(c.dueDate), sortOrder: c.sortOrder ?? '' } })}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDel({ open: true, kind: 'cycle', row: c, loading: false })}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Head dialog */}
      <Dialog open={headDlg.open} onClose={() => setHeadDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{headDlg.id ? 'Edit Fee Head' : 'New Fee Head'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Name" value={headDlg.data.name} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, name: e.target.value } }))} /></Grid>
            <Grid item xs={7}>
              <TextField fullWidth size="small" select label="Kind" value={headDlg.data.kind} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, kind: e.target.value } }))}>
                {(kinds.length ? kinds : ['recurring', 'admission', 'caution', 'transport', 'exam', 'annual', 'other']).map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={5}><TextField fullWidth size="small" label="Abbr." value={headDlg.data.abbreviation} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, abbreviation: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Sort order" value={headDlg.data.sortOrder} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, sortOrder: e.target.value } }))} /></Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={headDlg.data.oneTime} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, oneTime: e.target.checked } }))} />} label="One-time (charged once)" />
              <FormControlLabel control={<Checkbox checked={headDlg.data.refundable} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, refundable: e.target.checked } }))} />} label="Refundable (caution)" />
              <FormControlLabel control={<Checkbox checked={headDlg.data.amountEditable} onChange={(e) => setHeadDlg((s) => ({ ...s, data: { ...s.data, amountEditable: e.target.checked } }))} />} label="Amount editable at collection" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHeadDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={headDlg.saving || !headDlg.data.name.trim()} onClick={saveHead}>{headDlg.saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Cycle dialog */}
      <Dialog open={cycleDlg.open} onClose={() => setCycleDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{cycleDlg.id ? 'Edit Fee Cycle' : 'New Fee Cycle'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={7}><TextField fullWidth size="small" label="Name" value={cycleDlg.data.name} onChange={(e) => setCycleDlg((s) => ({ ...s, data: { ...s.data, name: e.target.value } }))} /></Grid>
            <Grid item xs={5}><TextField fullWidth size="small" label="Abbr." value={cycleDlg.data.abbreviation} onChange={(e) => setCycleDlg((s) => ({ ...s, data: { ...s.data, abbreviation: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={cycleDlg.data.fromDate} onChange={(e) => setCycleDlg((s) => ({ ...s, data: { ...s.data, fromDate: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={cycleDlg.data.toDate} onChange={(e) => setCycleDlg((s) => ({ ...s, data: { ...s.data, toDate: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="date" label="Due" InputLabelProps={{ shrink: true }} value={cycleDlg.data.dueDate} onChange={(e) => setCycleDlg((s) => ({ ...s, data: { ...s.data, dueDate: e.target.value } }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Sort order" value={cycleDlg.data.sortOrder} onChange={(e) => setCycleDlg((s) => ({ ...s, data: { ...s.data, sortOrder: e.target.value } }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCycleDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={cycleDlg.saving || !cycleDlg.data.name.trim()} onClick={saveCycle}>{cycleDlg.saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={del.open}
        title={`Delete ${del.kind === 'head' ? 'Fee Head' : 'Fee Cycle'}`}
        message={`Delete "${del.row?.name}"? This cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => setDel({ open: false, kind: null, row: null, loading: false })}
        loading={del.loading}
      />
    </Box>
  );
}
