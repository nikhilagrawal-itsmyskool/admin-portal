import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableFooter,
  ToggleButtonGroup, ToggleButton, TextField, MenuItem, Link, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Payments as PaymentsIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { inr, errMsg, openReceipt, FEE_COLORS, PAYMENT_MODE_LABELS } from '../fees/feesUi';
import FollowupDialog, { fLabel, fColor } from '../fees/FollowupDialog';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// Read-only fees summary for the student 360° view (admin/god gated by the caller).
export default function StudentFeesPanel({ studentId, student }) {
  const navigate = useNavigate();
  const { academicYearId, years: ayList } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [lines, setLines] = useState([]);
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState('dues'); // 'dues' | 'all' | 'receipts' | 'transport'
  const [receipts, setReceipts] = useState(null); // lazy-loaded for the Receipts view
  const [transport, setTransport] = useState(null); // lazy-loaded for the Transport view
  const [wd, setWd] = useState(null); // withdraw dialog: null | { date, reason, busy, done }
  const [allYears, setAllYears] = useState(false); // receipts: show only the selected year (off) or every year (on)
  const [showCancelled, setShowCancelled] = useState(false); // cancelled receipts hidden by default
  const [cancelTarget, setCancelTarget] = useState(null); // receipt being cancelled
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bump to reload after a cancel
  const canManage = useCan()(ACTIONS.FEE_MANAGE);
  const [followup, setFollowup] = useState([]); // follow-up timeline entries
  const [followOpen, setFollowOpen] = useState(false);

  // The actual current academic year (never changes with the top selector) + a name lookup.
  const ctxYearName = useMemo(() => { const m = {}; (ayList || []).forEach((y) => { m[y.uuid] = y.name; }); return m; }, [ayList]);
  const trueCurrentAyId = useMemo(() => (ayList || []).find((y) => y.isCurrent)?.uuid || academicYearId, [ayList, academicYearId]);
  const yearLabel = (id) => (ctxYearName[id] || 'Selected year') + (id === trueCurrentAyId ? ' • current' : '');

  // Year switcher: any year the student was enrolled. Prior years may live under a 'historical'
  // (prev-admission) record, so each option carries its own studentId. Names are the real years
  // (e.g. 2025-26); "current" only ever marks the actual current academic year, not the selection.
  const years = useMemo(() => {
    const seen = new Set(); const out = [];
    (student?.enrollments || []).forEach((e) => {
      if (e.kind === 'gap' || !e.academicYearId || seen.has(e.academicYearId)) return;
      seen.add(e.academicYearId);
      out.push({ id: e.academicYearId, name: e.academicYearName || ctxYearName[e.academicYearId] || e.academicYearId, studentId: e.studentId || studentId, historical: e.kind === 'historical' });
    });
    if (!seen.has(academicYearId)) out.unshift({ id: academicYearId, name: ctxYearName[academicYearId] || 'Selected year', studentId, historical: false });
    return out;
  }, [student, studentId, academicYearId, ctxYearName]);

  const [selYear, setSelYear] = useState(academicYearId);
  useEffect(() => { setSelYear(academicYearId); }, [studentId, academicYearId]);
  const opt = years.find((y) => y.id === selYear) || { id: selYear, name: ctxYearName[selYear], studentId, historical: false };
  const effStudentId = opt.studentId;
  const isCurrent = selYear === trueCurrentAyId; // collect only in the ACTUAL current year

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const [sm, led, fu] = await Promise.all([
          feesService.getStudentSummary(effStudentId, selYear).catch(() => null),
          feesService.getStudentLedger(effStudentId, selYear),
          feesService.getFollowup({ studentId: effStudentId, academicYearId: selYear }).catch(() => ({ entries: [] })),
        ]);
        if (!alive) return;
        setSummary(sm);
        setLines(led?.lines || []);
        setEntries(led?.entries || []);
        setFollowup(fu?.entries || []);
        setReceipts(null);
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load fees')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [effStudentId, selYear, refreshKey]);

  const due = lines.filter((l) => l.remaining > 0);
  const dueNowLines = due.filter((l) => (l.bucket ? l.bucket === 'due' : l.due));
  const quarterLines = due.filter((l) => l.bucket === 'quarter');
  const laterLines = due.filter((l) => (l.bucket ? l.bucket === 'later' : !l.due));
  const upcomingLines = due.filter((l) => (l.bucket ? l.bucket !== 'due' : !l.due));
  const dueNowTotal = dueNowLines.reduce((s, l) => s + Number(l.remaining || 0), 0);
  const quarterTotal = quarterLines.reduce((s, l) => s + Number(l.remaining || 0), 0);
  const fullYearTotal = due.reduce((s, l) => s + Number(l.remaining || 0), 0);
  const quarterLabel = summary?.quarterLabel || 'This quarter';

  // Receipts view (lazy, re-fetches on scope/cancelled toggle) + a charge->receipt map
  useEffect(() => {
    if (view !== 'receipts') return;
    let alive = true;
    setReceipts(null);
    const inc = showCancelled ? 'true' : undefined;
    const sortByDate = (a, b) => String(b.receiptDate || '').localeCompare(String(a.receiptDate || ''));
    if (allYears) {
      // historical years live under prior-admission studentIds — fetch each, merge, dedupe
      const sids = [...new Set(years.map((y) => y.studentId).filter(Boolean))];
      Promise.all(sids.map((sid) => feesService.getReceipts({ studentId: sid, includeCancelled: inc }).catch(() => [])))
        .then((arrs) => {
          if (!alive) return;
          const seen = new Set(); const merged = [];
          arrs.flat().forEach((r) => { if (r && !seen.has(r.uuid)) { seen.add(r.uuid); merged.push(r); } });
          setReceipts(merged.sort(sortByDate));
        }).catch(() => { if (alive) setReceipts([]); });
    } else {
      const sid = opt.studentId || effStudentId;
      feesService.getReceipts({ studentId: sid, academicYearId: selYear, includeCancelled: inc })
        .then((r) => { if (alive) setReceipts((r || []).sort(sortByDate)); })
        .catch(() => { if (alive) setReceipts([]); });
    }
    return () => { alive = false; };
  }, [view, allYears, selYear, showCancelled, years, effStudentId, refreshKey]);

  // Transport view (lazy) — this-year receipts + this-year & all-years collected totals. Transport-only.
  useEffect(() => {
    if (view !== 'transport') return;
    let alive = true; setTransport(null);
    const sids = [...new Set(years.map((y) => y.studentId).filter(Boolean))];
    const active = (arr) => (arr || []).filter((r) => r && r.status !== 'cancelled');
    Promise.all([
      feesService.getReceipts({ studentId: effStudentId, academicYearId: selYear, type: 'transport' }).catch(() => []),
      Promise.all(sids.map((sid) => feesService.getReceipts({ studentId: sid, type: 'transport' }).catch(() => []))).then((a) => a.flat()),
    ]).then(([yr, all]) => {
      if (!alive) return;
      const seen = new Set(); const allA = active(all).filter((r) => !seen.has(r.uuid) && seen.add(r.uuid));
      const yrA = active(yr).sort((a, b) => String(b.receiptDate || '').localeCompare(String(a.receiptDate || '')));
      setTransport({
        rows: yrA,
        yearTotal: yrA.reduce((s, r) => s + Number(r.totalPaid || 0), 0),
        allTotal: allA.reduce((s, r) => s + Number(r.totalPaid || 0), 0),
      });
    }).catch(() => { if (alive) setTransport({ rows: [], yearTotal: 0, allTotal: 0 }); });
    return () => { alive = false; };
  }, [view, selYear, effStudentId, years, refreshKey]);

  const doWithdraw = async () => {
    if (!wd?.date) return;
    setWd((s) => ({ ...s, busy: true }));
    try {
      const res = await feesService.withdrawStudent(effStudentId, { date: wd.date, reason: wd.reason || undefined });
      setWd((s) => ({ ...s, busy: false, done: res }));
      setRefreshKey((k) => k + 1);
    } catch (err) { setError(errMsg(err, 'Withdraw failed')); setWd((s) => ({ ...s, busy: false })); }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await feesService.cancelReceipt(cancelTarget.uuid, { reason: cancelReason.trim() || undefined });
      setCancelTarget(null); setCancelReason('');
      setRefreshKey((k) => k + 1); // reloads ledger (charges re-open) + receipts (shows cancelled)
    } catch (err) { setError(errMsg(err, 'Failed to cancel receipt')); }
    finally { setCancelBusy(false); }
  };
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

  const kpi = (label, value, color, sub) => (
    <Card variant="outlined" sx={{ borderLeft: `4px solid ${color}` }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {label}{sub ? <Box component="span" sx={{ textTransform: 'none', fontWeight: 400, ml: 0.5, fontSize: 10 }}>{sub}</Box> : null}
        </Typography>
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
                  {y.name}{y.id === trueCurrentAyId ? ' • current' : ''}{y.historical ? ' · prev. adm' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="dues" sx={{ textTransform: 'none', py: 0.25 }}>Dues</ToggleButton>
            <ToggleButton value="all" sx={{ textTransform: 'none', py: 0.25 }}>Full ledger</ToggleButton>
            <ToggleButton value="receipts" sx={{ textTransform: 'none', py: 0.25 }}>Receipts</ToggleButton>
            <ToggleButton value="transport" sx={{ textTransform: 'none', py: 0.25 }}>Transport</ToggleButton>
          </ToggleButtonGroup>
          {isCurrent && <Button size="small" variant="outlined" onClick={goCollect}>Collect →</Button>}
          {canManage && (student?.status || 'active') === 'active' && (
            <Button size="small" color="warning" onClick={() => setWd({ date: new Date().toISOString().slice(0, 10), reason: '', busy: false })}>Mark withdrawn</Button>
          )}
        </Box>
      </CardContent>

      {!isCurrent && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert severity="info" icon={false} sx={{ py: 0.25, fontSize: 12.5 }}>
            Viewing <b>{opt.name || ctxYearName[selYear] || 'another year'}</b>{opt.historical ? ' (previous admission)' : ''} — read-only. Switch to <b>{ctxYearName[trueCurrentAyId] || 'the current year'}</b> to collect.
          </Alert>
        </Box>
      )}

      <CardContent sx={{ pt: 0 }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={6} md={3}>{kpi('Due now', inr(summary?.dueNow ?? dueNowTotal), FEE_COLORS.danger, summary?.monthEndLabel)}</Grid>
              <Grid item xs={6} md={3}>{kpi('Due qtr', inr(summary?.dueQuarter ?? (dueNowTotal + quarterTotal)), FEE_COLORS.warning, summary?.quarterEndLabel)}</Grid>
              <Grid item xs={6} md={3}>{kpi('Due full year', inr(summary?.outstanding ?? fullYearTotal), FEE_COLORS.primary, summary?.yearEndLabel)}</Grid>
              <Grid item xs={6} md={3}>{kpi('Paid this year', inr(summary?.paid || 0), FEE_COLORS.success)}</Grid>
            </Grid>
            {Number(summary?.advance || 0) > 0 && <Typography sx={{ fontSize: 12, color: FEE_COLORS.warning, mb: 1 }}>Advance held: {inr(summary.advance)}</Typography>}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>Follow-up:</Typography>
              {followup.length > 0 ? (
                <>
                  {followup[0].status && <Chip size="small" color={fColor(followup[0].status)} label={fLabel(followup[0].status)} />}
                  <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>
                    {followup.length} {followup.length === 1 ? 'entry' : 'entries'} · last {followup[0].createdAt ? new Date(followup[0].createdAt).toLocaleDateString('en-IN') : ''}
                    {followup[0].note ? ` · ${String(followup[0].note).slice(0, 40)}` : ''}
                  </Typography>
                </>
              ) : <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>none</Typography>}
              <Button size="small" onClick={() => setFollowOpen(true)}>{followup.length ? 'View log' : 'Add'}</Button>
            </Box>

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
                        <TableCell colSpan={3} sx={{ color: FEE_COLORS.muted }}>Due full year</TableCell>
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
            ) : view === 'transport' ? (
              <Box sx={{ overflowX: 'auto' }}>
                {transport === null ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
                ) : (
                  <>
                    <Grid container spacing={2} sx={{ mb: 1 }}>
                      <Grid item xs={6}>{kpi(`Transport · ${opt.name || ctxYearName[selYear] || 'this year'}`, inr(transport.yearTotal), FEE_COLORS.primary)}</Grid>
                      <Grid item xs={6}>{kpi('Transport · all years', inr(transport.allTotal), FEE_COLORS.muted)}</Grid>
                    </Grid>
                    <Alert severity="info" icon={false} sx={{ mb: 1, fontSize: 12 }}>Transport is tracked separately from fees — collection only; no dues yet (charges not mapped).</Alert>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Receipt</TableCell><TableCell>Date</TableCell><TableCell>Months</TableCell><TableCell>Mode</TableCell><TableCell align="right">Amount</TableCell><TableCell /></TableRow></TableHead>
                      <TableBody>
                        {transport.rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No transport receipts this year.</TableCell></TableRow>}
                        {transport.rows.map((r) => (
                          <TableRow key={r.uuid} hover>
                            <TableCell>{r.receiptNo || r.legacyReceiptNo || '—'}</TableCell>
                            <TableCell>{r.receiptDate ? String(r.receiptDate).slice(0, 10) : '—'}</TableCell>
                            <TableCell sx={{ color: FEE_COLORS.muted }}>{r.cycleSet || r.transportRemark || '—'}</TableCell>
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
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                {receipts === null ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
                ) : (
                  <>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={<Switch size="small" checked={allYears} onChange={(e) => setAllYears(e.target.checked)} />}
                      label={allYears ? 'All years' : `${opt.name || ctxYearName[selYear] || 'Selected year'} only`}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                    />
                    <FormControlLabel
                      control={<Switch size="small" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />}
                      label="Show cancelled"
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                    />
                  </Box>
                  {receipts.some((r) => r.type === 'transport' && r.status !== 'cancelled') && (
                    <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.warning, mb: 1 }}>
                      Transport collected{allYears ? '' : ' this year'}: <b>{inr(receipts.filter((r) => r.type === 'transport' && r.status !== 'cancelled').reduce((s, r) => s + Number(r.totalPaid || 0), 0))}</b>
                    </Typography>
                  )}
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>Receipt</TableCell><TableCell>Date</TableCell>{allYears && <TableCell>Year</TableCell>}<TableCell>Type</TableCell>
                      <TableCell>Mode</TableCell><TableCell align="right">Amount</TableCell><TableCell />
                    </TableRow></TableHead>
                    <TableBody>
                      {receipts.length === 0 && <TableRow><TableCell colSpan={allYears ? 7 : 6} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No {showCancelled ? '' : 'active '}receipts{allYears ? '' : ' this year'}.</TableCell></TableRow>}
                      {receipts.map((r) => {
                        const cancelled = r.status === 'cancelled';
                        return (
                        <TableRow key={r.uuid} hover sx={cancelled ? { opacity: 0.6 } : undefined}>
                          <TableCell sx={cancelled ? { textDecoration: 'line-through' } : undefined}>{r.receiptNo || r.legacyReceiptNo || '—'}{cancelled && <Chip size="small" color="error" label={r.cancelReason ? `cancelled · ${r.cancelReason}` : 'cancelled'} sx={{ ml: 1, height: 18, textDecoration: 'none' }} />}</TableCell>
                          <TableCell>{r.receiptDate ? String(r.receiptDate).slice(0, 10) : '—'}</TableCell>
                          {allYears && <TableCell>{ctxYearName[r.academicYearId] || '—'}</TableCell>}
                          <TableCell>{r.type || 'fee'}</TableCell>
                          <TableCell>{PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, ...(cancelled ? { textDecoration: 'line-through', color: FEE_COLORS.muted } : {}) }}>{inr(r.totalPaid)}</TableCell>
                          <TableCell align="right">
                            <Button size="small" onClick={() => openReceipt(r.uuid)}>Print</Button>
                            {!cancelled && canManage && <Button size="small" color="error" onClick={() => { setCancelTarget(r); setCancelReason(''); }}>Cancel</Button>}
                          </TableCell>
                        </TableRow>
                        );
                      })}
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
      <FollowupDialog open={followOpen} onClose={() => setFollowOpen(false)} studentId={effStudentId} academicYearId={selYear} studentName={student?.name || 'Student'}
        onChanged={() => feesService.getFollowup({ studentId: effStudentId, academicYearId: selYear }).then((r) => setFollowup(r?.entries || [])).catch(() => {})} />

      <Dialog open={!!cancelTarget} onClose={() => !cancelBusy && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel receipt {cancelTarget?.receiptNo || cancelTarget?.legacyReceiptNo}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted, mb: 1.5 }}>
            This voids the receipt&apos;s payment ({inr(cancelTarget?.totalPaid)}). The charges it covered will re-open as <b>due</b> and the student&apos;s outstanding will rise by that amount. The receipt stays visible, marked cancelled. This cannot be undone from here.
          </Typography>
          <TextField autoFocus fullWidth size="small" label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. wrong student / duplicate / mode change" multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelBusy}>Keep</Button>
          <Button color="error" variant="contained" onClick={doCancel} disabled={cancelBusy}>{cancelBusy ? 'Cancelling…' : 'Cancel receipt'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!wd} onClose={() => !wd?.busy && setWd(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark withdrawn — {student?.name || 'student'}</DialogTitle>
        <DialogContent>
          {wd?.done ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Marked withdrawn. {wd.done.cyclesVoided > 0 ? <>Capped <b>{wd.done.cyclesVoided}</b> unpaid cycle{wd.done.cyclesVoided === 1 ? '' : 's'} due after the leaving month ({inr(wd.done.amountVoided)} removed).</> : 'No unpaid post-departure cycles to cap.'}
            </Alert>
          ) : (
            <>
              <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted, mb: 1.5 }}>
                Sets the student <b>inactive</b> and voids <b>unpaid</b> fee cycles due <b>after</b> the leaving month (paid cycles are never touched). This corrects phantom dues — it is not a full TC/withdrawal.
              </Typography>
              <TextField type="date" fullWidth size="small" label="Last attendance / leaving date" InputLabelProps={{ shrink: true }} value={wd?.date || ''} onChange={(e) => setWd((s) => ({ ...s, date: e.target.value }))} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="Reason (optional)" value={wd?.reason || ''} onChange={(e) => setWd((s) => ({ ...s, reason: e.target.value }))} placeholder="e.g. relocated / TC issued" multiline minRows={2} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {wd?.done
            ? <Button variant="contained" onClick={() => setWd(null)}>Done</Button>
            : <>
                <Button onClick={() => setWd(null)} disabled={wd?.busy}>Cancel</Button>
                <Button color="warning" variant="contained" onClick={doWithdraw} disabled={wd?.busy || !wd?.date}>{wd?.busy ? 'Working…' : 'Mark withdrawn'}</Button>
              </>}
        </DialogActions>
      </Dialog>
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
