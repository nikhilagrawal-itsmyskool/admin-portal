import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Alert, CircularProgress, Paper,
  Stack, Chip, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { examinationService } from '../../services/examinationService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate } from '../../utils/date';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d, short) => (d ? (short ? DOW_S : DOW)[new Date(`${d}T00:00:00`).getDay()] : '');

// Read-only exam datesheet, open to every staff member (the schedule of published exams).
// Desktop shows the full grid; phones default to a date-wise card list (day + papers),
// with By-grade and an opt-in Full-sheet — never a wide table by default on mobile.
export default function ExamSchedule() {
  const isMobile = useIsMobile();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [err, setErr] = useState('');
  const [view, setView] = useState('date'); // mobile: date | grade | sheet
  const [grade, setGrade] = useState('');

  useEffect(() => {
    examinationService.mySchedule()
      .then((e) => { setExams(e); if (e.length) setExamId(e[0].uuid); })
      .catch((x) => setErr(x.response?.data?.error?.description || 'Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const loadGrid = useCallback(async (id) => {
    if (!id) { setGrid(null); return; }
    setGridLoading(true); setErr('');
    try {
      const g = await examinationService.myScheduleGrid(id);
      setGrid(g);
      setGrade((cur) => cur || g.grades?.[0]?.grade || '');
    } catch (x) { setErr(x.response?.data?.error?.description || 'Failed to load the datesheet'); }
    finally { setGridLoading(false); }
  }, []);
  useEffect(() => { loadGrid(examId); }, [examId, loadGrid]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const grades = grid?.grades || [];
  const dates = grid?.dates || [];
  const subjectFor = (g, d) => (grid?.papers || []).find((p) => p.grade === g && p.examDate === d)?.subjectLabel;

  const datesheet = () => {
    if (gridLoading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
    if (!grades.length) return <Alert severity="info">No datesheet has been entered for this exam yet.</Alert>;

    // ── Desktop: the full grid table ──
    if (!isMobile) {
      return (
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
                    <TableCell key={g.grade}>{subjectFor(g.grade, d) || <span style={{ opacity: 0.3 }}>—</span>}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      );
    }

    // ── Mobile: date-wise cards (default), by-grade, or opt-in full sheet ──
    return (
      <>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="date" sx={{ px: 1.25, py: 0.3 }}>By date</ToggleButton>
            <ToggleButton value="grade" sx={{ px: 1.25, py: 0.3 }}>By grade</ToggleButton>
            <ToggleButton value="sheet" sx={{ px: 1.25, py: 0.3 }}>Full sheet</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {view === 'date' ? (
          <Stack spacing={1}>
            {dates.map((d) => (
              <Paper key={d} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{fmtDate(d)} · {dayOf(d)}</Typography>
                <Stack spacing={0.25}>
                  {grades.map((g) => {
                    const s = subjectFor(g.grade, d);
                    return s ? (
                      <Stack key={g.grade} direction="row" justifyContent="space-between" gap={1}>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700, minWidth: 40 }}>{g.grade}</Typography>
                        <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>{s}</Typography>
                      </Stack>
                    ) : null;
                  })}
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : view === 'grade' ? (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
              {grades.map((g) => (
                <Chip key={g.grade} label={g.grade} onClick={() => setGrade(g.grade)}
                  color={g.grade === grade ? 'primary' : 'default'} variant={g.grade === grade ? 'filled' : 'outlined'} />
              ))}
            </Box>
            <Stack spacing={1}>
              {dates.map((d) => {
                const s = subjectFor(grade, d);
                return s ? (
                  <Paper key={d} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{ textAlign: 'center', minWidth: 44 }}>
                      <Typography sx={{ fontWeight: 800, lineHeight: 1 }}>{d.slice(8, 10)}</Typography>
                      <Typography variant="caption" color="text.secondary">{fmtDate(d).slice(3)}</Typography>
                    </Box>
                    <Typography sx={{ flex: 1, fontWeight: 600 }}>{s}</Typography>
                    <Typography variant="caption" color="text.secondary">{dayOf(d, true)}</Typography>
                  </Paper>
                ) : null;
              })}
              {!dates.some((d) => subjectFor(grade, d)) && (
                <Typography color="text.secondary" sx={{ py: 1 }}>No papers for Grade {grade}.</Typography>
              )}
            </Stack>
          </>
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
                    <TableCell sx={{ fontWeight: 600 }}>{fmtDate(d)} · {dayOf(d, true)}</TableCell>
                    {grades.map((g) => <TableCell key={g.grade}>{subjectFor(g.grade, d) || '—'}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </>
    );
  };

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
            select size="small" label="Examination"
            sx={{ minWidth: 260, mb: 2, width: isMobile ? '100%' : undefined }}
            value={examId} onChange={(e) => setExamId(e.target.value)}
          >
            {exams.map((e) => <MenuItem key={e.uuid} value={e.uuid}>{e.name}</MenuItem>)}
          </TextField>

          {datesheet()}
        </>
      )}
    </Box>
  );
}
