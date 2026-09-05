import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress, Card, CardContent, Chip, Stack, Grid } from '@mui/material';
import { leaveService } from '../../services/leaveService';
import { fmtDate, todayIso } from '../../utils/date';

export default function WhosOnLeave() {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    leaveService.dayView(date)
      .then((d) => { if (alive) setData(d); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [date]);

  const onLeave = data?.onLeave || [];

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Who's on Leave</Typography>
        <TextField type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#3366ff', lineHeight: 1 }}>{onLeave.length}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>On leave</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={6}>
              <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
                <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#e5396b', lineHeight: 1 }}>{data?.unauthorizedCount || 0}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Unauth. absent</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>

          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>{fmtDate(date)}</Typography>
          {onLeave.length === 0 ? (
            <Alert severity="info">No staff on leave on this date.</Alert>
          ) : (
            <Stack spacing={1}>
              {onLeave.map((r, i) => (
                <Card key={`${r.employeeId}-${i}`} variant="outlined">
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.employeeName || r.employeeId}</Typography>
                        {r.reason && <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{r.reason}</Typography>}
                      </Box>
                      <Stack direction="row" spacing={0.75}>
                        <Chip size="small" label={r.leaveTypeCode} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        <Chip size="small" label={r.status} color={r.status === 'approved' ? 'success' : 'warning'} sx={{ textTransform: 'capitalize' }} />
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
