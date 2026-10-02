import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, ToggleButton, ToggleButtonGroup, Checkbox, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell, Paper,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { Print as PrintIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { printReportCards, buildReportCardsHtml } from './reportCardHtml';

// Shrink a photo data URI to a print-sized JPEG (keeps the whole-class print payload small and
// the printed image crisp). Resolves null on any decode failure so one bad photo can't block print.
function resizeDataUri(dataUri, maxW = 200, maxH = 260) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const cw = Math.max(1, Math.round(img.width * scale));
      const ch = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      try { c.getContext('2d').drawImage(img, 0, 0, cw, ch); resolve(c.toDataURL('image/jpeg', 0.82)); }
      catch { resolve(dataUri); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUri;
  });
}

// Run async tasks with a small concurrency cap (photos fetched a few at a time, not 30 at once).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  });
  await Promise.all(workers);
  return out;
}

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
  const [preparing, setPreparing] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pendingPrint, setPendingPrint] = useState(null); // { studentIds, count } awaiting "did it print?" confirm
  const photoCache = useRef(new Map()); // studentId -> resized data URI (null = no photo)

  const loadClasses = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await examinationService.reportClasses();
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

  // Pre-primary cards carry a photo; fetch it per student (kept off the class payload) and resize
  // to a print-sized JPEG, cached so a re-print doesn't refetch. Other bands have no photo.
  const withPhotos = async (students) => {
    if (!data || data.band !== 'pre-primary') return students;
    const cache = photoCache.current;
    const need = students.filter((s) => s.photoFileId && !cache.has(s.studentId));
    if (need.length) {
      setPreparing(true);
      try {
        await mapLimit(need, 5, async (s) => {
          try {
            const { dataUri } = await examinationService.reportPhoto(s.studentId);
            cache.set(s.studentId, dataUri ? await resizeDataUri(dataUri) : null);
          } catch { cache.set(s.studentId, null); }
        });
      } finally { setPreparing(false); }
    }
    return students.map((s) => ({ ...s, photoDataUri: cache.get(s.studentId) ?? s.photoDataUri ?? null }));
  };

  // Print directly (hidden iframe → browser print dialog). We only record the print AFTER the user
  // confirms it actually printed — afterprint fires on Cancel too, so an optimistic count was wrong.
  const doPrint = async (students) => {
    if (!students.length || preparing) return;
    const withPics = await withPhotos(students);
    const ids = students.map((s) => s.studentId);
    printReportCards(data, withPics, () => setPendingPrint({ studentIds: ids, count: ids.length }));
  };

  const confirmPrinted = async () => {
    const pp = pendingPrint; setPendingPrint(null);
    if (!pp) return;
    try {
      const r = await examinationService.recordReportPrint(classId, term, pp.studentIds);
      setData((d) => ({ ...d, students: d.students.map((s) => (pp.studentIds.includes(s.studentId) ? { ...s, printCount: (s.printCount || 0) + 1 } : s)) }));
      setMsg(`Marked ${r.printed} card(s) printed.`);
    } catch { /* best effort */ }
  };

  const preview = async (student) => {
    if (preparing) return;
    const [withPic] = await withPhotos([student]);
    const html = buildReportCardsHtml(data, [withPic]);
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
            <Button variant="outlined" startIcon={<PrintIcon />} disabled={busy || preparing || !selected.length} onClick={() => doPrint(selected)}>
              Print selected ({selected.length})
            </Button>
            <Button variant="contained" startIcon={<PrintIcon />} disabled={busy || preparing || !data?.students?.length} onClick={() => doPrint(data.students)}>
              Print whole class
            </Button>
          </Stack>

          {(busy && !data) || preparing ? <LinearProgress sx={{ mb: 2 }} /> : null}
          {preparing && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Preparing photos…</Typography>}

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
                    <TableCell align="right">Actions</TableCell>
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
                      <TableCell align="right">
                        <Button size="small" disabled={preparing} startIcon={<PrintIcon fontSize="small" />} onClick={() => doPrint([s])} sx={{ mr: 1 }}>Print</Button>
                        <Button size="small" color="inherit" disabled={preparing} startIcon={<PreviewIcon fontSize="small" />} onClick={() => preview(s)} sx={{ color: 'text.secondary' }}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data.students.length && <TableRow><TableCell colSpan={7}><Alert severity="info">No students in this class.</Alert></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>
          )}
        </>
      )}

      <Dialog open={!!pendingPrint} onClose={() => setPendingPrint(null)}>
        <DialogTitle>Did the cards print?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingPrint ? `Mark ${pendingPrint.count} card${pendingPrint.count === 1 ? '' : 's'} as printed? Only confirm if they actually printed — the count and date are recorded per student.` : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingPrint(null)}>Not printed</Button>
          <Button variant="contained" onClick={confirmPrinted}>Yes, mark printed</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
