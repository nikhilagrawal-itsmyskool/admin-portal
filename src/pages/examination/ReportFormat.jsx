import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Button, IconButton, FormControlLabel, Checkbox,
  TextField, ToggleButton, ToggleButtonGroup, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip,
} from '@mui/material';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';

const BANDS = [
  { band: 'pre-primary', label: 'Pre-Primary' },
  { band: '1-2', label: 'Classes 1–2' },
  { band: '3', label: 'Class 3' },
  { band: '4-5', label: 'Classes 4–5' },
  { band: '6-8', label: 'Classes 6–8' },
  { band: '9', label: 'Class 9' },
];

// Report Format config (Manage, exam.manage — desktop). Edit the labels printed on the card:
// subject names, the mark-column labels + max, the co-scholastic area names, and the grading
// legend. Codes are fixed (marks reference them), so this is edit-only — no add/remove here.
export default function ReportFormat() {
  const [band, setBand] = useState('pre-primary');
  const [termFilter, setTermFilter] = useState(0); // 0 = both terms, 1, or 2
  const [term2StartsOn, setTerm2StartsOn] = useState('');
  const [currentTerm, setCurrentTerm] = useState(1);
  const [remarkReq, setRemarkReq] = useState(false);
  const [cfgDirty, setCfgDirty] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setMsg('');
    try { setData(await examinationService.getReportScheme(band)); setDirty(false); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load the format'); setData(null); }
    finally { setLoading(false); }
  }, [band]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    examinationService.getReportConfig().then((c) => { setTerm2StartsOn(c.term2StartsOn || ''); setCurrentTerm(c.currentTerm || 1); setRemarkReq(!!c.remarkRequiredFinal); setCfgDirty(false); }).catch(() => {});
  }, []);

  const saveConfig = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const c = await examinationService.setReportConfig(term2StartsOn || null, remarkReq);
      setTerm2StartsOn(c.term2StartsOn || ''); setCurrentTerm(c.currentTerm || 1); setRemarkReq(!!c.remarkRequiredFinal); setCfgDirty(false);
      setMsg('Term setting saved.');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save the term setting'); }
    finally { setBusy(false); }
  };

  const setField = (list, uuid, field, value) => { setDirty(true); setData((d) => ({ ...d, [list]: d[list].map((r) => (r.uuid === uuid ? { ...r, [field]: value } : r)) })); };

  // Reorder a flat list (subjects) by swapping with the neighbour.
  const moveRow = (list, uuid, dir) => { setDirty(true); setData((d) => {
    const arr = [...d[list]]; const i = arr.findIndex((x) => x.uuid === uuid); const j = dir < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return d;
    [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...d, [list]: arr };
  }); };
  // Move an area within its section only (never crossing a section boundary).
  const moveArea = (uuid, dir) => { setDirty(true); setData((d) => {
    const arr = [...d.areas]; const i = arr.findIndex((x) => x.uuid === uuid); const j = dir < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length || arr[j].section !== arr[i].section) return d;
    [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...d, areas: arr };
  }); };
  // Move a whole section block up/down; rename every area in a section together.
  const sectionNames = (arr) => { const n = []; arr.forEach((a) => { if (!n.includes(a.section)) n.push(a.section); }); return n; };
  const moveSection = (name, dir) => { setDirty(true); setData((d) => {
    const names = sectionNames(d.areas); const si = names.indexOf(name); const sj = dir < 0 ? si - 1 : si + 1;
    if (sj < 0 || sj >= names.length) return d;
    [names[si], names[sj]] = [names[sj], names[si]];
    return { ...d, areas: names.flatMap((nm) => d.areas.filter((a) => a.section === nm)) };
  }); };
  const renameSection = (oldName, newName) => { setDirty(true); setData((d) => ({ ...d, areas: d.areas.map((a) => (a.section === oldName ? { ...a, section: newName } : a)) })); };

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const payload = {
        subjects: data.subjects.map((s, i) => ({ uuid: s.uuid, reportLabel: s.reportLabel, syllabusSubject: s.syllabusSubject, appliesToGrades: s.appliesToGrades, sortOrder: i })),
        components: data.components.map((c) => ({ uuid: c.uuid, label: c.label, maxMarks: c.maxMarks })),
        areas: data.areas.map((a, i) => ({ uuid: a.uuid, section: a.section, label: a.label, max: a.maxMarks, denomEditable: !!a.denominatorEditable, sortOrder: i })),
        gradeScales: data.gradeScales.map((g) => ({ uuid: g.uuid, label: g.label, minPct: g.minPct, maxPct: g.maxPct })),
      };
      setData(await examinationService.saveReportScheme(band, payload));
      setDirty(false);
      setMsg('Report format saved.');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save the format'); }
    finally { setBusy(false); }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Report Format</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Edit what prints on the report card — subject names, mark columns, co-scholastic areas and the grading legend, per grade band.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Term setting — drives the default term (1 vs 2) across the entry / report screens. */}
      <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Current term</Typography>
            <Typography variant="caption" color="text.secondary">
              Screens default to <b>Term {currentTerm}</b>. Before the date below it's Term 1; on/after, Term 2. Leave blank to always default to Term 1.
            </Typography>
          </Box>
          <TextField size="small" type="date" label="Term 2 starts on" value={term2StartsOn}
            onChange={(e) => { setCfgDirty(true); setTerm2StartsOn(e.target.value); }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 190 }} />
          <Button variant={cfgDirty ? 'contained' : 'outlined'} onClick={saveConfig} disabled={busy || !cfgDirty}>
            {cfgDirty ? 'Save setting' : 'Saved'}
          </Button>
        </Stack>
        <FormControlLabel sx={{ mt: 1 }} control={<Checkbox size="small" checked={remarkReq} onChange={(e) => { setCfgDirty(true); setRemarkReq(e.target.checked); }} />}
          label={<Typography variant="body2">Require the class-teacher remark for the final term (Term 2) — never for Term 1</Typography>} />
      </CardContent></Card>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup exclusive size="small" value={band} onChange={(_, v) => v && setBand(v)}>
          {BANDS.map((b) => <ToggleButton key={b.band} value={b.band} sx={{ px: 2 }}>{b.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        <Button variant={dirty ? 'contained' : 'outlined'} onClick={save} disabled={busy || !data || !dirty}>{dirty ? 'Save format' : 'No changes'}</Button>
      </Stack>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : data && (
        <Stack spacing={2}>
          {/* Subjects */}
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Subjects</Typography>
            {data.subjects.length === 0 ? <Typography variant="body2" color="text.secondary">No subjects (this band is grade-only).</Typography> : (
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small">
                <TableHead><TableRow><TableCell>Order</TableCell><TableCell>Code</TableCell><TableCell>Printed label</TableCell><TableCell>Syllabus subject(s) — comma list for teacher access</TableCell><TableCell>Grades (blank = all)</TableCell></TableRow></TableHead>
                <TableBody>{data.subjects.map((s, i) => (
                  <TableRow key={s.uuid}>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 0.5 }}>
                      <IconButton size="small" disabled={i === 0} onClick={() => moveRow('subjects', s.uuid, -1)}><KeyboardArrowUp fontSize="small" /></IconButton>
                      <IconButton size="small" disabled={i === data.subjects.length - 1} onClick={() => moveRow('subjects', s.uuid, 1)}><KeyboardArrowDown fontSize="small" /></IconButton>
                    </TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={s.code} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={s.reportLabel || ''} onChange={(e) => setField('subjects', s.uuid, 'reportLabel', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={s.syllabusSubject || ''} onChange={(e) => setField('subjects', s.uuid, 'syllabusSubject', e.target.value)} placeholder="e.g. English,English I" /></TableCell>
                    <TableCell><TextField size="small" sx={{ minWidth: 130 }} value={s.appliesToGrades || ''} onChange={(e) => setField('subjects', s.uuid, 'appliesToGrades', e.target.value)} placeholder="e.g. VI,VII,VIII" /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></Paper>
            )}
          </CardContent></Card>

          {/* Components */}
          {data.components.length > 0 && (
            <Card variant="outlined"><CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mark columns (per term)</Typography>
                <Box sx={{ flex: 1 }} />
                <ToggleButtonGroup exclusive size="small" value={termFilter} onChange={(_, v) => v != null && setTermFilter(v)}>
                  <ToggleButton value={0} sx={{ px: 1.5 }}>Both</ToggleButton>
                  <ToggleButton value={1} sx={{ px: 1.5 }}>Term 1</ToggleButton>
                  <ToggleButton value={2} sx={{ px: 1.5 }}>Term 2</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small">
                <TableHead><TableRow><TableCell>Term</TableCell><TableCell>Applies to</TableCell><TableCell>Code</TableCell><TableCell>Label</TableCell><TableCell align="right">Max</TableCell></TableRow></TableHead>
                <TableBody>{data.components.filter((c) => !termFilter || c.term === termFilter).map((c) => (
                  <TableRow key={c.uuid}>
                    <TableCell>{c.term}</TableCell>
                    <TableCell>{c.subjectCode
                      ? <Chip size="small" color="warning" variant="outlined" label={c.subjectCode} />
                      : <Typography variant="caption" color="text.secondary">all subjects</Typography>}</TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={c.code} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={c.label || ''} onChange={(e) => setField('components', c.uuid, 'label', e.target.value)} /></TableCell>
                    <TableCell align="right"><TextField size="small" type="number" sx={{ width: 90 }} value={c.maxMarks ?? ''} onChange={(e) => setField('components', c.uuid, 'maxMarks', e.target.value)} inputProps={{ min: 0, style: { textAlign: 'right' } }} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></Paper>
            </CardContent></Card>
          )}

          {/* Areas — grouped by section, reorderable */}
          {data.areas.length > 0 && (() => {
            const groups = [];
            data.areas.forEach((a) => { let g = groups.find((x) => x.name === a.section); if (!g) { g = { name: a.section, items: [] }; groups.push(g); } g.items.push(a); });
            return (
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Co-scholastic / other areas</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Grouped by section. Use the arrows to reorder areas within a section, or move a whole section. This is the order they print on the card.
                </Typography>
                <Stack spacing={1.5}>
                  {groups.map((g, gi) => (
                    <Paper key={g.name} variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'action.hover', px: 1, py: 0.5 }}>
                        <IconButton size="small" disabled={gi === 0} onClick={() => moveSection(g.name, -1)}><KeyboardArrowUp fontSize="small" /></IconButton>
                        <IconButton size="small" disabled={gi === groups.length - 1} onClick={() => moveSection(g.name, 1)}><KeyboardArrowDown fontSize="small" /></IconButton>
                        <TextField variant="standard" value={g.name} onChange={(e) => renameSection(g.name, e.target.value)} sx={{ minWidth: 240 }} InputProps={{ sx: { fontWeight: 700 } }} />
                      </Stack>
                      <Table size="small">
                        <TableBody>{g.items.map((a, ai) => (
                          <TableRow key={a.uuid}>
                            <TableCell sx={{ whiteSpace: 'nowrap', px: 0.5, width: 96 }}>
                              <IconButton size="small" disabled={ai === 0} onClick={() => moveArea(a.uuid, -1)}><KeyboardArrowUp fontSize="small" /></IconButton>
                              <IconButton size="small" disabled={ai === g.items.length - 1} onClick={() => moveArea(a.uuid, 1)}><KeyboardArrowDown fontSize="small" /></IconButton>
                            </TableCell>
                            <TableCell><TextField size="small" fullWidth value={a.label || ''} onChange={(e) => setField('areas', a.uuid, 'label', e.target.value)} /></TableCell>
                            <TableCell sx={{ width: 88 }}>{a.valueType === 'marks'
                              ? <TextField size="small" type="number" sx={{ width: 68 }} label="max" value={a.maxMarks ?? ''} onChange={(e) => setField('areas', a.uuid, 'maxMarks', e.target.value)} InputLabelProps={{ shrink: true }} />
                              : <Chip size="small" variant="outlined" label={a.valueType} />}</TableCell>
                            <TableCell sx={{ width: 138 }}>{a.valueType === 'marks'
                              ? <Chip size="small" label="per-class out-of" variant={a.denominatorEditable ? 'filled' : 'outlined'} color={a.denominatorEditable ? 'warning' : 'default'} onClick={() => setField('areas', a.uuid, 'denominatorEditable', a.denominatorEditable ? null : 1)} />
                              : null}</TableCell>
                          </TableRow>
                        ))}</TableBody>
                      </Table>
                    </Paper>
                  ))}
                </Stack>
              </CardContent></Card>
            );
          })()}

          {/* Grade scales */}
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grading legend</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Applies to <b>{BANDS.find((b) => b.band === band)?.label}</b> only. Each band keeps its own copy — editing here does not change the other bands.
            </Typography>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small">
              <TableHead><TableRow><TableCell>Kind</TableCell><TableCell>Grade</TableCell><TableCell>Label</TableCell><TableCell align="right">Min</TableCell><TableCell align="right">Max</TableCell></TableRow></TableHead>
              <TableBody>{data.gradeScales.map((g) => {
                const hasRange = g.kind === 'scholastic' || g.minPct != null || g.maxPct != null || g.kind === 'coscholastic' || g.kind === 'coscholastic10';
                return (
                <TableRow key={g.uuid}>
                  <TableCell>{g.kind === 'coscholastic10' ? 'co-sch (/10)' : g.kind === 'coscholastic' ? 'co-sch (/100)' : g.kind}</TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={g.grade} /></TableCell>
                  <TableCell><TextField size="small" fullWidth value={g.label || ''} onChange={(e) => setField('gradeScales', g.uuid, 'label', e.target.value)} /></TableCell>
                  <TableCell align="right">{hasRange ? <TextField size="small" type="number" sx={{ width: 80 }} value={g.minPct ?? ''} onChange={(e) => setField('gradeScales', g.uuid, 'minPct', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /> : '—'}</TableCell>
                  <TableCell align="right">{hasRange ? <TextField size="small" type="number" sx={{ width: 80 }} value={g.maxPct ?? ''} onChange={(e) => setField('gradeScales', g.uuid, 'maxPct', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /> : '—'}</TableCell>
                </TableRow>
                );
              })}</TableBody>
            </Table></Paper>
          </CardContent></Card>

          <Box><Button variant={dirty ? 'contained' : 'outlined'} onClick={save} disabled={busy || !dirty}>{dirty ? 'Save format' : 'No changes'}</Button></Box>
        </Stack>
      )}
    </Box>
  );
}
