import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Chip, Button, Divider,
} from '@mui/material';
import { ChevronRight as OpenIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOf = (d) => DOW[new Date(`${d}T00:00:00`).getDay()];

export default function MyInvigilations() {
  const navigate = useNavigate();
  const [duties, setDuties] = useState([]);
  const [roomDuties, setRoomDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [d, rd] = await Promise.all([
        examinationService.myInvigilations(),
        examinationService.myRooms().catch(() => []),
      ]);
      setDuties(d); setRoomDuties(rd);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load your invigilation duties');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>My Exam Duties</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Mark attendance and sign the roster for the rooms you invigilate. On days you are a
        reliever, every room appears here for you to countersign.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {roomDuties.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Room duties</Typography>
            {roomDuties.map((d, i) => {
              const isReliever = d.role === 'reliever';
              return (
                <React.Fragment key={`${d.roomId}-${d.examDate}-${d.role || 'inv'}`}>
                  {i > 0 && <Divider sx={{ my: 1 }} />}
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 0.5 }}>
                    <Box sx={{ textAlign: 'center', minWidth: 64 }}>
                      <Typography variant="subtitle2">{fmtDate(d.examDate)}</Typography>
                      <Typography variant="caption" color="text.secondary">{dayOf(d.examDate)}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        <Typography variant="body2"><b>Room {d.roomName}</b></Typography>
                        {isReliever && <Chip size="small" color="secondary" variant="outlined" label="Reliever" />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {d.examName}{isReliever ? ' · floor duty — countersign' : ''}
                      </Typography>
                    </Box>
                    {d.signed ? <Chip size="small" color="success" label="signed" />
                      : isReliever ? <Chip size="small" variant="outlined" label="sign" />
                        : <Chip size="small" variant="outlined" label={`${d.marked}/${d.total} marked`} />}
                    <Button
                      size="small" variant="contained" endIcon={<OpenIcon />}
                      onClick={() => navigate(`/exam/room-roster/${d.examId}/${d.roomId}/${d.examDate}`)}
                    >
                      Open
                    </Button>
                  </Stack>
                </React.Fragment>
              );
            })}
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
