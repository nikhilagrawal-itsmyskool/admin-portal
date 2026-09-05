import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress } from '@mui/material';
import { leaveService } from '../../services/leaveService';
import { MonthAttendanceView, thisMonth } from './LeaveShared';

export default function MyAttendance() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    leaveService.myAttendance(month)
      .then((d) => { if (alive) setData(d); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load attendance'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]);

  return (
    <Box sx={{ maxWidth: 620 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">My Attendance</Typography>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <MonthAttendanceView data={data} />
      )}
    </Box>
  );
}
