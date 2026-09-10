import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, Chip, CircularProgress, Stack,
  ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider,
} from '@mui/material';
import { feedbackService, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../../services/feedbackService';
import { fmtDate } from '../../utils/date';

const FILTERS = [
  { key: 'open', label: 'To act' },
  { key: 'responded', label: 'Responded' },
  { key: 'completed', label: 'Completed' },
  { key: '', label: 'All' },
];

const actionable = (s) => s === 'assigned' || s === 'reopened';

export default function MyFeedback() {
  const [filter, setFilter] = useState('open');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [target, setTarget] = useState(null); // feedback being responded to
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      setItems((await feedbackService.mine({ status: filter || undefined, sort: 'oldest' })) || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load your feedback');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRespond = (f) => { setTarget(f); setComment(f.teacherComment || ''); };

  const submit = async () => {
    if (!comment.trim()) { setError('Enter your comment'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      await feedbackService.respond(target.uuid, comment.trim());
      setTarget(null); setComment('');
      setSuccess('Your response was submitted.');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>My Feedback</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Feedback assigned to you from home visits. Add your response so it can be reviewed.
      </Typography>

      <ToggleButtonGroup size="small" exclusive value={filter} onChange={(e, v) => v !== null && setFilter(v)} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
      </ToggleButtonGroup>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">Nothing here.</Alert>
      ) : (
        <Stack spacing={1.25}>
          {items.map((f) => (
            <Card key={f.uuid} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      {f.studentName || 'Student'}{f.className ? ` · ${f.className}` : ''}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      {f.categoryName || 'Feedback'}{f.visitDate ? ` · ${fmtDate(f.visitDate)}` : ''}
                    </Typography>
                  </Box>
                  <Chip size="small" label={FEEDBACK_STATUS_LABEL[f.status] || f.status}
                    color={FEEDBACK_STATUS_COLOR[f.status] || 'default'} sx={{ fontWeight: 700 }} />
                </Box>

                <Typography sx={{ fontSize: 13.5, mt: 1, whiteSpace: 'pre-wrap' }}>{f.feedbackText}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
                  Assigned by {f.recordedByName || 'office'}
                </Typography>

                {f.teacherComment && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>YOUR RESPONSE</Typography>
                    <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{f.teacherComment}</Typography>
                  </Box>
                )}
                {f.status === 'completed' && f.reviewNote && (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 12, color: 'success.main' }}>Reviewer: “{f.reviewNote}”</Typography>
                  </Box>
                )}
                {f.status === 'reopened' && f.reviewNote && (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 12, color: 'warning.main' }}>Sent back: “{f.reviewNote}”</Typography>
                  </Box>
                )}

                {actionable(f.status) && (
                  <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                    <Button size="small" variant="contained" onClick={() => openRespond(f)}>
                      {f.teacherComment ? 'Update response' : 'Respond'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Respond to feedback</DialogTitle>
        <DialogContent>
          {target && (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {target.studentName}{target.className ? ` · ${target.className}` : ''}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, whiteSpace: 'pre-wrap' }}>{target.feedbackText}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <TextField fullWidth size="small" label="Your response" multiline minRows={4} value={comment}
                onChange={(e) => setComment(e.target.value)} autoFocus />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>Submit response</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
