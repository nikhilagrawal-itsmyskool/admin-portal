import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, Chip, CircularProgress, Stack,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { feedbackService, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../../services/feedbackService';
import { fmtDate } from '../../utils/date';

const TABS = [
  { key: 'act', label: 'To act' },
  { key: 'watching', label: 'Watching' },
  { key: 'recorded', label: 'Recorded by me' },
];

export default function MyFeedback() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('act');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      setItems((await feedbackService.mine({ tab })) || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load your feedback');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>My Feedback</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Feedback tickets you own, watch, or recorded. Tap one to read the thread and respond.
      </Typography>

      <ToggleButtonGroup size="small" exclusive value={tab} onChange={(e, v) => v !== null && setTab(v)} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {TABS.map((t) => <ToggleButton key={t.key} value={t.key}>{t.label}</ToggleButton>)}
      </ToggleButtonGroup>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">Nothing here.</Alert>
      ) : (
        <Stack spacing={1.25}>
          {items.map((f) => (
            <Card key={f.uuid} variant="outlined" onClick={() => navigate(`/feedback/t/${f.uuid}`)} sx={{ cursor: 'pointer' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {f.unread && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3366ff', flexShrink: 0 }} />}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: f.unread ? 800 : 700, fontSize: 14 }}>
                        {f.studentName || 'Student'}{f.className ? ` · ${f.className}` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        {f.categoryName || 'Feedback'}{f.visitDate ? ` · ${fmtDate(f.visitDate)}` : ''} · owner {f.assignedToName || '—'}
                      </Typography>
                    </Box>
                  </Box>
                  <Stack alignItems="flex-end" spacing={0.5}>
                    <Chip size="small" label={FEEDBACK_STATUS_LABEL[f.status] || f.status}
                      color={FEEDBACK_STATUS_COLOR[f.status] || 'default'} sx={{ fontWeight: 700 }} />
                    {f.status === 'open' && f.awaitingDirector && (
                      <Chip size="small" variant="outlined" color="primary" label="With director" sx={{ height: 20, fontSize: 10.5 }} />
                    )}
                  </Stack>
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {f.feedbackText}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>
                  Recorded by {f.recordedByName || 'office'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
