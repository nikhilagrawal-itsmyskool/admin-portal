import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import { ArrowBack as BackIcon, HowToReg as SignIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate } from '../../utils/date';
import SignaturePad from './SignaturePad';

// Shared roster for marking present/absent + signing. mode='me' (invigilator PWA) uses the
// /me endpoints (scoped to the caller's assignment); mode='admin' uses the sign-any
// endpoints (exam.manage). The signer's stored signature stamps onto the cards.
export default function InvigilatorRoster({ mode = 'me' }) {
  const { examId, id, paperId, sectionId } = useParams();
  const exam = examId || id;
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const svc = mode === 'admin'
    ? { roster: examinationService.adminRoster, mark: examinationService.adminMark, sign: examinationService.adminSign }
    : { roster: examinationService.myRoster, mark: examinationService.myMark, sign: examinationService.mySign };

  const [roster, setRoster] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [sig, setSig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [r, s] = await Promise.all([svc.roster(exam, paperId, sectionId), examinationService.getMySignature()]);
      setRoster(r); setSig(s);
      const m = {};
      r.students.forEach((st) => { m[st.studentId] = st.status || 'present'; });
      setStatusMap(m);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the roster');
    } finally { setLoading(false); }
  }, [exam, paperId, sectionId, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const setStatus = (sid, v) => { if (v) setStatusMap((m) => ({ ...m, [sid]: v })); };
  const marksPayload = () => roster.students.map((s) => ({ studentId: s.studentId, status: statusMap[s.studentId] || 'present' }));

  const saveMarks = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { setRoster(await svc.mark(exam, paperId, sectionId, marksPayload())); setMsg('Attendance saved.'); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save attendance'); }
    finally { setBusy(false); }
  };

  const sign = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await svc.mark(exam, paperId, sectionId, marksPayload()); // materialise present/absent for everyone
      setRoster(await svc.sign(exam, paperId, sectionId));
      setMsg('Roster signed — your signature will print on these cards.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to sign the roster');
    } finally { setBusy(false); }
  };

  const saveSig = async (b64) => {
    setBusy(true); setErr('');
    try { setSig(await examinationService.saveMySignature(b64)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save signature'); }
    finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!roster) return <Alert severity="error">{err || 'Roster not found'}</Alert>;

  const present = roster.students.filter((s) => (statusMap[s.studentId] || 'present') === 'present').length;
  const absent = roster.students.length - present;
  const back = mode === 'admin' ? `/examinations/${exam}` : '/exam/my-invigilations';

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {/* In-page Back only on desktop (no global header back there); mobile uses the header arrow. */}
        {!isMobile && <Button startIcon={<BackIcon />} onClick={() => navigate(back)}>Back</Button>}
        <Box sx={{ flex: 1 }} />
        {roster.signed && <Chip size="small" color="success" label="signed" />}
      </Stack>

      <Typography variant="h6">{roster.section?.name} · {roster.paper?.subjectLabel}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {fmtDate(roster.paper?.examDate)} · {present} present · {absent} absent
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {roster.signed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Signed by {roster.signedByName || 'invigilator'} on {roster.signedAt}. You can edit and re-sign if needed.
        </Alert>
      )}

      {!sig?.dataUri && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Alert severity="warning" sx={{ mb: 1 }}>Add your signature to sign this roster — it stamps onto the admit cards.</Alert>
            <SignaturePad onSave={saveSig} saving={busy} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <List dense disablePadding>
            {roster.students.map((s, i) => (
              <React.Fragment key={s.studentId}>
                {i > 0 && <Divider component="li" />}
                <ListItem
                  secondaryAction={
                    <ToggleButtonGroup
                      exclusive size="small" value={statusMap[s.studentId] || 'present'}
                      onChange={(_, v) => setStatus(s.studentId, v)}
                    >
                      <ToggleButton value="present" color="success" sx={{ px: 1.5, py: 0.25 }}>P</ToggleButton>
                      <ToggleButton value="absent" color="error" sx={{ px: 1.5, py: 0.25 }}>A</ToggleButton>
                    </ToggleButtonGroup>
                  }
                >
                  <ListItemText primary={s.name} secondary={s.admissionNumber || null} />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} sx={{ mt: 2, pb: 1 }}>
        <Button variant="outlined" onClick={saveMarks} disabled={busy}>Save attendance</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<SignIcon />} onClick={sign} disabled={busy || !sig?.dataUri}>
          {roster.signed ? 'Re-sign roster' : 'Sign roster'}
        </Button>
      </Stack>
    </Box>
  );
}
