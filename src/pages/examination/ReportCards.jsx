import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, ToggleButton, ToggleButtonGroup, Checkbox, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell, Paper,
} from '@mui/material';
import { Print as PrintIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { printReportCards, buildReportCardsHtml } from './reportCardHtml';

// Report Cards (exam.manage — incharge/admin/god). Pick a class + term, then preview / print the
// printed cards (single or the whole class) and record the print. Teachers don't see this.
export default function ReportCards() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState(1);
  const termSet = useRef(false);
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await examinationService.myReportClasses();
      setClasses(r.classes || []);
      if (!termSet.current) { termSet.current = true; if (r.currentTerm) setTerm(r.currentTerm); }
      setClassId((prev) => prev || ((r.classes || [])[0]?.classId || ''));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load classes');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadClasses(); }, [loadClasses]);

  const load = useCallback(async () => {
    if (!classId) { setData(null); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const d = await examinationService.reportCards(classId, term);
      setData(d); setSel(new Set());
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load report cards');
      setData(null);
    } finally { setBusy(false); }
  }, [classId, term]);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allIds = (data?.students || []).map((s) => s.studentId);
  const toggleAll = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  const doPrint = async (students) => {
    if (!students.length) return;
    printReportCards(data, students);
    try {
      const r = await examinationService.recordReportPrint(classId, term, students.map((s) => s.studentId));
      // reflect the new print counts locally
      setData((d) => ({ ...d, students: d.students.map((s) => (students.find((x) => x.studentId === s.studentId) ? { ...s, printCount: (s.printCount || 0) + 1 } : s)) }));
      setMsg(`Sent ${r.printed} card(s) to print.`);
    } catch { /* print already opened; recording is best-effort */ }
  };

  const preview = (student) => {
    const html = buildReportCardsHtml(data, [student]);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const selected = (data?.students || []).filter((s) => sel.has(s.studentId));

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Report Cards</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Preview and print report cards for a class. Printing records the count &amp; date per student.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {classes.length === 0 ? (
        <Alert severity="info">No classes with a report scheme this year.</Alert>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
            <TextField select size="small" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 200 }}>
              {classes.map((c) => <MenuItem key={c.classId} value={c.classId}>{c.className}</MenuItem>)}
            </TextField>
            <ToggleButtonGroup exclusive size="small" value={term} onChange={(_, v) => v && setTerm(v)}>
              <ToggleButton value={1} sx={{ px: 2 }}>Term 1</ToggleButton>
              <ToggleButton value={2} sx={{ px: 2 }}>Term 2</ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" startIcon={<PrintIcon />} disabled={busy || !selected.length} onClick={() => doPrint(selected)}>
              Print selected ({selected.length})
            </Button>
            <Button variant="contained" startIcon={<PrintIcon />} disabled={busy || !data?.students?.length} onClick={() => doPrint(data.students)}>
              Print whole class
            </Button>
          </Stack>

          {busy && !data && <LinearProgress sx={{ mb: 2 }} />}

          {data && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"><Checkbox size="small" checked={sel.size > 0 && sel.size === allIds.length} indeterminate={sel.size > 0 && sel.size < allIds.length} onChange={toggleAll} /></TableCell>
                    <TableCell>Roll</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Admission</TableCell>
                    {data.band !== 'pre-primary' && <TableCell align="right">Overall</TableCell>}
                    <TableCell align="center">Printed</TableCell>
                    <TableCell align="right">Preview</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.students.map((s) => (
                    <TableRow key={s.studentId} hover selected={sel.has(s.studentId)}>
                      <TableCell padding="checkbox"><Checkbox size="small" checked={sel.has(s.studentId)} onChange={() => toggle(s.studentId)} /></TableCell>
                      <TableCell>{s.rollNumber ?? ''}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.admissionNumber}</TableCell>
                      {data.band !== 'pre-primary' && <TableCell align="right">{s.overall.total != null ? `${s.overall.total}/${s.overall.max} · ${s.overall.percentage}%` : '—'}</TableCell>}
                      <TableCell align="center">{s.printCount ? <Chip size="small" color="success" variant="outlined" label={`×${s.printCount}`} /> : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                      <TableCell align="right"><Button size="small" startIcon={<PreviewIcon fontSize="small" />} onClick={() => preview(s)}>View</Button></TableCell>
                    </TableRow>
                  ))}
                  {!data.students.length && <TableRow><TableCell colSpan={7}><Alert severity="info">No students in this class.</Alert></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
