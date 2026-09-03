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

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');

// Room seating roster: mark present/absent for everyone sitting in a room on a date (a mix
// of sections) and sign once for the day. mode='me' (PWA, scoped to the assigned
// invigilator) or 'admin' (exam.manage, any room). The signature stamps onto admit cards.
export default function RoomRoster({ mode = 'me' }) {
  const { examId, id, roomId, date } = useParams();
  const exam = examId || id;
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const svc = mode === 'admin'
    ? { roster: examinationService.adminRoomRoster, mark: examinationService.adminRoomMark, sign: examinationService.adminRoomSign }
    : { roster: examinationService.myRoomRoster, mark: examinationService.myRoomMark, sign: examinationService.myRoomSign };

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
      const [r, s] = await Promise.all([svc.roster(exam, roomId, date), examinationService.getMySignature()]);
      setRoster(r); setSig(s);
      const m = {};
      (r.sections || []).forEach((sec) => sec.students.forEach((st) => { m[st.studentId] = st.status || 'present'; }));
      setStatusMap(m);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the room roster');
    } finally { setLoading(false); }
  }, [exam, roomId, date, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const setStatus = (sid, v) => { if (v) setStatusMap((m) => ({ ...m, [sid]: v })); };
  const marksPayload = () => (roster.sections || []).flatMap((sec) =>
    sec.students.map((s) => ({ studentId: s.studentId, paperId: s.paperId, sectionClassId: sec.sectionClassId, status: statusMap[s.studentId] || 'present' })));

  const saveMarks = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { setRoster(await svc.mark(exam, roomId, date, marksPayload())); setMsg('Attendance saved.'); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save attendance'); }
    finally { setBusy(false); }
  };

  const sign = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await svc.mark(exam, roomId, date, marksPayload()); // materialise present/absent for everyone
      setRoster(await svc.sign(exam, roomId, date));
      setMsg('Room signed — your signature will print on these cards.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to sign the room');
    } finally { setBusy(false); }
  };

  const saveSig = async (b64) => {
    setBusy(true); setErr('');
    try { setSig(await examinationService.saveMySignature(b64)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save signature'); }
    finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!roster) return <Alert severity="error">{err || 'Room roster not found'}</Alert>;

  const allStudents = (roster.sections || []).flatMap((s) => s.students);
  const present = allStudents.filter((s) => (statusMap[s.studentId] || 'present') === 'present').length;
  const absent = allStudents.length - present;
  const back = mode === 'admin' ? `/examinations/${exam}` : '/exam/my-invigilations';

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {/* In-page Back only on desktop (no global header back there); mobile uses the header arrow. */}
        {!isMobile && <Button startIcon={<BackIcon />} onClick={() => navigate(back)}>Back</Button>}
        <Box sx={{ flex: 1 }} />
        {roster.signed && <Chip size="small" color="success" label="signed" />}
      </Stack>

      <Typography variant="h6">Room {roster.room?.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {fmtDate(roster.examDate)} · {dayOf(roster.examDate)} · {present} present · {absent} absent
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {!roster.rollNumbersAvailable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Roll numbers aren't set for these sections, so each shows in full (with the plan's roll range as a label). Enter roll numbers to auto-split a section across rooms.
        </Alert>
      )}
      {roster.signed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Signed by {roster.signedByName || 'invigilator'} on {roster.signedAt}. You can edit and re-sign if needed.
        </Alert>
      )}

      {roster.roomImageDataUri && (
        <Box
          component="a" href={roster.roomImageDataUri} target="_blank" rel="noreferrer"
          sx={{ display: 'block', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
        >
          <img src={roster.roomImageDataUri} alt="Room plan" style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain', background: '#fff' }} />
        </Box>
      )}

      {!sig?.dataUri && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Alert severity="warning" sx={{ mb: 1 }}>Add your signature to sign this room — it stamps onto the admit cards.</Alert>
            <SignaturePad onSave={saveSig} saving={busy} />
          </CardContent>
        </Card>
      )}

      {(roster.sections || []).map((sec) => (
        <Card key={sec.sectionClassId} sx={{ mb: 1.5 }}>
          <CardContent sx={{ p: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="primary.main">{sec.sectionName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {sec.subjectLabel}{sec.rollFrom != null ? ` · rolls ${sec.rollFrom}${sec.rollTo != null ? `–${sec.rollTo}` : ''}` : ''}
              </Typography>
            </Stack>
            <Divider />
            <List dense disablePadding>
              {sec.students.map((s, i) => (
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
                    <ListItemText
                      primary={s.name}
                      secondary={[s.rollNumber != null ? `Roll ${s.rollNumber}` : null, s.admissionNumber].filter(Boolean).join(' · ') || null}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
              {!sec.students.length && (
                <ListItem><ListItemText secondary="No students resolved for this section." /></ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      ))}

      {!allStudents.length && <Alert severity="info">No students sit in this room on this day.</Alert>}

      {allStudents.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 2, pb: 1 }}>
          <Button variant="outlined" onClick={saveMarks} disabled={busy}>Save attendance</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<SignIcon />} onClick={sign} disabled={busy || !sig?.dataUri}>
            {roster.signed ? 'Re-sign room' : 'Sign room'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
