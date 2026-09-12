import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress, Card, Chip, Stack } from '@mui/material';
import { leaveService } from '../../services/leaveService';
import { thisMonth } from './LeaveShared';
import { todayIso } from '../../utils/date';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// Every date (YYYY-MM-DD) in [from,to] inclusive, both within the same month.
function eachDate(from, to) {
  const out = [];
  const s = new Date(`${from}T00:00:00Z`);
  const e = new Date(`${to}T00:00:00Z`);
  const cur = new Date(s.getTime());
  while (cur.getTime() <= e.getTime()) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
  return out;
}

export default function WhosOnLeave() {
  const [month, setMonth] = useState(thisMonth());
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = todayIso();
  const todayRef = useRef(null);

  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${pad(lastDay)}`;

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    leaveService.listApplications({ from: first, to: last })
      .then((list) => { if (alive) setApps((list || []).filter((a) => a.status === 'approved' || a.status === 'pending')); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open scrolled to the current day (when this month contains today) so back/forward is natural.
  useEffect(() => {
    if (loading) return undefined;
    const t = setTimeout(() => todayRef.current?.scrollIntoView({ block: 'center' }), 60);
    return () => clearTimeout(t);
  }, [loading, month]);

  // date -> [{ name, code, status }]
  const byDate = {};
  for (const a of apps) {
    const lo = a.fromDate < first ? first : a.fromDate;
    const hi = a.toDate > last ? last : a.toDate;
    for (const d of eachDate(lo, hi)) {
      const half = a.dayPortion === 'first_half' || a.dayPortion === 'second_half';
      (byDate[d] = byDate[d] || []).push({ name: a.employeeName || a.employeeId, code: a.leaveTypeCode, status: a.status, half });
    }
  }

  const approvedCount = apps.filter((a) => a.status === 'approved').length;
  const pendingCount = apps.filter((a) => a.status === 'pending').length;
  const days = Array.from({ length: lastDay }, (_, i) => `${month}-${pad(i + 1)}`);

  return (
    <Box sx={{ maxWidth: 880 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Leave Calendar</Typography>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label={`${approvedCount} approved`} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
            <Chip label={`${pendingCount} pending`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />
          </Stack>

          <Card variant="outlined">
            {days.map((date) => {
              const list = byDate[date] || [];
              const dd = date.slice(8, 10);
              const dow = DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
              const isToday = date === today;
              const isSunday = dow === 'Sun';
              return (
                <Box
                  key={date}
                  ref={isToday ? todayRef : undefined}
                  sx={{
                    display: 'flex', gap: 1.5, px: 1.5, py: 1, borderBottom: '1px solid #eef2f8',
                    bgcolor: isToday ? '#eaf0ff' : 'transparent',
                    borderLeft: isToday ? '3px solid #3366ff' : '3px solid transparent',
                  }}
                >
                  <Box sx={{ width: 42, flex: '0 0 auto', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: isToday ? '#274bdb' : (isSunday ? '#c3cad9' : '#2e3a59'), fontVariantNumeric: 'tabular-nums' }}>{dd}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>{dow}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                    {isToday && <Chip size="small" label="Today" sx={{ height: 20, bgcolor: '#3366ff', color: '#fff', fontWeight: 700, fontSize: 10.5 }} />}
                    {list.length === 0 ? (
                      <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>—</Typography>
                    ) : (
                      list.map((p, i) => (
                        <Chip
                          key={`${date}-${i}`} size="small"
                          label={<span><b>{p.name}</b>{p.code ? ` · ${p.code}` : ''}{p.half ? ' · ½' : ''}</span>}
                          variant="outlined"
                          sx={{
                            fontSize: 12,
                            borderColor: p.status === 'approved' ? '#00b887' : '#f0c14b',
                            color: p.status === 'approved' ? '#00916e' : '#8a6400',
                            bgcolor: p.status === 'approved' ? '#f2fcf9' : '#fffaf0',
                          }}
                          title={p.status}
                        />
                      ))
                    )}
                  </Box>
                </Box>
              );
            })}
          </Card>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
            Green = approved, amber = pending. One row per day; today is highlighted.
          </Typography>
        </>
      )}
    </Box>
  );
}
