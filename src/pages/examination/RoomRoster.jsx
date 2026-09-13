import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button,
  ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, Divider,
  Autocomplete, TextField, IconButton,
} from '@mui/material';
import { ArrowBack as BackIcon, HowToReg as SignIcon, Edit as EditIcon, Lock as LockIcon, PersonAdd as AddIcon, Close as RemoveIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { studentService } from '../../services/studentService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();

  const svc = mode === 'admin'
    ? { roster: examinationService.adminRoomRoster, mark: examinationService.adminRoomMark, sign: examinationService.adminRoomSign, av: examinationService.adminAvStudent }
    : { roster: examinationService.myRoomRoster, mark: examinationService.myRoomMark, sign: examinationService.myRoomSign, av: examinationService.myAvStudent };

  const [editing, setEditing] = useState(false);
  const [roster, setRoster] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [studentOpts, setStudentOpts] = useState([]); // AV room: student search results

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await svc.roster(exam, roomId, date);
      setRoster(r); setEditing(false);
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
    try { setRoster(await svc.mark(exam, roomId, date, marksPayload())); setMsg('Draft saved.'); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save attendance'); }
    finally { setBusy(false); }
  };

  // Submit with a FRESH signature drawn at submit time (a new signature every day; nothing
  // stored). Materialise marks first, then sign with the drawn PNG.
  const submit = async (signatureBase64) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await svc.mark(exam, roomId, date, marksPayload()); // materialise present/absent for everyone
      setRoster(await svc.sign(exam, roomId, date, signatureBase64)); setEditing(false);
      setMsg('Room submitted — your signature will print on these cards.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to submit the room');
    } finally { setBusy(false); }
  };

  // AV room: search + add/remove the students present that day. Re-sync statuses from the
  // returned roster (preserving any in-progress toggles).
  const searchStudents = async (q) => {
    if (!q || q.trim().length < 2) { setStudentOpts([]); return; }
    try { setStudentOpts(await studentService.searchStudents({ name: q.trim() }) || []); } catch { setStudentOpts([]); }
  };
  const applyAvRoster = (r) => {
    setRoster(r);
    setStatusMap((prev) => {
      const m = {};
      (r.sections || []).forEach((sec) => sec.students.forEach((st) => { m[st.studentId] = prev[st.studentId] || st.status || 'present'; }));
      return m;
    });
  };
  const avStudent = async (studentId, action) => {
    if (!studentId) return;
    setBusy(true); setErr(''); setMsg('');
    try { applyAvRoster(await svc.av(exam, roomId, date, studentId, action)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to update the AV list'); }
    finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!roster) return <Alert severity="error">{err || 'Room roster not found'}</Alert>;

  const allStudents = (roster.sections || []).flatMap((s) => s.students);
  const present = allStudents.filter((s) => (statusMap[s.studentId] || 'present') === 'present').length;
  const absent = allStudents.length - present;
  const back = mode === 'admin' ? `/examinations/${exam}?tab=invigilators` : '/exam/my-invigilations';

  // God may edit any time; teacher/admin only until the exam day passes. A submitted roster
  // shows read-only (with an Edit affordance) until re-opened.
  // god OR exam-incharge may edit a locked/submitted roster (corrections) via the admin screen.
  const isGod = mode === 'admin' && (user?.roles || []).some((r) => r === 'god' || r === 'exam-incharge');
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
          This exam day has passed and is locked.
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

      {roster.isAv && editMode && (
        <Autocomplete
          sx={{ mb: 1.5 }} size="small" options={studentOpts} getOptionLabel={(o) => `${o.name}${o.admissionNumber ? ` · ${o.admissionNumber}` : ''}`}
          filterOptions={(x) => x} value={null} blurOnSelect clearOnBlur disabled={busy}
          onInputChange={(_, v) => searchStudents(v)}
          onChange={(_, v) => { if (v) avStudent(v.uuid, 'add'); setStudentOpts([]); }}
          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
          renderInput={(p) => <TextField {...p} label="Add a student to the AV room" placeholder="Search by name…" />}
        />
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
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <ToggleButtonGroup
                          exclusive size="small" value={statusMap[s.studentId] || 'present'} disabled={readOnly}
                          onChange={(_, v) => setStatus(s.studentId, v)}
                        >
                          <ToggleButton value="present" color="success" sx={{ px: 1.5, py: 0.25 }}>P</ToggleButton>
                          <ToggleButton value="absent" color="error" sx={{ px: 1.5, py: 0.25 }}>A</ToggleButton>
                        </ToggleButtonGroup>
                        {roster.isAv && editMode && (
                          <IconButton size="small" onClick={() => avStudent(s.studentId, 'remove')} disabled={busy} aria-label="Remove from AV room">
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={s.name}
                      secondary={roster.isAv
                        ? (s.className || s.admissionNumber || null)
                        : ([s.rollNumber != null ? `Roll ${s.rollNumber}` : null, s.admissionNumber].filter(Boolean).join(' · ') || null)}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
              {!sec.students.length && (
                <ListItem><ListItemText secondary={roster.isAv ? 'No students added yet. Search above to add the students present in the AV room.' : 'No students resolved for this section.'} /></ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      ))}

      {!allStudents.length && !roster.isAv && <Alert severity="info">No students sit in this room on this day.</Alert>}

      {allStudents.length > 0 && editMode && (
        <>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={saveMarks} disabled={busy}>Save draft</Button>
          </Stack>
          <Card sx={{ mt: 2, mb: 1 }}>
            <CardContent>
              <SignaturePad
                onSave={submit} saving={busy}
                label="Sign below to submit (a fresh signature is required each day)"
                actionLabel={roster.signed ? 'Re-submit & sign' : 'Submit & sign'}
              />
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
