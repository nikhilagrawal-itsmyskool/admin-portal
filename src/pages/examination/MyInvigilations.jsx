import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button, Divider,
} from '@mui/material';
import { ChevronRight as OpenIcon, Draw as SignIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';
import SignaturePad from './SignaturePad';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => DOW[new Date(`${d}T00:00:00`).getDay()];

export default function MyInvigilations() {
  const navigate = useNavigate();
  const [duties, setDuties] = useState([]);
  const [roomDuties, setRoomDuties] = useState([]);
  const [sig, setSig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editSig, setEditSig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [d, rd, s] = await Promise.all([
        examinationService.myInvigilations(),
        examinationService.myRooms().catch(() => []),
        examinationService.getMySignature(),
      ]);
      setDuties(d); setRoomDuties(rd); setSig(s);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load your invigilation duties');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveSig = async (b64) => {
    setSaving(true); setErr('');
    try { setSig(await examinationService.saveMySignature(b64)); setEditSig(false); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save signature'); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>My Exam Duties</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Mark attendance and sign the roster for the exams you invigilate.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <SignIcon fontSize="small" />
            <Typography variant="subtitle1">My signature</Typography>
            <Box sx={{ flex: 1 }} />
            {sig?.dataUri && !editSig && <Button size="small" onClick={() => setEditSig(true)}>Update</Button>}
          </Stack>
          {sig?.dataUri && !editSig ? (
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'inline-block', bgcolor: '#fff' }}>
              <img src={sig.dataUri} alt="signature" style={{ maxHeight: 70, maxWidth: 240 }} />
            </Box>
          ) : (
            <>
              <Alert severity={sig?.dataUri ? 'info' : 'warning'} sx={{ mb: 1 }}>
                {sig?.dataUri ? 'Draw a new signature to replace the current one.' : 'Add your signature once — it stamps onto the admit cards when you sign a roster.'}
              </Alert>
              <SignaturePad onSave={saveSig} saving={saving} />
            </>
          )}
        </CardContent>
      </Card>

      {roomDuties.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Room duties</Typography>
            {roomDuties.map((d, i) => (
              <React.Fragment key={`${d.roomId}-${d.examDate}`}>
                {i > 0 && <Divider sx={{ my: 1 }} />}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 0.5 }}>
                  <Box sx={{ textAlign: 'center', minWidth: 64 }}>
                    <Typography variant="subtitle2">{fmtDate(d.examDate)}</Typography>
                    <Typography variant="caption" color="text.secondary">{dayOf(d.examDate)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2"><b>Room {d.roomName}</b></Typography>
                    <Typography variant="caption" color="text.secondary">{d.examName}</Typography>
                  </Box>
                  {d.signed ? <Chip size="small" color="success" label="signed" />
                    : <Chip size="small" variant="outlined" label={`${d.marked}/${d.total} marked`} />}
                  <Button
                    size="small" variant="contained" endIcon={<OpenIcon />}
                    onClick={() => navigate(`/exam/room-roster/${d.examId}/${d.roomId}/${d.examDate}`)}
                  >
                    Open
                  </Button>
                </Stack>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Duties</Typography>
          {duties.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>{roomDuties.length ? 'No section-based duties (your duties are room-based above).' : 'No invigilation duties assigned in any published exam.'}</Typography>
          ) : duties.map((d, i) => (
            <React.Fragment key={`${d.paperId}-${d.sectionClassId}`}>
              {i > 0 && <Divider sx={{ my: 1 }} />}
              <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 0.5 }}>
                <Box sx={{ textAlign: 'center', minWidth: 64 }}>
                  <Typography variant="subtitle2">{fmtDate(d.examDate)}</Typography>
                  <Typography variant="caption" color="text.secondary">{dayOf(d.examDate)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2"><b>{d.sectionName}</b> · {d.subjectLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">{d.examName}</Typography>
                </Box>
                {d.signed ? <Chip size="small" color="success" label="signed" />
                  : <Chip size="small" variant="outlined" label={`${d.marked}/${d.total} marked`} />}
                <Button
                  size="small" variant="contained" endIcon={<OpenIcon />}
                  onClick={() => navigate(`/exam/roster/${d.examId}/${d.paperId}/${d.sectionClassId}`)}
                >
                  Open
                </Button>
              </Stack>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
