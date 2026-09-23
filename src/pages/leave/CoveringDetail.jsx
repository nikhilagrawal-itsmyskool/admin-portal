import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Alert, CircularProgress, Card, CardContent, Stack, Button, Chip,
} from '@mui/material';
import { ArrowBack as BackIcon, AttachFile as AttachIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { openDataUri } from './LeaveShared';
import { fmtDate } from '../../utils/date';

const dateRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);

// Read-only handover for a teacher covering a colleague's class (the "forward" target). Files
// stream from the same file_storage rows the applicant uploaded — nothing is copied.
export default function CoveringDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try { setData(await leaveService.getCovering(id)); }
      catch (err) { setError(err.response?.data?.error?.description || 'This handover is not available.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const openFile = async (fileId, name) => {
    try {
      const f = await leaveService.coveringFile(id, fileId);
      if (f?.dataUri) openDataUri(f.dataUri, name);
    } catch (err) { setError(err.response?.data?.error?.description || 'Could not open file'); }
  };

  const ho = data?.handover || {};
  const myClasses = data?.myClasses || [];
  const files = ho.files || [];
  const lessonPlans = files.filter((f) => f.variant !== 'worksheet');
  const worksheets = files.filter((f) => f.variant === 'worksheet');

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Button size="small" startIcon={<BackIcon />} onClick={() => navigate('/leave/me')} sx={{ mb: 1 }}>Back</Button>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Covering for {data.applicantName || 'a colleague'}</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>{dateRange(data.fromDate, data.toDate)}</Typography>

          <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', mb: 1 }}>Your classes</Typography>
          <Stack spacing={1} sx={{ mb: 2.5 }}>
            {myClasses.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No class detail on file.</Typography>
            ) : myClasses.map((t, i) => (
              <Card key={i} variant="outlined"><CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{t.className || 'Class'}{t.subjectName ? ` · ${t.subjectName}` : ''}</Typography>
                <Typography sx={{ fontSize: 13, mt: 0.25 }}>{t.chapter ? `${t.chapter} — ` : ''}{t.topic || '—'}</Typography>
                {t.substitution && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>Instructions: {t.substitution}</Typography>}
              </CardContent></Card>
            ))}
          </Stack>

          {ho.lessonPlan && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', mb: 0.5 }}>Lesson plan</Typography>
              <Typography sx={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{ho.lessonPlan}</Typography>
            </Box>
          )}

          {lessonPlans.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Lesson-plan files</Typography>
              <Stack spacing={0.5} alignItems="flex-start">
                {lessonPlans.map((f) => (
                  <Button key={f.fileId} size="small" startIcon={<AttachIcon />} onClick={() => openFile(f.fileId, f.fileName)}>{f.fileName}</Button>
                ))}
              </Stack>
            </Box>
          )}

          {worksheets.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Assignments / worksheets</Typography>
              <Stack spacing={0.5} alignItems="flex-start">
                {worksheets.map((f) => (
                  <Button key={f.fileId} size="small" startIcon={<AttachIcon />} onClick={() => openFile(f.fileId, f.fileName)}>{f.fileName}</Button>
                ))}
              </Stack>
            </Box>
          )}

          {ho.otherDuties && (ho.otherDuties.duties?.length || ho.otherDuties.note || ho.otherDuties.covering) && (
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Other duties</Typography>
              <Typography sx={{ fontSize: 13 }}>
                {(ho.otherDuties.duties || []).join(', ') || '—'}
                {ho.otherDuties.covering ? ` · covered by ${ho.otherDuties.covering}` : ''}
                {ho.otherDuties.note ? ` · ${ho.otherDuties.note}` : ''}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
