import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, Divider,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem,
  Checkbox, FormControlLabel, CircularProgress, ToggleButtonGroup, ToggleButton, IconButton,
} from '@mui/material';
import { PersonSearch as PersonSearchIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import CommandPalette from '../../components/common/CommandPalette';
import { errMsg, inr, openReceipt, FEE_COLORS, PAYMENT_MODE_LABELS } from './feesUi';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const PAY_MODES = ['cash', 'online', 'card', 'cheque', 'draft', 'neft', 'ecs', 'bank-deposit', 'rte'];
const RECEIVED = ['father', 'mother', 'guardian', 'other'];
const today = () => new Date().toISOString().slice(0, 10);

export default function CollectFees() {
  const { academicYearId } = useAcademicYear();
  const location = useLocation();
  const [tab, setTab] = useState('fee');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [pick, setPick] = useState(false);

  const [student, setStudent] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [sel, setSel] = useState({}); // chargeId -> { checked, amount }
  const [pay, setPay] = useState({ mode: 'cash', receivedFrom: 'father', date: today(), remarks: '', notify: true });
  const [useAdvance, setUseAdvance] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const canWaive = useCan()(ACTIONS.FEE_MANAGE);
  const [received, setReceived] = useState(''); // for oldest-first auto-allocate
  const [waive, setWaive] = useState({ on: false, reason: '' });
  const [showFullYear, setShowFullYear] = useState(false);

  // adhoc
  const [adhoc, setAdhoc] = useState({ payerName: '', mode: 'cash', date: today(), remarks: '', lines: [{ headLabel: '', amount: '' }], saving: false });

  const chooseStudent = async (s) => {
    setPick(false); setStudent(s); setLedger(null); setSummary(null); setSel({}); setError(''); setOk('');
    setLoadingLedger(true);
    try {
      const [l, sm] = await Promise.all([
        feesService.getStudentLedger(s.uuid, academicYearId),
        feesService.getStudentSummary(s.uuid, academicYearId).catch(() => null),
      ]);
      setLedger(l); setSummary(sm);
      setUseAdvance(Number(sm?.advance || 0) > 0);
      const due = (l.lines || []).filter((ln) => ln.remaining > 0);
      const init = {};
      due.forEach((ln) => { init[ln.chargeId] = { checked: !!ln.due, amount: String(ln.remaining) }; }); // pre-tick due-now
      setSel(init);
    } catch (err) { setError(errMsg(err, 'Failed to load the ledger')); }
    finally { setLoadingLedger(false); }
  };

  // pre-load a student passed via navigation (e.g. the Collect button on the student 360 panel)
  useEffect(() => {
    const pre = location.state?.student;
    if (pre?.uuid && academicYearId && student?.uuid !== pre.uuid) chooseStudent(pre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, academicYearId]);

  const dueLines = (ledger?.lines || []).filter((ln) => ln.remaining > 0);
  const dueNowLines = dueLines.filter((ln) => (ln.bucket ? ln.bucket === 'due' : ln.due));
  const quarterLines = dueLines.filter((ln) => ln.bucket === 'quarter');
  const laterLines = dueLines.filter((ln) => ln.bucket === 'later');
  const upcomingLines = dueLines.filter((ln) => (ln.bucket ? ln.bucket !== 'due' : !ln.due)); // quarter + later (for oldest-first + advance)
  const quarterLabel = ledger?.totals?.quarterLabel || 'This quarter';
  const selectedTotal = dueLines.reduce((s, ln) => {
    const e = sel[ln.chargeId];
    return e?.checked ? s + (Number(e.amount) || 0) : s;
  }, 0);

  const advanceAvail = Number(summary?.advance || 0);
  const advanceApplied = useAdvance ? Math.min(advanceAvail, selectedTotal) : 0;
  const payable = Math.max(0, selectedTotal - advanceApplied);
  const r2 = (x) => Math.round(x * 100) / 100;
  const tickedDue = dueLines.filter((ln) => sel[ln.chargeId]?.checked).reduce((s, ln) => s + Number(ln.remaining || 0), 0);
  const waiveTotal = waive.on ? Math.max(0, r2(tickedDue - selectedTotal)) : 0;

  const toggle = (id, checked) => setSel((p) => ({ ...p, [id]: { ...p[id], checked } }));
  const setAmt = (id, amount) => setSel((p) => ({ ...p, [id]: { ...p[id], amount } }));

  // oldest-first: spread `received` across due rows in cycle order, ticking + filling each
  const autoAllocate = () => {
    let left = Number(received) || 0;
    const next = {};
    for (const ln of [...dueNowLines, ...upcomingLines]) {
      const take = Math.min(Number(ln.remaining), Math.max(0, left));
      next[ln.chargeId] = take > 0 ? { checked: true, amount: String(r2(take)) } : { checked: false, amount: String(ln.remaining) };
      left = r2(left - take);
    }
    setSel(next);
  };

  const renderDueRow = (ln, upcoming) => {
    const e = sel[ln.chargeId] || {};
    return (
      <TableRow key={ln.chargeId} hover selected={!!e.checked} sx={upcoming ? { opacity: 0.75 } : undefined}>
        <TableCell padding="checkbox"><Checkbox size="small" checked={!!e.checked} onChange={(ev) => toggle(ln.chargeId, ev.target.checked)} /></TableCell>
        <TableCell>{ln.cycleLabel || '—'}</TableCell>
        <TableCell>
          {ln.headLabel}
          {ln.status === 'partial' && <Chip size="small" color="warning" label="Part-paid" sx={{ ml: 1, height: 18 }} />}
          {ln.category && ln.category !== 'fee' && <Chip size="small" variant="outlined" label={ln.category} sx={{ ml: 1, height: 18 }} />}
        </TableCell>
        <TableCell align="right">{inr(ln.charged)}</TableCell>
        <TableCell align="right">{ln.concession ? '−' + inr(ln.concession) : '0'}</TableCell>
        <TableCell align="right">{inr(ln.paid)}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>{inr(ln.remaining)}</TableCell>
        <TableCell align="right" sx={{ p: 0.5 }}>
          <TextField size="small" variant="standard" type="number" disabled={!e.checked}
            value={e.amount ?? ''} onChange={(ev) => setAmt(ln.chargeId, ev.target.value)}
            inputProps={{ style: { textAlign: 'right', width: 78 }, max: ln.remaining }} />
        </TableCell>
      </TableRow>
    );
  };

  const collect = async () => {
    const allocations = dueLines
      .filter((ln) => sel[ln.chargeId]?.checked && Number(sel[ln.chargeId]?.amount) > 0)
      .map((ln) => ({ ledgerId: ln.chargeId, amount: Number(sel[ln.chargeId].amount) }));
    const waivers = waive.on
      ? dueLines
          .filter((ln) => sel[ln.chargeId]?.checked)
          .map((ln) => ({ ledgerId: ln.chargeId, amount: r2(Number(ln.remaining) - (Number(sel[ln.chargeId]?.amount) || 0)) }))
          .filter((w) => w.amount > 0)
      : [];
    if (!allocations.length && !waivers.length) { setError('Tick at least one component to collect or waive.'); return; }
    if (waivers.length && !waive.reason.trim()) { setError('Enter a reason for the write-off.'); return; }
    setCollecting(true); setError(''); setOk('');
    try {
      const receipt = await feesService.collect({
        studentId: student.uuid, academicYearId, allocations,
        advanceApplied: useAdvance ? Math.min(advanceAvail, allocations.reduce((s, a) => s + a.amount, 0)) : 0,
        waivers, waiveReason: waive.reason.trim() || null,
        paymentMode: pay.mode, receivedFrom: pay.receivedFrom, receiptDate: pay.date, remarks: pay.remarks || null,
      });
      setOk(`Receipt ${receipt.receiptNo || ''} — collected ${inr(receipt.totalPaid)}${receipt.waiverTotal ? `, waived ${inr(receipt.waiverTotal)}` : ''}.`);
      openReceipt(receipt.uuid);
      setWaive({ on: false, reason: '' }); setReceived('');
      chooseStudent(student); // refresh ledger
    } catch (err) { setError(errMsg(err)); }
    finally { setCollecting(false); }
  };

  const saveAdhoc = async () => {
    const lines = adhoc.lines.filter((l) => l.headLabel.trim() && Number(l.amount) > 0).map((l) => ({ headLabel: l.headLabel.trim(), amount: Number(l.amount) }));
    if (!lines.length) { setError('Add at least one adhoc line.'); return; }
    setAdhoc((s) => ({ ...s, saving: true })); setError(''); setOk('');
    try {
      const receipt = await feesService.collectAdhoc({ academicYearId, payerName: adhoc.payerName || null, paymentMode: adhoc.mode, receiptDate: adhoc.date, remarks: adhoc.remarks || null, lines });
      setOk(`Adhoc receipt ${receipt.receiptNo || ''} created.`);
      openReceipt(receipt.uuid);
      setAdhoc({ payerName: '', mode: 'cash', date: today(), remarks: '', lines: [{ headLabel: '', amount: '' }], saving: false });
    } catch (err) { setError(errMsg(err)); setAdhoc((s) => ({ ...s, saving: false })); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Collect Fees</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Find student → see the ledger → tick what they're paying → collect.</Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={tab} onChange={(_, v) => v && setTab(v)}>
          <ToggleButton value="fee">Fee payment</ToggleButton>
          <ToggleButton value="adhoc">Adhoc / General</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOk('')}>{ok}</Alert>}

      {tab === 'fee' ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {!student && <Button variant="contained" startIcon={<PersonSearchIcon />} onClick={() => setPick(true)}>Find student</Button>}
              {student && (
                <>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'rgba(51,102,255,.12)', color: FEE_COLORS.primary, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                    {(student.name || '?').slice(0, 2).toUpperCase()}
                  </Box>
                  <Fact k="Student" v={student.name} />
                  <Fact k="Adm. No." v={student.admissionNumber || '—'} />
                  <Fact k="Class" v={student.currentClassName || student.className || '—'} />
                  <Fact k="Advance" v={inr(summary?.advance || 0)} color={FEE_COLORS.warning} />
                  <Box sx={{ flex: 1 }} />
                  <Button variant="outlined" size="small" onClick={() => setPick(true)}>Change student</Button>
                </>
              )}
            </CardContent>
          </Card>

          {loadingLedger && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

          {student && !loadingLedger && ledger && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Ledger — outstanding dues</Typography>
                    <Typography sx={{ color: FEE_COLORS.muted, fontSize: 12 }}>tick rows to collect</Typography>
                  </CardContent>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>Cycle</TableCell>
                          <TableCell>Head</TableCell>
                          <TableCell align="right">Charged</TableCell>
                          <TableCell align="right">Conc.</TableCell>
                          <TableCell align="right">Paid</TableCell>
                          <TableCell align="right">Due</TableCell>
                          <TableCell align="right">Pay now</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dueLines.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ color: FEE_COLORS.success, py: 3 }}>All settled — nothing outstanding. 🎉</TableCell></TableRow>}
                        {dueNowLines.map((ln) => renderDueRow(ln, false))}
                        {quarterLines.length > 0 && (
                          <TableRow><TableCell colSpan={8} sx={{ bgcolor: 'action.hover', color: FEE_COLORS.muted, fontSize: 12, fontStyle: 'italic', py: 0.5 }}>{quarterLabel.toLowerCase()} — not yet due (tick to collect ahead)</TableCell></TableRow>
                        )}
                        {quarterLines.map((ln) => renderDueRow(ln, true))}
                        {laterLines.length > 0 && !showFullYear && (
                          <TableRow><TableCell colSpan={8} align="center" sx={{ py: 0.75 }}><Button size="small" onClick={() => setShowFullYear(true)}>Show full year ({laterLines.length} more)</Button></TableCell></TableRow>
                        )}
                        {showFullYear && laterLines.length > 0 && (
                          <TableRow><TableCell colSpan={8} sx={{ bgcolor: 'action.hover', color: FEE_COLORS.muted, fontSize: 12, fontStyle: 'italic', py: 0.5 }}>later this year</TableCell></TableRow>
                        )}
                        {showFullYear && laterLines.map((ln) => renderDueRow(ln, true))}
                      </TableBody>
                    </Table>
                  </Box>
                  <CardContent sx={{ borderTop: `1px solid ${FEE_COLORS.border}` }}>
                    <Alert severity="info" icon={false} sx={{ fontSize: 12 }}>
                      One unified ledger — fees, transport &amp; fines settle together. Pay any amount per component; <b>Part-paid</b> lines reappear with the remainder.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ position: 'sticky', top: 80 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Payment</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField size="small" type="number" label="Amount received" value={received} onChange={(e) => setReceived(e.target.value)} sx={{ flex: 1 }} />
                      <Button size="small" variant="outlined" onClick={autoAllocate} disabled={!(Number(received) > 0)} sx={{ whiteSpace: 'nowrap' }}>Split oldest-first</Button>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, fontSize: 12.5, color: FEE_COLORS.muted }}>
                      <span>Due now {inr(summary?.dueNow || 0)}</span>
                      <span>Full year {inr(summary?.outstanding || 0)}</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <span>Selected</span><b>{inr(selectedTotal)}</b>
                    </Box>
                    {advanceAvail > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, color: FEE_COLORS.warning }}>
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={<Checkbox size="small" checked={useAdvance} onChange={(e) => setUseAdvance(e.target.checked)} />}
                          label={<span style={{ fontSize: 13 }}>Apply advance <span style={{ color: FEE_COLORS.muted }}>({inr(advanceAvail)} available)</span></span>}
                        />
                        <span>− {inr(advanceApplied)}</span>
                      </Box>
                    )}
                    {canWaive && (
                      <Box sx={{ mt: 0.5 }}>
                        <FormControlLabel sx={{ m: 0 }}
                          control={<Checkbox size="small" checked={waive.on} onChange={(e) => setWaive((w) => ({ ...w, on: e.target.checked }))} />}
                          label={<span style={{ fontSize: 13 }}>Waive remaining on ticked rows{waiveTotal > 0 ? ` — ${inr(waiveTotal)}` : ''}</span>} />
                        {waive.on && <TextField fullWidth size="small" label="Write-off reason" value={waive.reason} onChange={(e) => setWaive((w) => ({ ...w, reason: e.target.value }))} sx={{ mt: 0.5 }} />}
                      </Box>
                    )}
                    {waiveTotal > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, color: FEE_COLORS.danger, fontSize: 13 }}>
                        <span>Write-off (waived)</span><span>− {inr(waiveTotal)}</span>
                      </Box>
                    )}
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, fontSize: 18 }}>
                      <b>Payable</b><b style={{ color: FEE_COLORS.primary }}>{inr(payable)}</b>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}><TextField fullWidth size="small" select label="Mode" value={pay.mode} onChange={(e) => setPay((p) => ({ ...p, mode: e.target.value }))}>{PAY_MODES.map((m) => <MenuItem key={m} value={m}>{PAYMENT_MODE_LABELS[m] || m}</MenuItem>)}</TextField></Grid>
                      <Grid item xs={6}><TextField fullWidth size="small" select label="Received from" value={pay.receivedFrom} onChange={(e) => setPay((p) => ({ ...p, receivedFrom: e.target.value }))}>{RECEIVED.map((m) => <MenuItem key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</MenuItem>)}</TextField></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" type="date" label="Receipt date" InputLabelProps={{ shrink: true }} value={pay.date} onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))} /></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" label="Remarks (optional)" value={pay.remarks} onChange={(e) => setPay((p) => ({ ...p, remarks: e.target.value }))} /></Grid>
                    </Grid>
                    <FormControlLabel sx={{ mt: 1 }} control={<Checkbox size="small" checked={pay.notify} onChange={(e) => setPay((p) => ({ ...p, notify: e.target.checked }))} />} label={<span style={{ fontSize: 13 }}>Send payment SMS/WhatsApp</span>} />
                    <Button fullWidth variant="contained" sx={{ mt: 2, py: 1.2 }} disabled={collecting || (selectedTotal <= 0 && waiveTotal <= 0)} onClick={collect}>
                      {collecting ? 'Collecting…' : payable > 0 ? `Collect ${inr(payable)} & print` : `Settle (waive ${inr(waiveTotal)}) & print`}
                    </Button>
                    <Typography sx={{ textAlign: 'center', mt: 1, fontSize: 11, color: FEE_COLORS.muted }}>Excess payment is stored as advance automatically.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      ) : (
        <Card sx={{ maxWidth: 720 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>Adhoc / General receipt</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Payer name (student or outsider)" value={adhoc.payerName} onChange={(e) => setAdhoc((s) => ({ ...s, payerName: e.target.value }))} /></Grid>
              <Grid item xs={6} sm={3}><TextField fullWidth size="small" select label="Mode" value={adhoc.mode} onChange={(e) => setAdhoc((s) => ({ ...s, mode: e.target.value }))}>{PAY_MODES.map((m) => <MenuItem key={m} value={m}>{PAYMENT_MODE_LABELS[m] || m}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={adhoc.date} onChange={(e) => setAdhoc((s) => ({ ...s, date: e.target.value }))} /></Grid>
            </Grid>
            <Typography sx={{ mt: 2, mb: 1, fontSize: 13, fontWeight: 600 }}>Lines</Typography>
            {adhoc.lines.map((l, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" label="Head / description" value={l.headLabel} onChange={(e) => setAdhoc((s) => ({ ...s, lines: s.lines.map((x, j) => j === i ? { ...x, headLabel: e.target.value } : x) }))} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Amount" value={l.amount} onChange={(e) => setAdhoc((s) => ({ ...s, lines: s.lines.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) }))} sx={{ width: 140 }} />
                <IconButton onClick={() => setAdhoc((s) => ({ ...s, lines: s.lines.filter((_, j) => j !== i) }))} disabled={adhoc.lines.length === 1}><DeleteIcon /></IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAdhoc((s) => ({ ...s, lines: [...s.lines, { headLabel: '', amount: '' }] }))}>Add line</Button>
            <TextField fullWidth size="small" label="Remarks (optional)" sx={{ mt: 2 }} value={adhoc.remarks} onChange={(e) => setAdhoc((s) => ({ ...s, remarks: e.target.value }))} />
            <Button variant="contained" sx={{ mt: 2 }} disabled={adhoc.saving} onClick={saveAdhoc}>{adhoc.saving ? 'Saving…' : 'Create adhoc receipt & print'}</Button>
          </CardContent>
        </Card>
      )}

      <CommandPalette pick open={pick} onClose={() => setPick(false)} onSelect={chooseStudent} />
    </Box>
  );
}

function Fact({ k, v, color }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: FEE_COLORS.muted, textTransform: 'uppercase', letterSpacing: '.03em' }}>{k}</Typography>
      <Typography sx={{ fontWeight: 600, color: color || 'inherit' }}>{v}</Typography>
    </Box>
  );
}
