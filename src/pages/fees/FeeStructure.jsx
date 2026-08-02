import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, CircularProgress,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem,
  ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent,
  DialogActions, FormGroup, FormControlLabel, Checkbox, IconButton, Chip, InputAdornment,
} from '@mui/material';
import { Delete as DeleteIcon, PersonSearch as PersonSearchIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { classService } from '../../services/classService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import { errMsg, inr, FEE_COLORS } from './feesUi';

const key = (classId, headId, cycleId) => `${classId}|${headId}|${cycleId}`;

export default function FeeStructure() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [mode, setMode] = useState('class'); // class | student

  const [classes, setClasses] = useState([]);
  const [heads, setHeads] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [rowByKey, setRowByKey] = useState({}); // key -> {uuid, amount}
  const [cycleId, setCycleId] = useState('');
  const [edits, setEdits] = useState({}); // key -> amount string
  const [saving, setSaving] = useState(false);

  const [bulk, setBulk] = useState({ open: false, headId: '', amount: '', classIds: [], cycleIds: [], saving: false });
  const [copy, setCopy] = useState({ open: false, fromClassId: '', toClassIds: [], saving: false });

  // student overrides
  const [stu, setStu] = useState(null);
  const [stuPick, setStuPick] = useState(false);
  const [stuRows, setStuRows] = useState([]);
  const [ovForm, setOvForm] = useState({ headId: '', cycleId: '', amount: '' });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [cls, h, c, s] = await Promise.all([
        classService.getClasses({ academicYearId }).catch(() => []),
        feesService.getHeads(academicYearId),
        feesService.getCycles(academicYearId),
        feesService.getStructure({ academicYearId }),
      ]);
      const classList = (cls?.value || cls || []).filter(Boolean);
      setClasses(classList);
      setHeads(h || []);
      setCycles(c || []);
      const map = {};
      (s || []).forEach((r) => { map[key(r.classId, r.feeHeadId, r.cycleId)] = { uuid: r.uuid, amount: Number(r.amount) }; });
      setRowByKey(map);
      setCycleId((prev) => prev || (c && c[0] && c[0].uuid) || '');
      setEdits({});
    } catch (err) { setError(errMsg(err, 'Failed to load fee structure')); }
    finally { setLoading(false); }
  };

  const cellValue = (classId, headId) => {
    const k = key(classId, headId, cycleId);
    if (edits[k] !== undefined) return edits[k];
    const r = rowByKey[k];
    return r ? String(r.amount) : '';
  };

  const setCell = (classId, headId, val) => {
    const k = key(classId, headId, cycleId);
    setEdits((e) => ({ ...e, [k]: val }));
  };

  const saveGrid = async () => {
    setSaving(true); setError(''); setOk('');
    try {
      const entries = Object.entries(edits).filter(([k]) => k.endsWith(`|${cycleId}`));
      let n = 0;
      for (const [k, valStr] of entries) {
        const [classId, headId, cyc] = k.split('|');
        const existing = rowByKey[k];
        const amount = valStr === '' ? null : Number(valStr);
        if (amount === null) { if (existing) { await feesService.deleteStructure(existing.uuid); n++; } continue; }
        if (existing) {
          if (existing.amount !== amount) { await feesService.updateStructure(existing.uuid, { amount }); n++; }
        } else {
          await feesService.createStructure({ academicYearId, classId, feeHeadId: headId, cycleId: cyc, amount });
          n++;
        }
      }
      setOk(`Saved ${n} change${n === 1 ? '' : 's'}.`);
      await load();
    } catch (err) { setError(errMsg(err)); }
    finally { setSaving(false); }
  };

  const runBulk = async () => {
    setBulk((s) => ({ ...s, saving: true }));
    try {
      await feesService.bulkStructure({
        academicYearId, feeHeadId: bulk.headId, amount: Number(bulk.amount),
        classIds: bulk.classIds.length ? bulk.classIds : classes.map((c) => c.uuid),
        cycleIds: bulk.cycleIds.length ? bulk.cycleIds : [cycleId],
      });
      setBulk({ open: false, headId: '', amount: '', classIds: [], cycleIds: [], saving: false });
      setOk('Bulk amounts applied.'); load();
    } catch (err) { setError(errMsg(err)); setBulk((s) => ({ ...s, saving: false })); }
  };

  const runCopy = async () => {
    setCopy((s) => ({ ...s, saving: true }));
    try {
      await feesService.copyStructure({ academicYearId, fromClassId: copy.fromClassId, toClassIds: copy.toClassIds });
      setCopy({ open: false, fromClassId: '', toClassIds: [], saving: false });
      setOk('Structure copied.'); load();
    } catch (err) { setError(errMsg(err)); setCopy((s) => ({ ...s, saving: false })); }
  };

  // ---- student overrides ----
  const loadStudentOverrides = async (student) => {
    setStu(student);
    try { setStuRows(await feesService.getStructureStudents({ academicYearId, studentId: student.uuid })); }
    catch (err) { setError(errMsg(err)); }
  };
  const addOverride = async () => {
    try {
      await feesService.upsertStructureStudent({ academicYearId, studentId: stu.uuid, feeHeadId: ovForm.headId, cycleId: ovForm.cycleId, amount: Number(ovForm.amount) });
      setOvForm({ headId: '', cycleId: '', amount: '' });
      loadStudentOverrides(stu);
    } catch (err) { setError(errMsg(err)); }
  };
  const removeOverride = async (id) => {
    try { await feesService.deleteStructureStudent(id); loadStudentOverrides(stu); }
    catch (err) { setError(errMsg(err)); }
  };

  const headName = (id) => heads.find((h) => h.uuid === id)?.name || id;
  const cycleName = (id) => cycles.find((c) => c.uuid === id)?.name || id;
  const dirtyCount = useMemo(() => Object.keys(edits).filter((k) => k.endsWith(`|${cycleId}`)).length, [edits, cycleId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Fee Structure</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Amount each class pays per head. Edit a cell inline; one row = one class.</Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="class">Class-wise</ToggleButton>
          <ToggleButton value="student">Student overrides</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOk('')}>{ok}</Alert>}

      {mode === 'class' ? (
        <Card>
          <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${FEE_COLORS.border}` }}>
            <TextField size="small" select label="Cycle" value={cycleId} onChange={(e) => setCycleId(e.target.value)} sx={{ minWidth: 160 }}>
              {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
            </TextField>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" onClick={() => setCopy({ open: true, fromClassId: '', toClassIds: [], saving: false })}>Copy from class</Button>
            <Button variant="outlined" onClick={() => setBulk({ open: true, headId: heads[0]?.uuid || '', amount: '', classIds: [], cycleIds: [cycleId], saving: false })}>Bulk apply</Button>
            <Button variant="contained" disabled={saving || dirtyCount === 0} onClick={saveGrid}>{saving ? 'Saving…' : `Save changes${dirtyCount ? ` (${dirtyCount})` : ''}`}</Button>
          </CardContent>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper' }}>Class</TableCell>
                  {heads.map((h) => <TableCell key={h.uuid} align="right">{h.name}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {classes.length === 0 && <TableRow><TableCell colSpan={heads.length + 1} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No classes found for this year.</TableCell></TableRow>}
                {classes.map((cl) => (
                  <TableRow key={cl.uuid} hover>
                    <TableCell sx={{ fontWeight: 600, position: 'sticky', left: 0, bgcolor: 'background.paper' }}>{cl.name}</TableCell>
                    {heads.map((h) => (
                      <TableCell key={h.uuid} align="right" sx={{ p: 0.5 }}>
                        <TextField
                          size="small" variant="standard" type="number"
                          value={cellValue(cl.uuid, h.uuid)}
                          onChange={(e) => setCell(cl.uuid, h.uuid, e.target.value)}
                          inputProps={{ style: { textAlign: 'right', width: 78, fontVariantNumeric: 'tabular-nums' } }}
                          InputProps={{ disableUnderline: false }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <CardContent sx={{ borderTop: `1px solid ${FEE_COLORS.border}` }}>
            <Alert severity="info" icon={false} sx={{ fontSize: 12.5 }}>
              💡 <b>Bulk apply</b> sets one amount across many classes/cycles at once. <b>Copy from class</b> clones a whole class's structure. Blank a cell + Save to remove it.
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${FEE_COLORS.border}` }}>
            <Button variant="outlined" startIcon={<PersonSearchIcon />} onClick={() => setStuPick(true)}>{stu ? 'Change student' : 'Pick student'}</Button>
            {stu && <Chip label={`${stu.name}${stu.admissionNumber ? ' · ' + stu.admissionNumber : ''}`} />}
          </CardContent>
          {stu ? (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Head</TableCell><TableCell>Cycle</TableCell><TableCell align="right">Override amount</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>
                    {stuRows.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No overrides — this student uses the class amounts.</TableCell></TableRow>}
                    {stuRows.map((r) => (
                      <TableRow key={r.uuid} hover>
                        <TableCell>{headName(r.feeHeadId)}</TableCell>
                        <TableCell>{cycleName(r.cycleId)}</TableCell>
                        <TableCell align="right">{inr(r.amount)}</TableCell>
                        <TableCell align="right"><IconButton size="small" color="error" onClick={() => removeOverride(r.uuid)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <CardContent sx={{ borderTop: `1px solid ${FEE_COLORS.border}`, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" select label="Head" value={ovForm.headId} onChange={(e) => setOvForm((f) => ({ ...f, headId: e.target.value }))} sx={{ minWidth: 150 }}>
                  {heads.map((h) => <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Cycle" value={ovForm.cycleId} onChange={(e) => setOvForm((f) => ({ ...f, cycleId: e.target.value }))} sx={{ minWidth: 150 }}>
                  {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
                </TextField>
                <TextField size="small" type="number" label="Amount" value={ovForm.amount} onChange={(e) => setOvForm((f) => ({ ...f, amount: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} sx={{ width: 140 }} />
                <Button variant="contained" disabled={!ovForm.headId || !ovForm.cycleId || ovForm.amount === ''} onClick={addOverride}>Add / update</Button>
              </CardContent>
            </>
          ) : (
            <CardContent><Typography sx={{ color: FEE_COLORS.muted }}>Pick a student to view and set per-student fee overrides.</Typography></CardContent>
          )}
        </Card>
      )}

      {/* Bulk apply */}
      <Dialog open={bulk.open} onClose={() => setBulk((s) => ({ ...s, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk apply amount</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <TextField size="small" select label="Head" value={bulk.headId} onChange={(e) => setBulk((s) => ({ ...s, headId: e.target.value }))} sx={{ minWidth: 160 }}>
              {heads.map((h) => <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Amount" value={bulk.amount} onChange={(e) => setBulk((s) => ({ ...s, amount: e.target.value }))} sx={{ width: 140 }} />
          </Box>
          <Typography sx={{ mt: 2, fontSize: 13, fontWeight: 600 }}>Cycles <span style={{ color: FEE_COLORS.muted, fontWeight: 400 }}>(none = current cycle)</span></Typography>
          <FormGroup row>
            {cycles.map((c) => (
              <FormControlLabel key={c.uuid} control={<Checkbox size="small" checked={bulk.cycleIds.includes(c.uuid)} onChange={(e) => setBulk((s) => ({ ...s, cycleIds: e.target.checked ? [...s.cycleIds, c.uuid] : s.cycleIds.filter((x) => x !== c.uuid) }))} />} label={c.name} />
            ))}
          </FormGroup>
          <Typography sx={{ mt: 1, fontSize: 13, fontWeight: 600 }}>Classes <span style={{ color: FEE_COLORS.muted, fontWeight: 400 }}>(none = all classes)</span></Typography>
          <FormGroup row>
            {classes.map((c) => (
              <FormControlLabel key={c.uuid} control={<Checkbox size="small" checked={bulk.classIds.includes(c.uuid)} onChange={(e) => setBulk((s) => ({ ...s, classIds: e.target.checked ? [...s.classIds, c.uuid] : s.classIds.filter((x) => x !== c.uuid) }))} />} label={c.name} />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulk((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={bulk.saving || !bulk.headId || bulk.amount === ''} onClick={runBulk}>{bulk.saving ? 'Applying…' : 'Apply'}</Button>
        </DialogActions>
      </Dialog>

      {/* Copy from class */}
      <Dialog open={copy.open} onClose={() => setCopy((s) => ({ ...s, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Copy structure from a class</DialogTitle>
        <DialogContent>
          <TextField size="small" select fullWidth label="From class" value={copy.fromClassId} onChange={(e) => setCopy((s) => ({ ...s, fromClassId: e.target.value }))} sx={{ mt: 1 }}>
            {classes.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
          </TextField>
          <Typography sx={{ mt: 2, fontSize: 13, fontWeight: 600 }}>To classes</Typography>
          <FormGroup row>
            {classes.filter((c) => c.uuid !== copy.fromClassId).map((c) => (
              <FormControlLabel key={c.uuid} control={<Checkbox size="small" checked={copy.toClassIds.includes(c.uuid)} onChange={(e) => setCopy((s) => ({ ...s, toClassIds: e.target.checked ? [...s.toClassIds, c.uuid] : s.toClassIds.filter((x) => x !== c.uuid) }))} />} label={c.name} />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopy((s) => ({ ...s, open: false }))}>Cancel</Button>
          <Button variant="contained" disabled={copy.saving || !copy.fromClassId || copy.toClassIds.length === 0} onClick={runCopy}>{copy.saving ? 'Copying…' : 'Copy'}</Button>
        </DialogActions>
      </Dialog>

      <StudentSearchDialog open={stuPick} onClose={() => setStuPick(false)} onSelect={(s) => { setStuPick(false); loadStudentOverrides(s); }} />
    </Box>
  );
}
