import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  ToggleButton, ToggleButtonGroup, LinearProgress, Divider, Grid, Tabs, Tab,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';

// Exam-incharge dashboard. Two tabs sharing the Term toggle:
//  • Marks — per class × subject entry progress; a pending subject deep-links to Enter Marks.
//  • Co-Scholastic — per class completion; deep-links to the Co-Scholastic screen for that class.
// The incharge enters/corrects either via the override, without being the class/subject teacher.
export default function ReportProgress() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('marks');
  const [term, setTerm] = useState(1);
  const termSet = useRef(false);
  const [data, setData] = useState(null); // marks progress
  const [coData, setCoData] = useState(null); // co-scholastic progress
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const applyTermDefault = (currentTerm) => {
    if (!termSet.current) { termSet.current = true; if (currentTerm) setTerm(currentTerm); }
  };

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      if (tab === 'marks') {
        const d = await examinationService.reportProgress(term);
        setData(d); applyTermDefault(d.currentTerm);
      } else {
        const d = await examinationService.coscholasticProgress(term);
        setCoData(d); applyTermDefault(d.currentTerm);
      }
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load progress');
    } finally { setLoading(false); }
  }, [tab, term]);
  useEffect(() => { load(); }, [load]);

  const openSubject = (classId, subjectCode) => navigate(`/exam/marks?classId=${classId}&subjectCode=${subjectCode}&term=${term}`);
  const openCoscholastic = (classId) => navigate(`/exam/coscholastic?classId=${classId}&term=${term}`);

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
        <Typography variant="h5">Progress</Typography>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup exclusive size="small" value={term} onChange={(_, v) => v && setTerm(v)}>
          <ToggleButton value={1} sx={{ px: 2 }}>Term 1</ToggleButton>
          <ToggleButton value={2} sx={{ px: 2 }}>Term 2</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 40 }}>
        <Tab value="marks" label="Marks" sx={{ minHeight: 40 }} />
        <Tab value="cosch" label="Co-Scholastic" sx={{ minHeight: 40 }} />
      </Tabs>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {loading ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box> : tab === 'marks' ? (
        data && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Which subjects are fully entered, and which are still pending. Tap a pending subject to enter it.
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{data.pctEntered}%</Typography>
                  <Typography variant="caption" color="text.secondary">subjects fully entered</Typography>
                  <LinearProgress variant="determinate" value={data.pctEntered} sx={{ mt: 1, borderRadius: 2, height: 6 }} />
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{data.pendingSubjects}</Typography>
                  <Typography variant="caption" color="text.secondary">subjects pending</Typography>
                </CardContent></Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              {(data.classes || []).map((c) => (
                <Card key={c.classId} variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.className}</Typography>
                      <Chip size="small" variant="outlined" label={`band ${c.band}`} />
                      <Box sx={{ flex: 1 }} />
                      <Chip size="small" color={c.doneCount === c.subjectCount ? 'success' : 'default'}
                        variant={c.doneCount === c.subjectCount ? 'filled' : 'outlined'}
                        label={`${c.doneCount}/${c.subjectCount} subjects`} />
                    </Stack>
                    <Divider sx={{ mb: 1 }} />
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                      {c.subjects.map((s) => (
                        <Button
                          key={s.subjectCode} size="small" onClick={() => openSubject(c.classId, s.subjectCode)}
                          variant={s.done ? 'text' : 'outlined'} endIcon={s.done ? undefined : <OpenInNew fontSize="small" />}
                          color={s.done ? 'success' : 'warning'}
                          sx={{ textTransform: 'none' }}
                        >
                          {s.label} · {s.complete}/{s.total}
                        </Button>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {!data.classes?.length && <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>No classes with enrolment for this year.</Alert>}
            </Box>
          </>
        )
      ) : (
        coData && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How many students in each class have their co-scholastic grades entered. Open a class to enter or correct it.
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{coData.pctEntered}%</Typography>
                  <Typography variant="caption" color="text.secondary">classes fully entered</Typography>
                  <LinearProgress variant="determinate" value={coData.pctEntered} sx={{ mt: 1, borderRadius: 2, height: 6 }} />
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{coData.pendingClasses}</Typography>
                  <Typography variant="caption" color="text.secondary">classes pending</Typography>
                </CardContent></Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              {(coData.classes || []).map((c) => (
                <Card key={c.classId} variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.className}</Typography>
                      <Chip size="small" variant="outlined" label={`band ${c.band}`} />
                      <Box sx={{ flex: 1 }} />
                      <Chip size="small" color={c.done ? 'success' : 'default'} variant={c.done ? 'filled' : 'outlined'}
                        label={`${c.complete}/${c.total} students`} />
                      <Button size="small" variant="outlined" endIcon={<OpenInNew fontSize="small" />}
                        onClick={() => openCoscholastic(c.classId)} sx={{ textTransform: 'none' }}>
                        {c.done ? 'Review' : 'Enter'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {!coData.classes?.length && <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>No classes with enrolment for this year.</Alert>}
            </Box>
          </>
        )
      )}
    </Box>
  );
}
