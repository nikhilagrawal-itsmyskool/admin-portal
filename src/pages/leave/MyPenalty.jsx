import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress, Card, CardContent, Chip, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { leaveService } from '../../services/leaveService';
import { thisMonth } from './LeaveShared';
import { fmtDateDow } from '../../utils/date';

// Penalty expressed in LOP DAYS (no money / no YTD — payroll converts later).
function lopLabel(n) {
  if (n === 0.5) return '½ day';
  if (n === 1) return '1 day';
  return `${n} days`;
}

// One day row: green tick (clean), a red LOP chip (penalty), neutral (off/holiday/paid leave),
// or amber "regularize" (missing punch). Sourced from the live staff-attendance derivation.
function DayRow({ d }) {
  const leading =
    d.kind === 'penalty' ? <RemoveCircleOutlineIcon fontSize="small" color="error" />
      : d.kind === 'pending' ? <ErrorOutlineIcon fontSize="small" color="warning" />
        : d.kind === 'off' ? <RemoveCircleOutlineIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          : <CheckCircleIcon fontSize="small" color="success" />;
  return (
    <Card variant="outlined" sx={{ opacity: d.kind === 'off' ? 0.7 : 1 }}>
      <CardContent sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 1 } }}>
        {leading}
        <Box sx={{ minWidth: 150 }}><Typography variant="body2">{fmtDateDow(d.date)}</Typography></Box>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {d.firstIn ? `${d.firstIn}${d.lastOut ? ' – ' + d.lastOut : ' – (no out)'}` : ''}
          {d.reason ? `${d.firstIn ? '  ·  ' : ''}${d.reason}` : ''}
        </Typography>
        {d.penaltyDays > 0 && <Chip size="small" color="error" variant="filled" label={`−${lopLabel(d.penaltyDays)}`} sx={{ fontWeight: 600 }} />}
      </CardContent>
    </Card>
  );
}

export default function MyPenalty() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    leaveService.myPenalty(month)
      .then((d) => { if (alive) setData(d); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]);

  const total = data?.totalLopDays || 0;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">My Penalty</Typography>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !data ? null : (
        <>
          {total === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>No penalty this month — all clear. 🎉</Alert>
          ) : (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h5" color="error.main">{total}</Typography>
                <Typography variant="body1">LOP day{total === 1 ? '' : 's'} this month</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {data.penaltyDayCount} day{data.penaltyDayCount === 1 ? '' : 's'} with a deduction
                </Typography>
              </CardContent>
            </Card>
          )}
          <Stack spacing={1}>
            {(data.days || []).map((d) => <DayRow key={d.date} d={d} />)}
            {!(data.days || []).length && <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No data for this month.</Typography>}
          </Stack>
        </>
      )}
    </Box>
  );
}
