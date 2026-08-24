import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, IconButton,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment,
  FormControlLabel, Switch, ToggleButtonGroup, ToggleButton, Tooltip, Link,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon, SwapHoriz as ChangeIcon } from '@mui/icons-material';
import ChangeConcessionDialog from './ChangeConcessionDialog';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, inr, classRank, FEE_COLORS, CONCESSION_TYPE_LABELS, fmtDate } from './feesUi';
import { SwapVert as SortIcon } from '@mui/icons-material';

const TYPE_COLOR = { sibling: 'primary', sibling_elder: 'primary', sibling_younger: 'primary', staff: 'warning', ews: 'success', other: 'default' };
const emptyC = { name: '', type: 'sibling_younger', valueType: 'amount', value: '', feeHeadId: '' };

export default function ConcessionList() {
  const { academicYearId } = useAcademicYear();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('templates'); // templates | multi
  const [multi, setMulti] = useState([]); // students on >1 concession
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [heads, setHeads] = useState([]);
  const [types, setTypes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [onlyCurrent, setOnlyCurrent] = useState(false);
  const [sortDir, setSortDir] = useState('asc'); // class order

  const [dlg, setDlg] = useState({ open: false, data: emptyC, id: null, saving: false });
  const [pickStu, setPickStu] = useState(false);
  const [cycles, setCycles] = useState([]); // ordered fee cycles for the add-student bounds
  const [fromCycle, setFromCycle] = useState(''); // effective_from_cycle for newly added students (blank = whole year)
  const [toCycle, setToCycle] = useState('');     // effective_to_cycle (blank = ongoing)
  const [del, setDel] = useState({ open: false, row: null, loading: false });
  const [rmStu, setRmStu] = useState({ open: false, studentId: null, name: '', loading: false });
  const [chg, setChg] = useState({ open: false, studentId: null, name: '' }); // mid-year change dialog

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [c, h, lk, mc, cyc] = await Promise.all([
        feesService.getConcessions(academicYearId),
        feesService.getHeads(academicYearId),
        feesService.getLookups().catch(() => ({ concessionTypes: [] })),
        feesService.getMultiConcession(academicYearId).catch(() => []),
        feesService.getCycles(academicYearId).catch(() => []),
      ]);
      setList(c || []); setHeads(h || []); setTypes(lk.concessionTypes || []); setMulti(mc || []);
      setCycles((cyc || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      // count comes from the list query now (one call), not one roster fetch per template
      setCounts(Object.fromEntries((c || []).map((t) => [t.uuid, Number(t.studentCount) || 0])));
      if (c && c.length && !selected) selectTemplate(c[0]);
      else if (selected) { const still = (c || []).find((t) => t.uuid === selected.uuid); setSelected(still || null); if (still) selectTemplate(still); }
    } catch (err) { setError(errMsg(err, 'Failed to load concessions')); }
    finally { setLoading(false); }
  };

  const selectTemplate = async (t) => {
    setSelected(t); setRosterLoading(true);
    try {
      // backend joins student + class, so names arrive in one call (no per-student lookups)
      setRoster(await feesService.getConcessionStudents(t.uuid));
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
    try {
      // cycle-bounded: from cycle (blank = whole year) → to cycle (blank = ongoing)
      await feesService.addConcessionStudents(selected.uuid, { studentIds: [student.uuid], effectiveFromCycle: fromCycle || null, effectiveToCycle: toCycle || null });
      selectTemplate(selected); load();
    }
    catch (err) { setError(errMsg(err)); }
  };
  const doRemoveStudent = async () => {
    setRmStu((s) => ({ ...s, loading: true }));
    try { await feesService.removeConcessionStudent(selected.uuid, rmStu.studentId); setRmStu({ open: false, studentId: null, name: '', loading: false }); selectTemplate(selected); load(); }
    catch (err) { setError(errMsg(err)); setRmStu((s) => ({ ...s, loading: false })); }
  };

  const doDelete = async () => {
    setDel((s) => ({ ...s, loading: true }));
    try { await feesService.deleteConcession(del.row.uuid); setDel({ open: false, row: null, loading: false }); if (selected?.uuid === del.row.uuid) setSelected(null); load(); }
    catch (err) { setError(errMsg(err)); setDel((s) => ({ ...s, loading: false })); }
  };

  const valueLabel = (c) => (c.valueType === 'percent' ? `${c.value}%` : inr(c.value));
  const headName = (id) => heads.find((h) => h.uuid === id)?.name || (id ? '—' : 'All');
  const multiByStudent = useMemo(() => Object.fromEntries((multi || []).map((m) => [m.studentId, m])), [multi]);
  const cycleName = useMemo(() => Object.fromEntries((cycles || []).map((c) => [c.uuid, c.name])), [cycles]);
  const sameHeadCount = useMemo(() => (multi || []).filter((m) => m.sameHead).length, [multi]);
  const shownRoster = (onlyCurrent ? roster.filter((r) => r.enrolledThisYear) : roster)
    .slice()
    .sort((a, b) => (classRank(a.className) - classRank(b.className)) * (sortDir === 'asc' ? 1 : -1)
      || (a.studentName || '').localeCompare(b.studentName || ''));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Concessions</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Reusable discount templates → attach students. Sibling, staff, EWS &amp; more.</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="templates" sx={{ textTransform: 'none' }}>Templates</ToggleButton>
            <ToggleButton value="multi" sx={{ textTransform: 'none' }}>In multiple ({multi.length})</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDlg({ open: true, data: emptyC, id: null, saving: false })}>New concession</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {sameHeadCount > 0 && view === 'templates' && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => setView('multi')}>Review</Button>}>
          {sameHeadCount} student{sameHeadCount === 1 ? '' : 's'} {sameHeadCount === 1 ? 'has' : 'have'} two concessions on the <b>same fee head</b> (double discount).
        </Alert>
      )}

      {view === 'templates' ? (
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
              {selected && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Tooltip title="Apply the discount from this fee cycle onward. Leave blank for the whole year.">
                    <TextField select size="small" label="From cycle" value={fromCycle} onChange={(e) => setFromCycle(e.target.value)} sx={{ width: 150 }}>
                      <MenuItem value="">Whole year</MenuItem>
                      {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
                    </TextField>
                  </Tooltip>
                  <Tooltip title="Apply up to and including this cycle. Leave blank for ongoing (till year end).">
                    <TextField select size="small" label="To cycle" value={toCycle} onChange={(e) => setToCycle(e.target.value)} sx={{ width: 150 }}>
                      <MenuItem value="">Ongoing</MenuItem>
                      {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
                    </TextField>
                  </Tooltip>
                  <Button size="small" variant="contained" startIcon={<PersonAddIcon />} onClick={() => setPickStu(true)}>Add student</Button>
                </Box>
              )}
            </CardContent>
            {selected && (
              <CardContent sx={{ py: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>{shownRoster.length} student{shownRoster.length === 1 ? '' : 's'}</Typography>
                  <Button size="small" startIcon={<SortIcon fontSize="small" />} onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} sx={{ textTransform: 'none', fontSize: 12 }}>
                    Class {sortDir === 'asc' ? 'low→high' : 'high→low'}
                  </Button>
                </Box>
                <FormControlLabel
                  control={<Switch size="small" checked={onlyCurrent} onChange={(e) => setOnlyCurrent(e.target.checked)} />}
                  label={<span style={{ fontSize: 12 }}>Enrolled this year only</span>}
                />
              </CardContent>
            )}
            <CardContent sx={{ pt: 0 }}>
              {!selected && <Typography sx={{ color: FEE_COLORS.muted }}>Select a template to manage its students.</Typography>}
              {selected && rosterLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>}
              {selected && !rosterLoading && shownRoster.length === 0 && <Typography sx={{ color: FEE_COLORS.muted, py: 2 }}>No students attached{onlyCurrent ? ' for this year' : ''} yet.</Typography>}
              {selected && !rosterLoading && shownRoster.map((r) => (
                <Box key={r.uuid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: `1px solid ${FEE_COLORS.border}` }}>
                  <span>
                    {r.studentName || r.studentId}
                    {r.className && <span style={{ color: FEE_COLORS.muted }}> · {r.className}</span>}
                    {r.admissionNumber && <span style={{ color: FEE_COLORS.muted }}> · {r.admissionNumber}</span>}
                  </span>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {multiByStudent[r.studentId] && (
                      <Tooltip title={(multiByStudent[r.studentId].concessions || []).map((c) => c.name).join(', ')}>
                        <Chip size="small" color={multiByStudent[r.studentId].sameHead ? 'warning' : 'default'} variant="outlined"
                          label={`also in ${(multiByStudent[r.studentId].concessionCount || 2) - 1} other`} />
                      </Tooltip>
                    )}
                    {r.effectiveFrom && <Tooltip title={`Applies to cycles due on/after ${fmtDate(r.effectiveFrom)}`}><Chip size="small" color="info" variant="outlined" label={`from ${fmtDate(r.effectiveFrom)}`} /></Tooltip>}
                    {r.cycleScope && <Tooltip title={`Only these cycles: ${r.cycleScope}`}><Chip size="small" color="info" variant="outlined" label={`${String(r.cycleScope).split(',').filter(Boolean).length} cycles`} /></Tooltip>}
                    {(r.effectiveFromCycle || r.effectiveToCycle) && <Tooltip title="Cycle-bounded discount"><Chip size="small" color="info" variant="outlined" label={`${r.effectiveFromCycle ? (cycleName[r.effectiveFromCycle] || 'start') : 'start'} → ${r.effectiveToCycle ? (cycleName[r.effectiveToCycle] || 'end') : 'ongoing'}`} /></Tooltip>}
                    {!r.enrolledThisYear && <Chip size="small" color="warning" variant="outlined" label="not this year" />}
                    <Tooltip title="Change / stop this scheme from a cycle"><IconButton size="small" onClick={() => setChg({ open: true, studentId: r.studentId, name: r.studentName || '' })}><ChangeIcon fontSize="small" /></IconButton></Tooltip>
                    <IconButton size="small" color="error" onClick={() => setRmStu({ open: true, studentId: r.studentId, name: r.studentName || '', loading: false })}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      ) : (
        <Card>
          <CardContent sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Students in more than one concession</Typography>
            <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>{multi.length} student{multi.length === 1 ? '' : 's'} · {sameHeadCount} same-head</Typography>
          </CardContent>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Class</TableCell><TableCell>Adm#</TableCell><TableCell>Student</TableCell><TableCell>Concessions</TableCell><TableCell align="center">Heads</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {multi.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ color: FEE_COLORS.success, py: 3 }}>No student is in more than one concession. 🎉</TableCell></TableRow>}
                {multi.map((m) => (
                  <TableRow key={m.studentId} hover sx={m.sameHead ? { bgcolor: 'rgba(255,171,0,.10)' } : undefined}>
                    <TableCell>{m.className || '—'}</TableCell>
                    <TableCell>{m.admissionNumber || '—'}</TableCell>
                    <TableCell><Link component="button" underline="hover" onClick={() => navigate(`/students/${m.studentId}`)} sx={{ textAlign: 'left' }}>{m.studentName || m.studentId}</Link></TableCell>
                    <TableCell>{(m.concessions || []).map((c, i) => <Chip key={i} size="small" variant="outlined" label={`${c.name}${c.valueType === 'percent' ? ` ${c.value}%` : ` ${inr(c.value)}`}`} sx={{ mr: 0.5, mb: 0.5 }} />)}</TableCell>
                    <TableCell align="center">{m.sameHead ? <Chip size="small" color="warning" label="same head" /> : m.headCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

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
      <ConfirmDialog open={del.open} title="Delete concession" requireText="confirm"
        message={`Delete "${del.row?.name}" and detach all its students? Their discount is removed on every affected cycle, so their dues will rise. This cannot be undone.`}
        confirmLabel="Delete concession" loadingLabel="Deleting…" onConfirm={doDelete} onCancel={() => setDel({ open: false, row: null, loading: false })} loading={del.loading} />
      <ConfirmDialog open={rmStu.open} title="Remove from concession" requireText="confirm"
        message={`Remove ${rmStu.name || 'this student'} from "${selected?.name}"? Their discount is voided and their dues rise by the concession amount. You can re-add them later.`}
        confirmLabel="Remove" loadingLabel="Removing…" onConfirm={doRemoveStudent} onCancel={() => setRmStu({ open: false, studentId: null, name: '', loading: false })} loading={rmStu.loading} />
      <ChangeConcessionDialog open={chg.open} studentId={chg.studentId} studentName={chg.name} academicYearId={academicYearId}
        presetCloseName={selected?.name} onClose={() => setChg({ open: false, studentId: null, name: '' })}
        onApplied={() => { setChg({ open: false, studentId: null, name: '' }); if (selected) selectTemplate(selected); load(); }} />
    </Box>
  );
}
