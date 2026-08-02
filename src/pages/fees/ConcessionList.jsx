import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, IconButton,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { studentService } from '../../services/studentService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, inr, FEE_COLORS, CONCESSION_TYPE_LABELS } from './feesUi';

const TYPE_COLOR = { sibling: 'primary', sibling_elder: 'primary', sibling_younger: 'primary', staff: 'warning', ews: 'success', other: 'default' };
const emptyC = { name: '', type: 'sibling_younger', valueType: 'amount', value: '', feeHeadId: '' };

export default function ConcessionList() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [heads, setHeads] = useState([]);
  const [types, setTypes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [dlg, setDlg] = useState({ open: false, data: emptyC, id: null, saving: false });
  const [pickStu, setPickStu] = useState(false);
  const [del, setDel] = useState({ open: false, row: null, loading: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [c, h, lk] = await Promise.all([
        feesService.getConcessions(academicYearId),
        feesService.getHeads(academicYearId),
        feesService.getLookups().catch(() => ({ concessionTypes: [] })),
      ]);
      setList(c || []); setHeads(h || []); setTypes(lk.concessionTypes || []);
      // roster counts (few templates)
      const cs = await Promise.all((c || []).map((t) => feesService.getConcessionStudents(t.uuid).then((r) => [t.uuid, r.length]).catch(() => [t.uuid, 0])));
      setCounts(Object.fromEntries(cs));
      if (c && c.length && !selected) selectTemplate(c[0]);
      else if (selected) { const still = (c || []).find((t) => t.uuid === selected.uuid); setSelected(still || null); if (still) selectTemplate(still); }
    } catch (err) { setError(errMsg(err, 'Failed to load concessions')); }
    finally { setLoading(false); }
  };

  const selectTemplate = async (t) => {
    setSelected(t); setRosterLoading(true);
    try {
      const rows = await feesService.getConcessionStudents(t.uuid);
      const withNames = await Promise.all(rows.map(async (r) => {
        try { const s = await studentService.getStudentById(r.studentId); return { ...r, name: s?.name, className: s?.currentClassName || s?.className, admissionNumber: s?.admissionNumber }; }
        catch { return { ...r, name: r.studentId }; }
      }));
      setRoster(withNames);
    } catch (err) { setError(errMsg(err)); }
    finally { setRosterLoading(false); }
  };

  const save = async () => {
    setDlg((s) => ({ ...s, saving: true }));
    try {
      const d = dlg.data;
      const payload = { academicYearId, name: d.name.trim(), type: d.type, valueType: d.valueType, value: Number(d.value), feeHeadId: d.feeHeadId || null };
      if (dlg.id) await feesService.updateConcession(dlg.id, payload);
      else await feesService.createConcession(payload);
      setDlg({ open: false, data: emptyC, id: null, saving: false });
      load();
    } catch (err) { setError(errMsg(err)); setDlg((s) => ({ ...s, saving: false })); }
  };

  const addStudent = async (student) => {
    setPickStu(false);
    try { await feesService.addConcessionStudents(selected.uuid, { studentIds: [student.uuid] }); selectTemplate(selected); load(); }
    catch (err) { setError(errMsg(err)); }
  };
  const removeStudent = async (studentId) => {
    try { await feesService.removeConcessionStudent(selected.uuid, studentId); selectTemplate(selected); load(); }
    catch (err) { setError(errMsg(err)); }
  };

  const doDelete = async () => {
    setDel((s) => ({ ...s, loading: true }));
    try { await feesService.deleteConcession(del.row.uuid); setDel({ open: false, row: null, loading: false }); if (selected?.uuid === del.row.uuid) setSelected(null); load(); }
    catch (err) { setError(errMsg(err)); setDel((s) => ({ ...s, loading: false })); }
  };

  const valueLabel = (c) => (c.valueType === 'percent' ? `${c.value}%` : inr(c.value));
  const headName = (id) => heads.find((h) => h.uuid === id)?.name || (id ? '—' : 'All');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Concessions</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Reusable discount templates → attach students. Sibling, staff, EWS &amp; more.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDlg({ open: true, data: emptyC, id: null, saving: false })}>New concession</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ pb: 1 }}><Typography sx={{ fontWeight: 700, fontSize: 15 }}>Concession templates</Typography></CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>On head</TableCell><TableCell align="right">Value</TableCell><TableCell align="right">Students</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {list.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No concessions yet.</TableCell></TableRow>}
                  {list.map((c) => (
                    <TableRow key={c.uuid} hover selected={selected?.uuid === c.uuid} sx={{ cursor: 'pointer' }} onClick={() => selectTemplate(c)}>
                      <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                      <TableCell><Chip size="small" color={TYPE_COLOR[c.type] || 'default'} variant={TYPE_COLOR[c.type] === 'default' || !TYPE_COLOR[c.type] ? 'outlined' : 'filled'} label={CONCESSION_TYPE_LABELS[c.type] || c.type} /></TableCell>
                      <TableCell>{headName(c.feeHeadId)}</TableCell>
                      <TableCell align="right">{valueLabel(c)}</TableCell>
                      <TableCell align="right">{counts[c.uuid] ?? 0}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDlg({ open: true, id: c.uuid, saving: false, data: { name: c.name, type: c.type, valueType: c.valueType, value: String(c.value), feeHeadId: c.feeHeadId || '' } }); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDel({ open: true, row: c, loading: false }); }}><DeleteIcon fontSize="small" /></IconButton>
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
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{selected ? selected.name : 'Roster'}</Typography>
                {selected && <Typography sx={{ color: FEE_COLORS.muted, fontSize: 12 }}>{valueLabel(selected)} · {headName(selected.feeHeadId)}</Typography>}
              </Box>
              {selected && <Button size="small" variant="contained" startIcon={<PersonAddIcon />} onClick={() => setPickStu(true)}>Add student</Button>}
            </CardContent>
            <CardContent sx={{ pt: 0 }}>
              {!selected && <Typography sx={{ color: FEE_COLORS.muted }}>Select a template to manage its students.</Typography>}
              {selected && rosterLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>}
              {selected && !rosterLoading && roster.length === 0 && <Typography sx={{ color: FEE_COLORS.muted, py: 2 }}>No students attached yet.</Typography>}
              {selected && !rosterLoading && roster.map((r) => (
                <Box key={r.uuid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: `1px solid ${FEE_COLORS.border}` }}>
                  <span>{r.name || r.studentId}{r.className && <span style={{ color: FEE_COLORS.muted }}> · {r.className}</span>}</span>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {r.cycleScope && <Chip size="small" variant="outlined" label={r.cycleScope} />}
                    <IconButton size="small" color="error" onClick={() => removeStudent(r.studentId)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* template dialog */}
      <Dialog open={dlg.open} onClose={() => setDlg((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{dlg.id ? 'Edit concession' : 'New concession'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Name" value={dlg.data.name} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, name: e.target.value } }))} /></Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="Type" value={dlg.data.type} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, type: e.target.value } }))}>
                {(types.length ? types : Object.keys(CONCESSION_TYPE_LABELS)).map((t) => <MenuItem key={t} value={t}>{CONCESSION_TYPE_LABELS[t] || t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="Value type" value={dlg.data.valueType} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, valueType: e.target.value } }))}>
                <MenuItem value="amount">Amount (₹)</MenuItem>
                <MenuItem value="percent">Percent (%)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="Value" value={dlg.data.value} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, value: e.target.value } }))}
                InputProps={{ startAdornment: <InputAdornment position="start">{dlg.data.valueType === 'percent' ? '%' : '₹'}</InputAdornment> }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="On head (optional)" value={dlg.data.feeHeadId} onChange={(e) => setDlg((s) => ({ ...s, data: { ...s.data, feeHeadId: e.target.value } }))}>
                <MenuItem value="">All heads</MenuItem>
                {heads.map((h) => <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={dlg.saving || !dlg.data.name.trim() || dlg.data.value === ''} onClick={save}>{dlg.saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <StudentSearchDialog open={pickStu} onClose={() => setPickStu(false)} onSelect={addStudent} />
      <ConfirmDialog open={del.open} title="Delete concession" message={`Delete "${del.row?.name}" and detach its students?`} onConfirm={doDelete} onCancel={() => setDel({ open: false, row: null, loading: false })} loading={del.loading} />
    </Box>
  );
}
