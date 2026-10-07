import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Stack, Chip, TextField, CircularProgress, Alert } from '@mui/material';
import { clubService } from '../../../services/clubService';

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function MyClub() {
  const navigate = useNavigate();
  const [date, setDate] = useState(localToday());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setRows(await clubService.myPlan(date)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); }
    finally { setLoading(false); }
  }, [date]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>My Activities</Typography>
        <TextField size="small" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : (
        <Stack spacing={1.5}>
          {rows.map((a) => (
            <Card key={a.uuid} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => navigate(`/club/me/a/${a.uuid}`)}>
              <CardContent>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
                  {a.startTime || ''}{a.endTime ? `–${a.endTime}` : ''}
                </Typography>
                <Typography sx={{ fontWeight: 700, my: 0.5 }}>{a.activityTitle || 'Activity'}</Typography>
                <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
                  <Typography variant="body2">👪 {a.groupLabel}</Typography>
                  {a.venueNameSnapshot && <Typography variant="body2">📍 {a.venueNameSnapshot}</Typography>}
                </Stack>
                <Box sx={{ mt: 1 }}>
                  {a.completionOutcome
                    ? <Chip size="small" color="success" label={`Closed · ${a.completionOutcome}`} />
                    : <Chip size="small" color="info" label="To conduct" />}
                </Box>
              </CardContent>
            </Card>
          ))}
          {!rows.length && <Alert severity="info">No activities assigned to you on this date.</Alert>}
        </Stack>
      )}
    </Box>
  );
}
