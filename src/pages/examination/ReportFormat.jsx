import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Button,
  TextField, ToggleButton, ToggleButtonGroup, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Chip,
} from '@mui/material';
import { examinationService } from '../../services/examinationService';

const BANDS = [
  { band: 'pre-primary', label: 'Pre-Primary' },
  { band: '1-3', label: 'Classes 1–3' },
  { band: '4-5', label: 'Classes 4–5' },
  { band: '6-9', label: 'Classes 6–9' },
];

// Report Format config (Manage, exam.manage — desktop). Edit the labels printed on the card:
// subject names, the mark-column labels + max, the co-scholastic area names, and the grading
// legend. Codes are fixed (marks reference them), so this is edit-only — no add/remove here.
export default function ReportFormat() {
  const [band, setBand] = useState('pre-primary');
  const [termFilter, setTermFilter] = useState(0); // 0 = both terms, 1, or 2
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setMsg('');
    try { setData(await examinationService.getReportScheme(band)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load the format'); setData(null); }
    finally { setLoading(false); }
  }, [band]);
  useEffect(() => { load(); }, [load]);

  const setField = (list, uuid, field, value) => setData((d) => ({ ...d, [list]: d[list].map((r) => (r.uuid === uuid ? { ...r, [field]: value } : r)) }));

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const payload = {
        subjects: data.subjects.map((s) => ({ uuid: s.uuid, reportLabel: s.reportLabel, syllabusSubject: s.syllabusSubject })),
        components: data.components.map((c) => ({ uuid: c.uuid, label: c.label, maxMarks: c.maxMarks })),
        areas: data.areas.map((a) => ({ uuid: a.uuid, section: a.section, label: a.label })),
        gradeScales: data.gradeScales.map((g) => ({ uuid: g.uuid, label: g.label, minPct: g.minPct, maxPct: g.maxPct })),
      };
      setData(await examinationService.saveReportScheme(band, payload));
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

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup exclusive size="small" value={band} onChange={(_, v) => v && setBand(v)}>
          {BANDS.map((b) => <ToggleButton key={b.band} value={b.band} sx={{ px: 2 }}>{b.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={save} disabled={busy || !data}>Save format</Button>
      </Stack>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : data && (
        <Stack spacing={2}>
          {/* Subjects */}
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Subjects</Typography>
            {data.subjects.length === 0 ? <Typography variant="body2" color="text.secondary">No subjects (this band is grade-only).</Typography> : (
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small">
                <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Printed label</TableCell><TableCell>Syllabus subject(s) — comma list for teacher access</TableCell></TableRow></TableHead>
                <TableBody>{data.subjects.map((s) => (
                  <TableRow key={s.uuid}>
                    <TableCell><Chip size="small" variant="outlined" label={s.code} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={s.reportLabel || ''} onChange={(e) => setField('subjects', s.uuid, 'reportLabel', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={s.syllabusSubject || ''} onChange={(e) => setField('subjects', s.uuid, 'syllabusSubject', e.target.value)} placeholder="e.g. English,English I" /></TableCell>
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
                <TableHead><TableRow><TableCell>Term</TableCell><TableCell>Code</TableCell><TableCell>Label</TableCell><TableCell align="right">Max</TableCell></TableRow></TableHead>
                <TableBody>{data.components.filter((c) => !termFilter || c.term === termFilter).map((c) => (
                  <TableRow key={c.uuid}>
                    <TableCell>{c.term}</TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={c.code} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={c.label || ''} onChange={(e) => setField('components', c.uuid, 'label', e.target.value)} /></TableCell>
                    <TableCell align="right"><TextField size="small" type="number" sx={{ width: 90 }} value={c.maxMarks ?? ''} onChange={(e) => setField('components', c.uuid, 'maxMarks', e.target.value)} inputProps={{ min: 0, style: { textAlign: 'right' } }} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></Paper>
            </CardContent></Card>
          )}

          {/* Areas */}
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Co-scholastic / other areas</Typography>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small">
              <TableHead><TableRow><TableCell>Section</TableCell><TableCell>Label</TableCell><TableCell>Type</TableCell></TableRow></TableHead>
              <TableBody>{data.areas.map((a) => (
                <TableRow key={a.uuid}>
                  <TableCell><TextField size="small" sx={{ minWidth: 180 }} value={a.section || ''} onChange={(e) => setField('areas', a.uuid, 'section', e.target.value)} /></TableCell>
                  <TableCell><TextField size="small" fullWidth value={a.label || ''} onChange={(e) => setField('areas', a.uuid, 'label', e.target.value)} /></TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={a.valueType} /></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></Paper>
          </CardContent></Card>

          {/* Grade scales */}
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grading legend</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Applies to <b>{BANDS.find((b) => b.band === band)?.label}</b> only. Each band keeps its own copy — editing here does not change the other bands.
            </Typography>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}><Table size="small">
              <TableHead><TableRow><TableCell>Kind</TableCell><TableCell>Grade</TableCell><TableCell>Label</TableCell><TableCell align="right">Min %</TableCell><TableCell align="right">Max %</TableCell></TableRow></TableHead>
              <TableBody>{data.gradeScales.map((g) => (
                <TableRow key={g.uuid}>
                  <TableCell>{g.kind}</TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={g.grade} /></TableCell>
                  <TableCell><TextField size="small" fullWidth value={g.label || ''} onChange={(e) => setField('gradeScales', g.uuid, 'label', e.target.value)} /></TableCell>
                  <TableCell align="right">{g.kind === 'scholastic' ? <TextField size="small" type="number" sx={{ width: 80 }} value={g.minPct ?? ''} onChange={(e) => setField('gradeScales', g.uuid, 'minPct', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /> : '—'}</TableCell>
                  <TableCell align="right">{g.kind === 'scholastic' ? <TextField size="small" type="number" sx={{ width: 80 }} value={g.maxPct ?? ''} onChange={(e) => setField('gradeScales', g.uuid, 'maxPct', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /> : '—'}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></Paper>
          </CardContent></Card>

          <Box><Button variant="contained" onClick={save} disabled={busy}>Save format</Button></Box>
        </Stack>
      )}
    </Box>
  );
}
