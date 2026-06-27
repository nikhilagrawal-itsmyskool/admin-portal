import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Alert, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { ArrowBack as BackIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { communicationService } from '../../../services/communicationService';
import { maskPhone } from '../../../utils/mask';

const jobColor = (s) => ({ completed: 'success', failed: 'error', running: 'info', queued: 'default', canceled: 'warning' }[s] || 'default');
const recColor = (s) => ({ sent: 'success', delivered: 'success', read: 'success', failed: 'error', skipped: 'warning', pending: 'default' }[s] || 'default');

export default function MessageJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      setJob(await communicationService.getMessage(id));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load message');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    setCanceling(true); setError('');
    try {
      await communicationService.cancelMessage(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to cancel');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!job) return <Alert severity="error">{error || 'Message not found'}</Alert>;

  const recipients = job.recipients || [];

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/communication/messages')} sx={{ mb: 2 }}>Back to Sent Messages</Button>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h5">{job.templateKey}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={job.status} color={jobColor(job.status)} />
              {job.status === 'queued' && (
                <Button size="small" color="warning" variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={canceling}>Cancel</Button>
              )}
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {job.audienceSummary} · source: {job.source || '-'}
            {job.scheduledAt ? ` · scheduled: ${String(job.scheduledAt).slice(0, 19).replace('T', ' ')}` : ''}
            {job.error ? ` · error: ${job.error}` : ''}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Recipients ({recipients.length})</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell><TableCell>Role</TableCell><TableCell>Channel</TableCell>
                  <TableCell>Number</TableCell><TableCell>Status</TableCell><TableCell>Provider Msg ID</TableCell><TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recipients.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No recipients (job not processed yet)</TableCell></TableRow>
                ) : recipients.map((r) => (
                  <TableRow key={r.uuid}>
                    <TableCell>{r.recipientType}</TableCell>
                    <TableCell>{r.role || '-'}</TableCell>
                    <TableCell>{r.channel || '-'}</TableCell>
                    <TableCell>{r.toNumber ? maskPhone(r.toNumber) : '-'}</TableCell>
                    <TableCell><Chip size="small" label={r.status} color={recColor(r.status)} variant="outlined" /></TableCell>
                    <TableCell>{r.providerMessageId || '-'}</TableCell>
                    <TableCell>{r.error || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
