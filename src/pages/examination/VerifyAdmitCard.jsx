import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Alert, CircularProgress, Divider, Chip, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { CheckCircle as OkIcon, HelpOutline as UnknownIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';

const STATUS = { scheduled: { label: 'Scheduled', color: 'default' }, present: { label: 'Present', color: 'success' }, absent: { label: 'Absent', color: 'error' } };

// Staff-authed live admit-card view (the target of the admit-card QR). Confirms the card
// is genuine and shows the paper schedule with per-day signature/attendance status
// (populated once Phase 3 lands; "scheduled" until then).
export default function VerifyAdmitCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true); setErr('');
    examinationService.verify(id)
      .then(setData)
      .catch((e) => setErr(e.response?.status === 404 ? 'notfound' : (e.response?.data?.error?.description || 'Could not verify this admit card')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const notFound = err === 'notfound';

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', p: 1 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 1 }}>Back</Button>
      {err && err !== 'notfound' && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ textAlign: 'center', py: 3, bgcolor: notFound ? '#f8fafc' : '#f0fdf4' }}>
          {notFound ? <UnknownIcon sx={{ fontSize: 56, color: '#64748b' }} /> : <OkIcon sx={{ fontSize: 56, color: '#15803d' }} />}
          <Typography sx={{ fontWeight: 800, fontSize: 20, color: notFound ? '#64748b' : '#15803d', mt: 1 }}>
            {notFound ? 'Not a valid admit card' : 'Genuine admit card'}
          </Typography>
          {data && <Typography sx={{ color: '#475569', fontSize: 13 }}>{data.examName} · {data.academicYearName}</Typography>}
        </Box>
        {data && (
          <CardContent>
            <Typography variant="h6">{data.student?.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {[data.section?.name, data.student?.admissionNumber].filter(Boolean).join(' · ')}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Signed by</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.papers.map((p) => {
                  const st = STATUS[p.status] || STATUS.scheduled;
                  return (
                    <TableRow key={p.examDate}>
                      <TableCell>{fmtDate(p.examDate)}</TableCell>
                      <TableCell>{p.subjectLabel}</TableCell>
                      <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                      <TableCell>{p.signedByName || <span style={{ opacity: 0.4 }}>—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </Box>
  );
}
