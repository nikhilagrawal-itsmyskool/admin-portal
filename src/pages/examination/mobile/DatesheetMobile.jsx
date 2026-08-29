import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, Alert, CircularProgress, Paper, IconButton, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  ToggleButton, ToggleButtonGroup, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Print as PrintIcon } from '@mui/icons-material';
import { useCan } from '../../../permissions/can';
import { examinationService } from '../../../services/examinationService';
import { printDatesheet } from '../datesheetHtml';
import { fmtDate } from '../../../utils/date';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');

export default function DatesheetMobile() {
  const { id } = useParams();
  const canManage = useCan()('exam.manage');

  const [grid, setGrid] = useState(null);
  const [grade, setGrade] = useState('');
  const [rows, setRows] = useState([]); // {key,date,subject} for the selected grade
  const [view, setView] = useState('grade');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState(null); // {key?, date, subject}
  const keyRef = useRef(1);

  const rowsFor = useCallback((g, gr) => (gr?.papers || [])
    .filter((p) => p.grade === g)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))
    .map((p) => ({ key: keyRef.current++, date: p.examDate, subject: p.subjectLabel })), []);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const g = await examinationService.getGrid(id);
      setGrid(g);
      const first = g.grades?.[0]?.grade || '';
      setGrade((cur) => cur || first);
      setRows(rowsFor((grade || first), g));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the datesheet');
    } finally { setLoading(false); }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (grid) setRows(rowsFor(grade, grid)); }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveEdit = () => {
    const date = edit.date; const subject = (edit.subject || '').trim();
    if (!date || !subject) return;
    setRows((r) => {
      const others = r.filter((x) => x.key !== edit.key && x.date !== date);
      return [...others, { key: edit.key ?? keyRef.current++, date, subject }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setEdit(null);
  };
  const removeRow = (key) => setRows((r) => r.filter((x) => x.key !== key));

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const papers = rows.filter((r) => r.date && r.subject.trim()).map((r) => ({ examDate: r.date, subjectLabel: r.subject.trim() }));
      const g = await examinationService.savePapersForGrade(id, grade, papers);
      setGrid(g); setRows(rowsFor(grade, g));
      setMsg(`Saved Grade ${grade}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setSaving(false); }
  };

  const printPdf = async () => {
    if (!grid) return;
    setErr('');
    try {
      const [exam, brand] = await Promise.all([examinationService.get(id), examinationService.getBranding().catch(() => ({}))]);
      printDatesheet({
        examName: exam.name, grades: grid.grades, dates: grid.dates, papers: grid.papers,
        logoDataUri: brand?.logoDataUri,
        notes: (exam.datesheetNotes || '').split('\n').map((s) => s.trim()).filter(Boolean),
      });
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to prepare the PDF'); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  const grades = grid?.grades || [];
  const dates = grid?.dates || [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">Datesheet</Typography>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <IconButton size="small" onClick={printPdf} title="Print datesheet" disabled={!dates.length}><PrintIcon fontSize="small" /></IconButton>
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="grade" sx={{ px: 1.25, py: 0.3 }}>By grade</ToggleButton>
            <ToggleButton value="date" sx={{ px: 1.25, py: 0.3 }}>By date</ToggleButton>
            <ToggleButton value="sheet" sx={{ px: 1.25, py: 0.3 }}>Full sheet</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {!grades.length ? (
        <Alert severity="info">No graded sections for this exam's year. Set it up on desktop.</Alert>
      ) : view === 'grade' ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
            {grades.map((g) => (
              <Chip key={g.grade} label={g.grade} onClick={() => setGrade(g.grade)}
                color={g.grade === grade ? 'primary' : 'default'} variant={g.grade === grade ? 'filled' : 'outlined'} />
            ))}
          </Box>
          <Stack spacing={1}>
            {rows.map((r) => (
              <Paper key={r.key} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ textAlign: 'center', minWidth: 44 }}>
                  <Typography sx={{ fontWeight: 800, lineHeight: 1 }}>{r.date.slice(8, 10)}</Typography>
                  <Typography variant="caption" color="text.secondary">{fmtDate(r.date).slice(3)}</Typography>
                </Box>
                <Typography sx={{ flex: 1, fontWeight: 600 }}>{r.subject}</Typography>
                <Typography variant="caption" color="text.secondary">{dayOf(r.date)}</Typography>
                {canManage && <>
                  <IconButton size="small" onClick={() => setEdit({ key: r.key, date: r.date, subject: r.subject })}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => removeRow(r.key)}><DeleteIcon fontSize="small" /></IconButton>
                </>}
              </Paper>
            ))}
            {!rows.length && <Typography color="text.secondary" sx={{ py: 1 }}>No papers for Grade {grade} yet.</Typography>}
            {canManage && (
              <>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEdit({ date: '', subject: '' })}>Add date</Button>
                <Button variant="contained" onClick={save} disabled={saving}>Save Grade {grade}</Button>
              </>
            )}
          </Stack>
        </>
      ) : view === 'date' ? (
        <Stack spacing={1}>
          {dates.map((d) => (
            <Paper key={d} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{fmtDate(d)} · {dayOf(d)}</Typography>
              <Stack spacing={0.25}>
                {grades.map((g) => {
                  const s = grid.papers.find((p) => p.grade === g.grade && p.examDate === d)?.subjectLabel;
                  return s ? (
                    <Stack key={g.grade} direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, minWidth: 40 }}>{g.grade}</Typography>
                      <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>{s}</Typography>
                    </Stack>
                  ) : null;
                })}
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 120 + grades.length * 110, '& th,& td': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                {grades.map((g) => <TableCell key={g.grade} sx={{ fontWeight: 700, color: 'primary.main' }}>{g.grade}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {dates.map((d) => (
                <TableRow key={d}>
                  <TableCell sx={{ fontWeight: 600 }}>{fmtDate(d)} · {dayOf(d)}</TableCell>
                  {grades.map((g) => (
                    <TableCell key={g.grade}>{grid.papers.find((p) => p.grade === g.grade && p.examDate === d)?.subjectLabel || '—'}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Edit / add a paper */}
      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{edit?.key ? 'Edit paper' : 'Add paper'} · Grade {grade}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField type="date" label="Date" value={edit?.date || ''} onChange={(e) => setEdit((x) => ({ ...x, date: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="Subject" value={edit?.subject || ''} onChange={(e) => setEdit((x) => ({ ...x, subject: e.target.value }))} fullWidth multiline placeholder="e.g. English - I" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={!edit?.date || !(edit?.subject || '').trim()}>Done</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
