import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Alert, CircularProgress, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');

// Read-only exam datesheet, open to every staff member (the schedule of published exams).
export default function ExamSchedule() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    examinationService.mySchedule()
      .then((e) => { setExams(e); if (e.length) setExamId(e[0].uuid); })
      .catch((x) => setErr(x.response?.data?.error?.description || 'Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const loadGrid = useCallback(async (id) => {
    if (!id) { setGrid(null); return; }
    setGridLoading(true); setErr('');
    try { setGrid(await examinationService.myScheduleGrid(id)); }
    catch (x) { setErr(x.response?.data?.error?.description || 'Failed to load the datesheet'); }
    finally { setGridLoading(false); }
  }, []);
  useEffect(() => { loadGrid(examId); }, [examId, loadGrid]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const grades = grid?.grades || [];
  const dates = grid?.dates || [];
  const cell = (grade, date) => (grid?.papers || []).find((p) => p.grade === grade && p.examDate === date)?.subjectLabel;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Exam Schedule</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>The datesheet for the school's published examinations.</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {exams.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary">No published examinations yet.</Typography></CardContent></Card>
      ) : (
        <>
          <TextField
            select size="small" label="Examination" sx={{ minWidth: 260, mb: 2 }}
            value={examId} onChange={(e) => setExamId(e.target.value)}
          >
            {exams.map((e) => <MenuItem key={e.uuid} value={e.uuid}>{e.name}</MenuItem>)}
          </TextField>

          {gridLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : !grades.length ? (
            <Alert severity="info">No datesheet has been entered for this exam yet.</Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: 2 }}>
              <Table
                size="small" stickyHeader
                sx={{
                  minWidth: 260 + grades.length * 150,
                  '& thead th': {
                    bgcolor: 'action.hover', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase',
                    letterSpacing: 0.6, color: 'text.secondary', borderBottom: 2, borderColor: 'divider', whiteSpace: 'nowrap',
                  },
                  '& tbody tr:hover': { bgcolor: 'action.hover' },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 150 }}>Date</TableCell>
                    <TableCell sx={{ minWidth: 90 }}>Day</TableCell>
                    {grades.map((g) => <TableCell key={g.grade} sx={{ color: 'primary.main !important' }}>{g.grade}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dates.map((d) => (
                    <TableRow key={d}>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtDate(d)}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{dayOf(d)}</TableCell>
                      {grades.map((g) => (
                        <TableCell key={g.grade}>{cell(g.grade, d) || <span style={{ opacity: 0.3 }}>—</span>}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
