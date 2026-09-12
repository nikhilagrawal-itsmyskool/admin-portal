import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import { ArrowBack as BackIcon, HowToReg as SignIcon, Edit as EditIcon, Lock as LockIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();

  const svc = mode === 'admin'
    ? { roster: examinationService.adminRoster, mark: examinationService.adminMark, sign: examinationService.adminSign }
    : { roster: examinationService.myRoster, mark: examinationService.myMark, sign: examinationService.mySign };

  const [editing, setEditing] = useState(false);
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
      setRoster(r); setSig(s); setEditing(false);
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
      setRoster(await svc.sign(exam, paperId, sectionId)); setEditing(false);
      setMsg('Roster submitted — your signature will print on these cards.');
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
  const back = mode === 'admin' ? `/examinations/${exam}?tab=invigilators` : '/exam/my-invigilations';

  // God edits any time; teacher/admin until the exam day passes. A submitted roster shows
  // read-only (with an Edit affordance) until re-opened.
  const isGod = mode === 'admin' && (user?.roles || []).includes('god');
  const canEditNow = isGod || !roster.locked;
  const editMode = canEditNow && (!roster.signed || editing);
  const readOnly = !editMode;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {/* In-page Back only on desktop (no global header back there); mobile uses the header arrow. */}
        {!isMobile && <Button startIcon={<BackIcon />} onClick={() => navigate(back)}>Back</Button>}
        <Box sx={{ flex: 1 }} />
        {!canEditNow && <Chip size="small" icon={<LockIcon />} label="locked" />}
        {roster.signed && <Chip size="small" color="success" label="submitted" />}
      </Stack>

      <Typography variant="h6">{roster.section?.name} · {roster.paper?.subjectLabel}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {fmtDate(roster.paper?.examDate)} · {present} present · {absent} absent
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {roster.signed && !editing && (
        <Alert
          severity="success" icon={<SignIcon fontSize="inherit" />} sx={{ mb: 2 }}
          action={canEditNow ? <Button size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Edit</Button> : undefined}
        >
          Submitted ✓ by {roster.signedByName || 'invigilator'} on {roster.signedAt}.
          {canEditNow ? ' Open Edit to make a change and re-submit.' : ''}
        </Alert>
      )}
      {roster.correctedByName && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Corrected by {roster.correctedByName} on {roster.correctedAt} — the original invigilator's signature is retained on the card.
        </Alert>
      )}
      {!canEditNow && (
        <Alert severity="info" icon={<LockIcon fontSize="inherit" />} sx={{ mb: 2 }}>
          This exam day has passed and is locked. Ask an exam manager (god) to make changes.
        </Alert>
      )}

      {editMode && !sig?.dataUri && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Alert severity="warning" sx={{ mb: 1 }}>Add your signature to submit this roster — it stamps onto the admit cards.</Alert>
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
                      exclusive size="small" value={statusMap[s.studentId] || 'present'} disabled={readOnly}
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

      {editMode && (
        <Stack direction="row" spacing={1} sx={{ mt: 2, pb: 1 }}>
          <Button variant="outlined" onClick={saveMarks} disabled={busy}>Save draft</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<SignIcon />} onClick={sign} disabled={busy || !sig?.dataUri}>
            {roster.signed ? 'Re-submit & sign' : 'Submit & sign'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
