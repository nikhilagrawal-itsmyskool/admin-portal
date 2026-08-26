import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Button, Alert, CircularProgress, Stack, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TextField, Typography, Autocomplete, Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');

// Editable grade × date datesheet. Rows are dates the office adds; each grade column
// holds a free-text subject (blank cell = no paper / "---"). Save replaces the full set.
export default function DatesheetGrid({ examId, canManage, onChanged }) {
  const [grades, setGrades] = useState([]);
  const [availableGrades, setAvailableGrades] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gradesSaving, setGradesSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const keyRef = useRef(1);

  const buildRows = useCallback((grid) => {
    return (grid.dates || []).map((date) => {
      const subjects = {};
      for (const p of grid.papers || []) {
        if (p.examDate === date) subjects[p.grade] = p.subjectLabel;
      }
      return { key: keyRef.current++, date, subjects };
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const grid = await examinationService.getGrid(examId);
      setGrades(grid.grades || []);
      setAvailableGrades(grid.availableGrades || grid.grades || []);
      setRows(buildRows(grid));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the datesheet');
    } finally { setLoading(false); }
  }, [examId, buildRows]);

  const updateGrades = async (nextGrades) => {
    setGradesSaving(true); setErr('');
    try {
      await examinationService.update(examId, { grades: nextGrades });
      await load();
      onChanged?.();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to update the exam grades');
    } finally { setGradesSaving(false); }
  };

  useEffect(() => { load(); }, [load]);

  const addRow = () => setRows((r) => [...r, { key: keyRef.current++, date: '', subjects: {} }]);
  const removeRow = (key) => setRows((r) => r.filter((row) => row.key !== key));
  const setDate = (key, date) => setRows((r) => r.map((row) => (row.key === key ? { ...row, date } : row)));
  const setSubject = (key, grade, val) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, subjects: { ...row.subjects, [grade]: val } } : row)));

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const papers = [];
      for (const row of rows) {
        if (!row.date) continue;
        for (const g of grades) {
          const label = (row.subjects[g.grade] || '').trim();
          if (label) papers.push({ grade: g.grade, examDate: row.date, subjectLabel: label });
        }
      }
      const grid = await examinationService.savePapers(examId, papers);
      setGrades(grid.grades || []);
      setRows(buildRows(grid));
      setMsg(`Saved ${grid.papers.length} paper${grid.papers.length === 1 ? '' : 's'}.`);
      onChanged?.();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save the datesheet');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  if (!availableGrades.length) {
    return (
      <Alert severity="info">
        No graded sections found for this exam's academic year, so there are no grade columns to fill.
        Enrol students into classes first, then return here to build the datesheet.
      </Alert>
    );
  }

  const dupDates = rows.filter((r) => r.date).map((r) => r.date);
  const hasDup = new Set(dupDates).size !== dupDates.length;

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {hasDup && <Alert severity="warning" sx={{ mb: 2 }}>Two rows share a date — the last value per grade wins on save.</Alert>}

      {canManage && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
          <Autocomplete
            multiple size="small" sx={{ minWidth: 320, flex: 1 }} disabled={gradesSaving}
            options={availableGrades.map((g) => g.grade)}
            value={grades.map((g) => g.grade)}
            onChange={(_, v) => updateGrades(v)}
            renderTags={(value, getTagProps) => value.map((option, index) => (
              <Chip size="small" label={option} {...getTagProps({ index })} key={option} />
            ))}
            renderInput={(p) => <TextField {...p} label="Grades in this exam" placeholder="Add / remove grades" />}
          />
          <Typography variant="caption" color="text.secondary">
            Only these grades show as columns. Drop the ones this exam doesn't cover.
          </Typography>
        </Stack>
      )}

      {!grades.length && (
        <Alert severity="info" sx={{ mb: 2 }}>Pick at least one grade above to start building the datesheet.</Alert>
      )}

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 260 + grades.length * 160 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 96 }}>Day</TableCell>
              {grades.map((g) => (
                <TableCell key={g.grade} sx={{ fontWeight: 700, minWidth: 150 }}>{g.grade}</TableCell>
              ))}
              {canManage && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} sx={{ verticalAlign: 'top' }}>
                <TableCell>
                  {canManage ? (
                    <TextField
                      type="date" size="small" value={row.date}
                      onChange={(e) => setDate(row.key, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  ) : (row.date || '—')}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap', pt: canManage ? 1.75 : undefined }}>
                  {dayOf(row.date)}
                </TableCell>
                {grades.map((g) => (
                  <TableCell key={g.grade}>
                    {canManage ? (
                      <TextField
                        size="small" fullWidth multiline placeholder="—"
                        value={row.subjects[g.grade] || ''}
                        onChange={(e) => setSubject(row.key, g.grade, e.target.value)}
                      />
                    ) : (row.subjects[g.grade] || <span style={{ opacity: 0.4 }}>—</span>)}
                  </TableCell>
                ))}
                {canManage && (
                  <TableCell>
                    <Tooltip title="Remove date">
                      <IconButton size="small" color="error" onClick={() => removeRow(row.key)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={grades.length + 3}>
                  <Typography color="text.secondary" sx={{ py: 1 }}>No dates yet. Add the first exam date.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {canManage && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button startIcon={<AddIcon />} onClick={addRow}>Add date</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
            Save datesheet
          </Button>
        </Stack>
      )}
    </Box>
  );
}
