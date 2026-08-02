import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, IconButton, Chip,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PersonSearch as PersonSearchIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { studentService } from '../../services/studentService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, FEE_COLORS } from './feesUi';

export default function WaiverList() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [heads, setHeads] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [names, setNames] = useState({});

  const [dlg, setDlg] = useState({ open: false, student: null, feeHeadId: '', cycleId: '', reason: '', saving: false });
  const [pick, setPick] = useState(false);
  const [del, setDel] = useState({ open: false, row: null, loading: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [w, h, c] = await Promise.all([
        feesService.getWaivers({ academicYearId }),
        feesService.getHeads(academicYearId),
        feesService.getCycles(academicYearId),
      ]);
      setRows(w || []); setHeads(h || []); setCycles(c || []);
      const ids = [...new Set((w || []).map((r) => r.studentId))].filter((id) => !names[id]);
      if (ids.length) {
        const resolved = await Promise.all(ids.map(async (id) => { try { const s = await studentService.getStudentById(id); return [id, s?.name || id]; } catch { return [id, id]; } }));
        setNames((prev) => ({ ...prev, ...Object.fromEntries(resolved) }));
      }
    } catch (err) { setError(errMsg(err, 'Failed to load waivers')); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setDlg((s) => ({ ...s, saving: true }));
    try {
      await feesService.createWaiver({ academicYearId, studentId: dlg.student.uuid, feeHeadId: dlg.feeHeadId || null, cycleId: dlg.cycleId || null, reason: dlg.reason || null });
      setDlg({ open: false, student: null, feeHeadId: '', cycleId: '', reason: '', saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setDlg((s) => ({ ...s, saving: false })); }
  };

  const doDelete = async () => {
    setDel((s) => ({ ...s, loading: true }));
    try { await feesService.deleteWaiver(del.row.uuid); setDel({ open: false, row: null, loading: false }); load(); }
    catch (err) { setError(errMsg(err)); setDel((s) => ({ ...s, loading: false })); }
  };

  const headName = (id) => (id ? heads.find((h) => h.uuid === id)?.name || '—' : 'All heads');
  const cycleName = (id) => (id ? cycles.find((c) => c.uuid === id)?.name || '—' : 'All cycles');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Waivers</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Zero out a student's chosen head/cycle (distinct from a concession discount).</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDlg({ open: true, student: null, feeHeadId: '', cycleId: '', reason: '', saving: false })}>New waiver</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Student</TableCell><TableCell>Head</TableCell><TableCell>Cycle</TableCell><TableCell>Reason</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No waivers yet.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.uuid} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{names[r.studentId] || r.studentId}</TableCell>
                  <TableCell>{headName(r.feeHeadId)}</TableCell>
                  <TableCell>{cycleName(r.cycleId)}</TableCell>
                  <TableCell sx={{ color: FEE_COLORS.muted }}>{r.reason || '—'}</TableCell>
                  <TableCell align="right"><IconButton size="small" color="error" onClick={() => setDel({ open: true, row: r, loading: false })}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={dlg.open} onClose={() => setDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>New waiver</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 2 }}>
            <Button variant="outlined" startIcon={<PersonSearchIcon />} onClick={() => setPick(true)}>{dlg.student ? 'Change student' : 'Pick student'}</Button>
            {dlg.student && <Chip sx={{ ml: 1 }} label={`${dlg.student.name}${dlg.student.admissionNumber ? ' · ' + dlg.student.admissionNumber : ''}`} />}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Head (blank = all)" value={dlg.feeHeadId} onChange={(e) => setDlg((s) => ({ ...s, feeHeadId: e.target.value }))}>
                <MenuItem value="">All heads</MenuItem>
                {heads.map((h) => <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Cycle (blank = all)" value={dlg.cycleId} onChange={(e) => setDlg((s) => ({ ...s, cycleId: e.target.value }))}>
                <MenuItem value="">All cycles</MenuItem>
                {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Reason" value={dlg.reason} onChange={(e) => setDlg((s) => ({ ...s, reason: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={dlg.saving || !dlg.student} onClick={save}>{dlg.saving ? 'Saving…' : 'Create waiver'}</Button>
        </DialogActions>
      </Dialog>

      <StudentSearchDialog open={pick} onClose={() => setPick(false)} onSelect={(s) => { setPick(false); setDlg((d) => ({ ...d, student: s })); }} />
      <ConfirmDialog open={del.open} title="Delete waiver" message="Remove this waiver?" onConfirm={doDelete} onCancel={() => setDel({ open: false, row: null, loading: false })} loading={del.loading} />
    </Box>
  );
}
