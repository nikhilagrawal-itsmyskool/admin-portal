import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableFooter,
  ToggleButtonGroup, ToggleButton, TextField, MenuItem, Link,
} from '@mui/material';
import { Payments as PaymentsIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { inr, errMsg, openReceipt, FEE_COLORS, PAYMENT_MODE_LABELS } from '../fees/feesUi';

// Read-only fees summary for the student 360° view (admin/god gated by the caller).
export default function StudentFeesPanel({ studentId, student }) {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [lines, setLines] = useState([]);
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState('dues'); // 'dues' | 'all' | 'receipts'
  const [receipts, setReceipts] = useState(null); // lazy-loaded for the Receipts view

  // Year switcher: any year the student was enrolled. Prior years may live under a 'historical'
  // (prev-admission) record, so each option carries its own studentId. Defaults to the current
  // year and resets whenever the student changes.
  const years = useMemo(() => {
    const seen = new Set(); const out = [];
    (student?.enrollments || []).forEach((e) => {
      if (e.kind === 'gap' || !e.academicYearId || seen.has(e.academicYearId)) return;
      seen.add(e.academicYearId);
      out.push({ id: e.academicYearId, name: e.academicYearName, studentId: e.studentId || studentId, historical: e.kind === 'historical' });
    });
    if (!seen.has(academicYearId)) out.unshift({ id: academicYearId, name: 'Current year', studentId, historical: false });
    return out;
  }, [student, studentId, academicYearId]);

  const [selYear, setSelYear] = useState(academicYearId);
  useEffect(() => { setSelYear(academicYearId); }, [studentId, academicYearId]);
  const opt = years.find((y) => y.id === selYear) || { id: selYear, studentId, historical: false };
  const effStudentId = opt.studentId;
  const isCurrent = selYear === academicYearId;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const [sm, led] = await Promise.all([
          feesService.getStudentSummary(effStudentId, selYear).catch(() => null),
          feesService.getStudentLedger(effStudentId, selYear),
        ]);
        if (!alive) return;
        setSummary(sm);
        setLines(led?.lines || []);
        setEntries(led?.entries || []);
        setReceipts(null);
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load fees')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [effStudentId, selYear]);

  const due = lines.filter((l) => l.remaining > 0);
  const dueNowLines = due.filter((l) => (l.bucket ? l.bucket === 'due' : l.due));
  const quarterLines = due.filter((l) => l.bucket === 'quarter');
  const laterLines = due.filter((l) => (l.bucket ? l.bucket === 'later' : !l.due));
  const upcomingLines = due.filter((l) => (l.bucket ? l.bucket !== 'due' : !l.due));
  const dueNowTotal = dueNowLines.reduce((s, l) => s + Number(l.remaining || 0), 0);
  const quarterTotal = quarterLines.reduce((s, l) => s + Number(l.remaining || 0), 0);
  const fullYearTotal = due.reduce((s, l) => s + Number(l.remaining || 0), 0);
  const quarterLabel = summary?.quarterLabel || 'This quarter';

  // Receipts view (lazy) + a charge->receipt map so a paid ledger row can open its receipt
  useEffect(() => {
    if (view !== 'receipts' || receipts !== null) return;
    feesService.getReceipts({ studentId: effStudentId, academicYearId: selYear }).then((r) => setReceipts(r || [])).catch(() => setReceipts([]));
  }, [view, receipts, effStudentId, selYear]);
  const receiptByCharge = useMemo(() => {
    const m = {};
    (entries || []).forEach((e) => { if (e.kind === 'payment' && e.settlesEntryId && e.sourceRef) m[e.settlesEntryId] = e.sourceRef; });
    return m;
  }, [entries]);

  // full-ledger totals (every charge, paid or not)
  const tot = lines.reduce((a, l) => ({
    charged: a.charged + Number(l.charged || 0),
    concession: a.concession + Number(l.concession || 0),
    paid: a.paid + Number(l.paid || 0),
    remaining: a.remaining + Number(l.remaining || 0),
  }), { charged: 0, concession: 0, paid: 0, remaining: 0 });

  const goCollect = () => navigate('/fees/collect', student ? { state: { student } } : undefined);

  const kpi = (label, value, color) => (
    <Card variant="outlined" sx={{ borderLeft: `4px solid ${color}` }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentsIcon fontSize="small" sx={{ color: FEE_COLORS.primary }} /> Fees &amp; Dues
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {years.length > 1 && (
            <TextField size="small" select value={selYear} onChange={(e) => setSelYear(e.target.value)} sx={{ minWidth: 130 }}>
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id} sx={{ fontSize: 13 }}>
                  {y.name}{y.id === academicYearId ? ' (current)' : ''}{y.historical ? ' · prev. adm' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="dues" sx={{ textTransform: 'none', py: 0.25 }}>Dues</ToggleButton>
            <ToggleButton value="all" sx={{ textTransform: 'none', py: 0.25 }}>Full ledger</ToggleButton>
            <ToggleButton value="receipts" sx={{ textTransform: 'none', py: 0.25 }}>Receipts</ToggleButton>
          </ToggleButtonGroup>
          {isCurrent && <Button size="small" variant="outlined" onClick={goCollect}>Collect →</Button>}
        </Box>
      </CardContent>

      {!isCurrent && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert severity="info" icon={false} sx={{ py: 0.25, fontSize: 12.5 }}>
            Viewing <b>{opt.name || 'a previous year'}</b>{opt.historical ? ' (previous admission)' : ''} — read-only. Switch back to the current year to collect.
          </Alert>
        </Box>
      )}

      <CardContent sx={{ pt: 0 }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={6} md={3}>{kpi('Due now', inr(summary?.dueNow ?? dueNowTotal), FEE_COLORS.danger)}</Grid>
              <Grid item xs={6} md={3}>{kpi(quarterLabel, inr(summary?.thisQuarter ?? quarterTotal), FEE_COLORS.warning)}</Grid>
              <Grid item xs={6} md={3}>{kpi('Full year', inr(summary?.outstanding ?? fullYearTotal), FEE_COLORS.primary)}</Grid>
              <Grid item xs={6} md={3}>{kpi('Paid this year', inr(summary?.paid || 0), FEE_COLORS.success)}</Grid>
            </Grid>
            {Number(summary?.advance || 0) > 0 && <Typography sx={{ fontSize: 12, color: FEE_COLORS.warning, mb: 1 }}>Advance held: {inr(summary.advance)}</Typography>}

            {view === 'dues' ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Status</TableCell><TableCell>Cycle</TableCell><TableCell>Head</TableCell><TableCell align="right">Due</TableCell></TableRow></TableHead>
                  <TableBody>
                    {due.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ color: FEE_COLORS.success, py: 2 }}>{lines.length ? 'All settled — nothing outstanding.' : 'No fee activity this year.'}</TableCell></TableRow>}
                    {dueNowLines.map((l) => <DueRow key={l.chargeId} l={l} />)}
                    {quarterLines.length > 0 && (
                      <TableRow><TableCell colSpan={4} sx={{ bgcolor: 'action.hover', color: FEE_COLORS.muted, fontSize: 12, fontStyle: 'italic', py: 0.5 }}>{quarterLabel.toLowerCase()} — not yet due</TableCell></TableRow>
                    )}
                    {quarterLines.map((l) => <DueRow key={l.chargeId} l={l} upcoming />)}
                    {laterLines.length > 0 && (
                      <TableRow><TableCell colSpan={4} sx={{ bgcolor: 'action.hover', color: FEE_COLORS.muted, fontSize: 12, fontStyle: 'italic', py: 0.5 }}>later this year</TableCell></TableRow>
                    )}
                    {laterLines.map((l) => <DueRow key={l.chargeId} l={l} upcoming />)}
                  </TableBody>
                  {due.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'text.primary' }}>Due now</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.danger }}>{inr(dueNowTotal)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} sx={{ color: FEE_COLORS.muted }}>Full year</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: FEE_COLORS.muted }}>{inr(fullYearTotal)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </Box>
            ) : view === 'all' ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 620 }}>
                  <TableHead><TableRow>
                    <TableCell>Status</TableCell><TableCell>Cycle</TableCell><TableCell>Head</TableCell>
                    <TableCell align="right">Charged</TableCell><TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Paid</TableCell><TableCell align="right">Balance</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {lines.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No fee activity this year.</TableCell></TableRow>}
                    {lines.map((l) => <FullRow key={l.chargeId} l={l} receiptId={receiptByCharge[l.chargeId]} />)}
                  </TableBody>
                  {lines.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'text.primary' }}>Totals</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{inr(tot.charged)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{tot.concession ? '−' + inr(tot.concession) : '0'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.success }}>{inr(tot.paid)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.danger }}>{inr(tot.remaining)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                {receipts === null ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
                ) : (
                  <>
                  {receipts.some((r) => r.type === 'transport' && r.status !== 'cancelled') && (
                    <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.warning, mb: 1 }}>
                      Transport collected this year: <b>{inr(receipts.filter((r) => r.type === 'transport' && r.status !== 'cancelled').reduce((s, r) => s + Number(r.totalPaid || 0), 0))}</b>
                    </Typography>
                  )}
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>Receipt</TableCell><TableCell>Date</TableCell><TableCell>Type</TableCell>
                      <TableCell>Mode</TableCell><TableCell align="right">Amount</TableCell><TableCell />
                    </TableRow></TableHead>
                    <TableBody>
                      {receipts.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No receipts this year.</TableCell></TableRow>}
                      {receipts.map((r) => (
                        <TableRow key={r.uuid} hover>
                          <TableCell>{r.receiptNo || r.legacyReceiptNo || '—'}{r.status === 'cancelled' && <Chip size="small" color="error" label="cancelled" sx={{ ml: 1, height: 18 }} />}</TableCell>
                          <TableCell>{r.receiptDate ? String(r.receiptDate).slice(0, 10) : '—'}</TableCell>
                          <TableCell>{r.type || 'fee'}</TableCell>
                          <TableCell>{PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{inr(r.totalPaid)}</TableCell>
                          <TableCell align="right"><Button size="small" onClick={() => openReceipt(r.uuid)}>Print</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )}
              </Box>
            )}

            <Typography sx={{ fontSize: 11, color: FEE_COLORS.muted, mt: 1.5 }}>
              Read-only summary · &quot;Due now&quot; = cycles whose due date has passed · <b>Full ledger</b> shows every charge incl. those already paid · fines pulled into the ledger.
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function statusChip(l) {
  if (l.remaining <= 0) return <Chip size="small" color="success" variant="outlined" label="Paid" />;
  if (l.status === 'partial') return <Chip size="small" color="warning" label="Part-paid" />;
  if (!l.due) return <Chip size="small" variant="outlined" label="Upcoming" />;
  return <Chip size="small" color="error" label="Due" />;
}

function DueRow({ l, upcoming }) {
  return (
    <TableRow hover sx={upcoming ? { opacity: 0.7 } : undefined}>
      <TableCell>{statusChip(l)}</TableCell>
      <TableCell>{l.cycleLabel || '—'}</TableCell>
      <TableCell>{l.headLabel}</TableCell>
      <TableCell align="right" sx={{ fontWeight: 600, color: upcoming ? FEE_COLORS.muted : FEE_COLORS.danger }}>{inr(l.remaining)}</TableCell>
    </TableRow>
  );
}

function FullRow({ l, receiptId }) {
  const paidFull = l.remaining <= 0;
  return (
    <TableRow hover sx={paidFull ? { opacity: 0.65 } : undefined}>
      <TableCell>{statusChip(l)}</TableCell>
      <TableCell>{l.cycleLabel || '—'}</TableCell>
      <TableCell>{l.headLabel}</TableCell>
      <TableCell align="right">{inr(l.charged)}</TableCell>
      <TableCell align="right">{l.concession ? '−' + inr(l.concession) : '0'}</TableCell>
      <TableCell align="right" sx={{ color: FEE_COLORS.success }}>
        {l.paid > 0 && receiptId
          ? <Link component="button" underline="hover" onClick={() => openReceipt(receiptId)} sx={{ color: FEE_COLORS.success }}>{inr(l.paid)}</Link>
          : inr(l.paid)}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 600, color: paidFull ? FEE_COLORS.muted : FEE_COLORS.danger }}>{inr(l.remaining)}</TableCell>
    </TableRow>
  );
}
