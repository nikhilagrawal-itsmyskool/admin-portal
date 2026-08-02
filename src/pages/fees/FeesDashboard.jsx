import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, IconButton,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import {
  Add as AddIcon, Print as PrintIcon, Payments as PaymentsIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { inr, inrShort, errMsg, PAYMENT_MODE_LABELS, FEE_COLORS } from './feesUi';

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (d) => d.toISOString().slice(0, 10);
const dayLabel = (d) => d.toLocaleDateString('en-IN', { weekday: 'short' });

function Kpi({ label, value, sub, accent, subColor }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography sx={{ color: FEE_COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 700, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        {sub && <Typography sx={{ fontSize: 12, mt: 0.5, color: subColor || FEE_COLORS.muted }}>{sub}</Typography>}
        <Box sx={{ height: 3, borderRadius: 3, mt: 1.5, bgcolor: accent || FEE_COLORS.primary, opacity: 0.85 }} />
      </CardContent>
    </Card>
  );
}

export default function FeesDashboard() {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [modes, setModes] = useState([]);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const today = new Date();
      const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * DAY_MS));
      const [ov, todayReport, recentReceipts, ...daily] = await Promise.all([
        feesService.getOverview(academicYearId).catch(() => null),
        feesService.getDailyCollection({ date: iso(today) }).catch(() => null),
        feesService.getReceipts({}).catch(() => []),
        ...days.map((d) => feesService.getDailyCollection({ date: iso(d) }).catch(() => null)),
      ]);
      setOverview(ov);
      setModes((todayReport?.byMode) || []);
      setReceipts((recentReceipts || []).slice(0, 8));
      setTrend(days.map((d, i) => ({ day: dayLabel(d), total: Number(daily[i]?.total?.total || 0) })));
    } catch (err) {
      setError(errMsg(err, 'Failed to load the fees overview'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const collectedToday = overview?.collectedToday ?? (modes.reduce((s, m) => s + Number(m.total || 0), 0));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Fees Overview</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Collections, dues & advances at a glance</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/fees/collect')}>
          Collect Fees
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}><Kpi label="Collected today" value={inr(collectedToday)} accent={FEE_COLORS.primary} /></Grid>
        <Grid item xs={6} md={2.4}><Kpi label="This month" value={inrShort(overview?.collectedMonth)} accent={FEE_COLORS.success} /></Grid>
        <Grid item xs={6} md={2.4}><Kpi label="Outstanding" value={inrShort(overview?.outstanding)} sub={overview ? `${overview.duesStudents || 0} students with dues` : '—'} subColor={FEE_COLORS.danger} accent={FEE_COLORS.danger} /></Grid>
        <Grid item xs={6} md={2.4}><Kpi label="Advance held" value={inrShort(overview?.advance)} sub={overview ? `${overview.advanceStudents || 0} students` : '—'} accent={FEE_COLORS.warning} /></Grid>
        <Grid item xs={6} md={2.4}><Kpi label="Concessions (yr)" value={inrShort(overview?.concessionYtd)} accent={FEE_COLORS.primaryLight} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Collections — last 7 days</Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke={FEE_COLORS.muted} />
                    <Tooltip formatter={(v) => inr(v)} cursor={{ fill: 'rgba(51,102,255,.08)' }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {trend.map((_, i) => <Cell key={i} fill={i === trend.length - 1 ? FEE_COLORS.primary : FEE_COLORS.primaryLight} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Payment modes today</Typography>
              {modes.length === 0 && <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13, py: 2 }}>No collection recorded today.</Typography>}
              {modes.map((m) => (
                <Box key={m.paymentMode || 'na'} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${FEE_COLORS.border}` }}>
                  <span>{PAYMENT_MODE_LABELS[m.paymentMode] || m.paymentMode || '—'}</span>
                  <b>{inr(m.total)}</b>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ pb: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Recent receipts</Typography>
        </CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Receipt #</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Class</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Date</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>No receipts yet.</TableCell></TableRow>
              )}
              {receipts.map((r) => (
                <TableRow key={r.uuid} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.receiptNo || r.legacyReceiptNo}</TableCell>
                  <TableCell>{r.payerName || '—'}</TableCell>
                  <TableCell>{r.payerClassSnapshot || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{inr(r.totalPaid)}</TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'} /></TableCell>
                  <TableCell>{r.receiptDate}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Print" onClick={() => window.open(feesService.receiptPrintUrl(r.uuid), '_blank')}>
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
