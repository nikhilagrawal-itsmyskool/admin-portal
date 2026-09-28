import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  ToggleButton, ToggleButtonGroup, LinearProgress, Divider, Grid,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';

// Exam-incharge dashboard: Term marks progress across every class, with a chase-list of pending
// subjects. Opening a subject deep-links to the marks screen (the incharge enters via override).
export default function ReportProgress() {
  const navigate = useNavigate();
  const [term, setTerm] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setData(await examinationService.reportProgress(term));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load marks progress');
    } finally { setLoading(false); }
  }, [term]);
  useEffect(() => { load(); }, [load]);

  const openSubject = (classId, subjectCode) => navigate(`/exam/marks?classId=${classId}&subjectCode=${subjectCode}&term=${term}`);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
        <Typography variant="h5">Marks Progress</Typography>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup exclusive size="small" value={term} onChange={(_, v) => v && setTerm(v)}>
          <ToggleButton value={1} sx={{ px: 2 }}>Term 1</ToggleButton>
          <ToggleButton value={2} sx={{ px: 2 }}>Term 2</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Which subjects are fully entered, and which are still pending. Tap a pending subject to enter it.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {loading ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box> : data && (
        <>
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
      )}
    </Box>
  );
}
