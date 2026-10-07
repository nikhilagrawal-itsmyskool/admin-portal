import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Stack, Chip, Button, CircularProgress, Alert, Divider } from '@mui/material';
import { clubService } from '../../../services/clubService';

const BLOCKS = [
  ['learningOutcome', '🎯 Outcome'], ['teacherPreparation', '🧰 Before you begin'], ['procedure', '📋 What to do'],
  ['assessmentChecklist', '👀 What to observe'], ['supportEnrichment', '🤝 Support / enrichment'], ['cleanupStorage', '🧹 Close & store'],
];

export default function ClubGuide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [g, setG] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setG(await clubService.myGuide(id)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!g) return <Alert severity="error">Not found</Alert>;
  const v = g.version || {};
  const a = g.assignment || {};

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Button size="small" onClick={() => navigate('/club/me')} sx={{ mb: 1 }}>← My Activities</Button>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{v.title}</Typography>
      <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: 'wrap', gap: 0.5 }}>
        {a.groupLabel && <Chip size="small" label={`👪 ${a.groupLabel}`} />}
        {(a.startTime) && <Chip size="small" label={`⏱ ${a.startTime}–${a.endTime}`} />}
        {v.estDuration && <Chip size="small" label={`${v.estDuration} min`} />}
        {a.venueNameSnapshot && <Chip size="small" label={`📍 ${a.venueNameSnapshot}`} />}
      </Stack>
      {v.riskSafety && <Alert severity="warning" sx={{ mb: 2 }}>⚠ {v.riskSafety}</Alert>}

      {(g.materials || []).length > 0 && (
        <Card variant="outlined" sx={{ mb: 1.5 }}><CardContent>
          <Typography variant="overline" color="text.secondary">🧺 What you need</Typography>
          {g.materials.map((m, i) => (
            <Stack key={i} direction="row" justifyContent="space-between"><Typography variant="body2">{m.item}</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{m.quantityNote || ''}</Typography></Stack>
          ))}
        </CardContent></Card>
      )}

      {BLOCKS.map(([k, label]) => v[k] ? (
        <Card key={k} variant="outlined" sx={{ mb: 1.5 }}><CardContent>
          <Typography variant="overline" color="text.secondary">{label}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{v[k]}</Typography>
        </CardContent></Card>
      ) : null)}

      <Divider sx={{ my: 2 }} />
      <Button fullWidth variant="contained" size="large" disabled={!!a.completionOutcome} onClick={() => navigate(`/club/me/a/${id}/close`)}>
        {a.completionOutcome ? `Closed · ${a.completionOutcome}` : 'Close activity ▸'}
      </Button>
    </Box>
  );
}
