import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress } from '@mui/material';
import { leaveService } from '../../services/leaveService';
import { PenaltyCard, thisMonth } from './LeaveShared';

export default function MyPenalty() {
  const [month, setMonth] = useState(thisMonth());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    leaveService.myDeductions(month)
      .then((d) => { if (alive) setSummary(d); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]);

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">My Penalty</Typography>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : summary && summary.countedAbsences === 0 ? (
        <Alert severity="success">No penalty for {summary.month} — no counted absences. 🎉</Alert>
      ) : (
        <PenaltyCard summary={summary} />
      )}
    </Box>
  );
}
