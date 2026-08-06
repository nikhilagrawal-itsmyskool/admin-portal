import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip, Tooltip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
  ToggleButton, ToggleButtonGroup, Button, Stack,
} from '@mui/material';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';

// Syllabus readiness board: one row per plan (year+grade+subject) showing, at a
// glance, whether the plan content is uploaded, teachers are aligned to every
// section, model papers exist, and how much coverage teachers have marked. Read
// -only status that links out to the editing screens (Plan / Offerings / Papers).
const EXAMS = [{ key: 'half_yearly', label: 'HY' }, { key: 'annual', label: 'Ann' }];

export default function Overview() {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [filter, setFilter] = useState({ academicYearId: '', grade: '' });
  const [rows, setRows] = useState([]);
  const [gap, setGap] = useState('all'); // all | content | teachers | papers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [yrs, grds] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          syllabusService.getGrades(),
        ]);
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        setGrades(grds || []);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        setFilter((f) => ({ ...f, academicYearId: cur?.uuid || '' }));
      } catch {
        setError('Failed to load overview filters');
      }
    })();
  }, []);

  useEffect(() => {
    if (!filter.academicYearId) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const data = await syllabusService.getOverview({ academicYearId: filter.academicYearId, grade: filter.grade || undefined });
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError('Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter.academicYearId, filter.grade]);

  const isUnderstaffed = (r) => r.sectionsTotal > 0 && r.sectionsStaffed < r.sectionsTotal;
  const hasPaper = (r) => (r.papers || []).length > 0;

  const summary = useMemo(() => {
    const total = rows.length;
    return {
      total,
      content: rows.filter((r) => r.hasContent).length,
      staffed: rows.filter((r) => r.sectionsTotal > 0 && r.sectionsStaffed >= r.sectionsTotal).length,
      papers: rows.filter(hasPaper).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    switch (gap) {
      case 'content': return rows.filter((r) => !r.hasContent);
      case 'teachers': return rows.filter((r) => r.sectionsStaffed === 0 || isUnderstaffed(r));
      case 'papers': return rows.filter((r) => !hasPaper(r));
      default: return rows;
    }
  }, [rows, gap]);

  const teacherChip = (r) => {
    if (r.sectionsTotal === 0) return <Typography variant="caption" color="text.secondary">no sections</Typography>;
    const full = r.sectionsStaffed >= r.sectionsTotal;
    const none = r.sectionsStaffed === 0;
    return (
      <Chip size="small" color={full ? 'success' : none ? 'error' : 'warning'} variant={full ? 'filled' : 'outlined'}
        label={`${r.sectionsStaffed}/${r.sectionsTotal}`} />
    );
  };

  const paperChips = (r) => (
    <Stack direction="row" spacing={0.5}>
      {EXAMS.map((ex) => {
        const p = (r.papers || []).find((x) => x.exam === ex.key);
        return (
          <Tooltip key={ex.key} title={p ? (p.answerKeyReleased ? 'Uploaded · answer key released' : 'Uploaded · answer key not released') : 'Not uploaded'}>
            <Chip size="small" variant={p ? 'filled' : 'outlined'} color={p ? 'success' : 'default'}
              label={`${ex.label} ${p ? '✓' : '✗'}`} />
          </Tooltip>
        );
      })}
    </Stack>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Syllabus Overview</Typography>
        <Typography variant="body2" color="text.secondary">Readiness at a glance — content, teachers, model papers, coverage.</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={filter.academicYearId}
                onChange={(e) => setFilter({ ...filter, academicYearId: e.target.value })}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Grade" value={filter.grade}
                onChange={(e) => setFilter({ ...filter, grade: e.target.value })}>
                <MenuItem value="">All grades</MenuItem>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <ToggleButtonGroup size="small" exclusive value={gap} onChange={(_, v) => v !== null && setGap(v)}>
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="content">Missing content</ToggleButton>
                <ToggleButton value="teachers">Understaffed</ToggleButton>
                <ToggleButton value="papers">No papers</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
          {!loading && rows.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <Chip size="small" label={`Content ${summary.content}/${summary.total}`} color={summary.content === summary.total ? 'success' : 'default'} />
              <Chip size="small" label={`Fully staffed ${summary.staffed}/${summary.total}`} color={summary.staffed === summary.total ? 'success' : 'default'} />
              <Chip size="small" label={`Papers ${summary.papers}/${summary.total}`} color={summary.papers === summary.total ? 'success' : 'default'} />
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 60, fontWeight: 600 }}>Grade</TableCell>
                    <TableCell sx={{ minWidth: 180, fontWeight: 600 }}>Subject</TableCell>
                    <TableCell sx={{ width: 120, fontWeight: 600 }}>Content</TableCell>
                    <TableCell sx={{ width: 100, fontWeight: 600 }}>Teachers</TableCell>
                    <TableCell sx={{ width: 150, fontWeight: 600 }}>Model Papers</TableCell>
                    <TableCell sx={{ width: 140, fontWeight: 600 }}>Coverage</TableCell>
                    <TableCell sx={{ width: 210, fontWeight: 600 }} align="right">Open</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      {rows.length === 0 ? 'No plans for this selection.' : 'Nothing matches this filter.'}
                    </TableCell></TableRow>
                  ) : visible.map((r) => (
                    <TableRow key={r.syllabusId} hover>
                      <TableCell>{r.grade}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.subjectName || '-'}</TableCell>
                      <TableCell>
                        {r.hasContent
                          ? <Tooltip title={r.hasSource ? 'Source .docx attached' : 'No source file attached'}>
                              <Chip size="small" color="success" variant="outlined" label={`✓ ${r.contentLeaves}`} />
                            </Tooltip>
                          : <Chip size="small" variant="outlined" label="✗ empty" />}
                      </TableCell>
                      <TableCell>{teacherChip(r)}</TableCell>
                      <TableCell>{paperChips(r)}</TableCell>
                      <TableCell>
                        {r.coveragePct == null ? (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={r.coveragePct} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                            <Typography variant="caption" sx={{ minWidth: 30 }}>{r.coveragePct}%</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" onClick={() => navigate(`/syllabus/plans/${r.syllabusId}`)}>Plan</Button>
                          <Button size="small" onClick={() => navigate('/syllabus/offerings')}>Teachers</Button>
                          <Button size="small" onClick={() => navigate('/syllabus/model-papers')}>Papers</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
