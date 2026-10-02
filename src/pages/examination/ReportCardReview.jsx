import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  TextField, MenuItem, ToggleButton, ToggleButtonGroup, LinearProgress, Divider,
  Table, TableHead, TableBody, TableRow, TableCell, Paper,
} from '@mui/material';
import { Visibility as PreviewIcon, CheckCircle as OkIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { buildReportCardsHtml } from './reportCardHtml';
import { useIsMobile } from '../../hooks/useIsMobile';

// Class-teacher report-card review (PWA). Pick one of your classes + term, view each student's card,
// and mark it "OK" (sign-off). OK is informational — printing stays with the admin/exam-incharge.
export default function ReportCardReview() {
  const isMobile = useIsMobile();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState(1);
  const termSet = useRef(false);
  const [data, setData] = useState(null);
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
      setErr(e.response?.data?.error?.description || 'Failed to load your classes');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadClasses(); }, [loadClasses]);

  const load = useCallback(async () => {
    if (!classId) { setData(null); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      setData(await examinationService.myReportCards(classId, term));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load report cards');
      setData(null);
    } finally { setBusy(false); }
  }, [classId, term]);
  useEffect(() => { load(); }, [load]);

  const preview = (student) => {
    const html = buildReportCardsHtml(data, [student], false);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const setOk = async (studentIds, approve) => {
    if (!studentIds.length) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const d = await examinationService.approveReportCards(classId, term, studentIds, approve);
      setData(d);
      setMsg(approve ? `Marked ${studentIds.length} card(s) OK.` : 'OK removed.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to update OK');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const students = data?.students || [];
  const pendingIds = students.filter((s) => !s.approvedAt).map((s) => s.studentId);
  const okCount = students.filter((s) => s.approvedAt).length;

  const OkCell = ({ s }) => (s.approvedAt ? (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
      <Chip size="small" color="success" variant="outlined" icon={<OkIcon />} label={`OK'd · ${s.approvedAt}`} />
      <Button size="small" color="inherit" sx={{ color: 'text.secondary' }} disabled={busy} onClick={() => setOk([s.studentId], false)}>Undo</Button>
    </Stack>
  ) : (
    <Button size="small" variant="outlined" color="success" disabled={busy} onClick={() => setOk([s.studentId], true)}>Mark OK</Button>
  ));

  return (
    <Box sx={{ width: '100%', maxWidth: isMobile ? 760 : '100%', mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Report Card Review</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review your class's report cards and mark each <b>OK</b> once you've checked it. OK is a sign-off
        for the office — printing is done by the exam office.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {classes.length === 0 ? (
        <Alert severity="info">You are not set as a class teacher for any class this year.</Alert>
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
            {!!students.length && <Chip size="small" variant="outlined" label={`${okCount}/${students.length} OK'd`} />}
            {!!students.length && (pendingIds.length
              ? <Button variant="contained" color="success" startIcon={<OkIcon />} disabled={busy} onClick={() => setOk(pendingIds, true)}>Mark all OK ({pendingIds.length})</Button>
              : <Button variant="outlined" color="success" startIcon={<OkIcon />} disabled>All OK ✓</Button>
            )}
          </Stack>

          {busy && !data ? <LinearProgress sx={{ mb: 2 }} /> : null}

          {data && (isMobile ? (
            <Stack spacing={1}>
              {students.map((s) => (
                <Card key={s.studentId} variant="outlined">
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[s.rollNumber != null ? `Roll ${s.rollNumber}` : null, data.band !== 'pre-primary' && s.overall?.total != null ? `${s.overall.total}/${s.overall.max} · ${s.overall.percentage}%` : null].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                      <Button size="small" startIcon={<PreviewIcon fontSize="small" />} onClick={() => preview(s)}>View</Button>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <OkCell s={s} />
                  </CardContent>
                </Card>
              ))}
              {!students.length && <Alert severity="info">No students in this class.</Alert>}
            </Stack>
          ) : (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Roll</TableCell>
                    <TableCell>Student</TableCell>
                    {data.band !== 'pre-primary' && <TableCell align="right">Overall</TableCell>}
                    <TableCell align="center">Card</TableCell>
                    <TableCell align="right">OK</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.studentId} hover>
                      <TableCell>{s.rollNumber ?? ''}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      {data.band !== 'pre-primary' && <TableCell align="right">{s.overall?.total != null ? `${s.overall.total}/${s.overall.max} · ${s.overall.percentage}%` : '—'}</TableCell>}
                      <TableCell align="center"><Button size="small" startIcon={<PreviewIcon fontSize="small" />} onClick={() => preview(s)}>View</Button></TableCell>
                      <TableCell align="right"><OkCell s={s} /></TableCell>
                    </TableRow>
                  ))}
                  {!students.length && <TableRow><TableCell colSpan={5}><Alert severity="info">No students in this class.</Alert></TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>
          ))}
        </>
      )}
    </Box>
  );
}
