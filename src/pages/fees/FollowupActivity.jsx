import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Chip, Grid, Collapse,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { feesService } from '../../services/feesService';
import { errMsg, FEE_COLORS } from './feesUi';
import { fmtDate } from '../../utils/date';

// Admin oversight of the fee-caller's work: follow-up calls logged per day, by outcome, with a
// per-day drill-down to the students called. Trend chart answers "are calls going up or down?".
const STATUS_META = {
  called: { label: 'Called', color: '#0369a1' },
  promised: { label: 'Promised', color: '#b45309' },
  unreachable: { label: 'Unreachable', color: '#64748b' },
  settled: { label: 'Settled', color: '#15803d' },
};
const WINDOWS = [7, 15, 30];
const shortDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });

export default function FollowupActivity() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDay, setOpenDay] = useState(null);

  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    feesService.getFollowupActivity(days)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(errMsg(e, 'Could not load call activity')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const chart = useMemo(() => [...(data?.days || [])].reverse().map((d) => ({ ...d, day: shortDay(d.date) })), [data]);
  const entriesByDay = useMemo(() => {
    const m = {};
    (data?.entries || []).forEach((e) => { (m[e.date] ||= []).push(e); });
    return m;
  }, [data]);
  const t = data?.totals || {};
  const activeDays = (data?.days || []).filter((d) => d.total > 0);

  const tile = (label, value, color) => (
    <Card variant="outlined" sx={{ borderLeft: `4px solid ${color}`, height: '100%' }}>
      <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Typography noWrap sx={{ fontSize: 11.5, color: FEE_COLORS.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value ?? 0}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Call Activity</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Fee follow-up calls logged per day — is the chasing happening, and is it going up or down?</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {WINDOWS.map((w) => (
            <Box key={w} onClick={() => setDays(w)} sx={{ px: 1.5, py: 0.5, borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 700, bgcolor: days === w ? '#0f172a' : '#eef2f7', color: days === w ? '#fff' : '#0f172a' }}>
              {w} days
            </Box>
          ))}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} md={2.4}>{tile(`Follow-ups · ${days}d`, t.total, '#0f172a')}</Grid>
            <Grid item xs={6} md={2.4}>{tile('Called', t.called, STATUS_META.called.color)}</Grid>
            <Grid item xs={6} md={2.4}>{tile('Promised', t.promised, STATUS_META.promised.color)}</Grid>
            <Grid item xs={6} md={2.4}>{tile('Unreachable', t.unreachable, STATUS_META.unreachable.color)}</Grid>
            <Grid item xs={6} md={2.4}>{tile('Settled', t.settled, STATUS_META.settled.color)}</Grid>
          </Grid>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Calls per day — last {days} days</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" stroke={FEE_COLORS.muted} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} stroke={FEE_COLORS.muted} width={28} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="called" stackId="a" fill={STATUS_META.called.color} name="Called" />
                    <Bar dataKey="promised" stackId="a" fill={STATUS_META.promised.color} name="Promised" />
                    <Bar dataKey="unreachable" stackId="a" fill={STATUS_META.unreachable.color} name="Unreachable" />
                    <Bar dataKey="settled" stackId="a" fill={STATUS_META.settled.color} name="Settled" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Called</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Promised</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Unreach.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Settled</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeDays.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No calls logged in this window yet.</TableCell></TableRow>
                  )}
                  {activeDays.map((d) => {
                    const open = openDay === d.date;
                    const ents = entriesByDay[d.date] || [];
                    return (
                      <React.Fragment key={d.date}>
                        <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpenDay(open ? null : d.date)}>
                          <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(d.date)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{d.total}</TableCell>
                          <TableCell align="right" sx={{ color: STATUS_META.called.color }}>{d.called || '—'}</TableCell>
                          <TableCell align="right" sx={{ color: STATUS_META.promised.color }}>{d.promised || '—'}</TableCell>
                          <TableCell align="right" sx={{ color: STATUS_META.unreachable.color }}>{d.unreachable || '—'}</TableCell>
                          <TableCell align="right" sx={{ color: STATUS_META.settled.color }}>{d.settled || '—'}</TableCell>
                          <TableCell align="right">{open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                            <Collapse in={open} unmountOnExit>
                              <Box sx={{ py: 1, pl: 1 }}>
                                {ents.length === 0 ? <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted }}>No detail.</Typography> : ents.map((e, i) => {
                                  const sm = STATUS_META[e.status];
                                  return (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, borderTop: i > 0 ? '1px solid #eef2f7' : 'none' }}>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>
                                          {e.name}{e.className ? <Typography component="span" sx={{ color: FEE_COLORS.muted, fontWeight: 400 }}> · {e.className}</Typography> : ''}
                                        </Typography>
                                        {e.note && <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }} noWrap>{e.note}</Typography>}
                                      </Box>
                                      <Chip size="small" label={sm?.label || e.status || '—'} sx={{ height: 20, fontSize: 11, fontWeight: 700, color: sm?.color || FEE_COLORS.muted, bgcolor: '#f1f5f9' }} />
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Card>
          {data?.truncated && <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted, mt: 1 }}>Showing the most recent 3000 entries.</Typography>}
        </>
      )}
    </Box>
  );
}
