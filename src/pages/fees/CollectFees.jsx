import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, Divider,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem,
  Checkbox, FormControlLabel, CircularProgress, ToggleButtonGroup, ToggleButton, IconButton,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { PersonSearch as PersonSearchIcon, Add as AddIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import CommandPalette from '../../components/common/CommandPalette';
import StudentFeesPanel from '../student/StudentFeesPanel';
import { errMsg, inr, openReceipt, FEE_COLORS, PAYMENT_MODE_LABELS } from './feesUi';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const PAY_MODES = ['cash', 'online', 'card', 'cheque', 'draft', 'neft', 'ecs', 'bank-deposit', 'rte'];
const RECEIVED = ['father', 'mother', 'guardian', 'other'];
const TRANSPORT_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
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
  const [received, setReceived] = useState(''); // cash in hand — the anchor
  const [waive, setWaive] = useState({ on: false, reason: '' });
  const [exempt, setExempt] = useState({}); // chargeId -> { on, amount, reason } — per-fine late-fee exemption
  const [duesByYear, setDuesByYear] = useState([]); // outstanding in OTHER academic years
  const [storeAdvance, setStoreAdvance] = useState(false); // deliberately keep overpayment as advance
  const [showFullYear, setShowFullYear] = useState(false);
  const [show360, setShow360] = useState(false); // lazy expandable 360 on the student card

  // adhoc
  const [adhoc, setAdhoc] = useState({ payerName: '', mode: 'cash', date: today(), remarks: '', lines: [{ headLabel: '', amount: '' }], saving: false });
  // transport (interim: receipt-only, no dues)
  const [transport, setTransport] = useState({ amount: '', months: [], remark: '', mode: 'cash', date: today(), saving: false });
  const toggleMonth = (m) => setTransport((s) => ({ ...s, months: s.months.includes(m) ? s.months.filter((x) => x !== m) : [...s.months, m] }));

  const saveTransport = async () => {
    if (!student) { setError('Pick a student first.'); return; }
    const amount = Number(transport.amount);
    if (!(amount > 0)) { setError('Enter a transport amount.'); return; }
    setTransport((s) => ({ ...s, saving: true })); setError(''); setOk('');
    try {
      // months in financial-year order, joined — stored structured in cycle_set for later reconciliation
      const month = TRANSPORT_MONTHS.filter((m) => transport.months.includes(m)).join(',') || null;
      const receipt = await feesService.collectTransport({ studentId: student.uuid, academicYearId, amount, month, remark: transport.remark || null, paymentMode: transport.mode, receiptDate: transport.date });
      setOk(`Transport receipt ${receipt.receiptNo || ''} — ${inr(receipt.totalPaid)}.`);
      openReceipt(receipt.uuid);
      setTransport({ amount: '', months: [], remark: '', mode: 'cash', date: today(), saving: false });
    } catch (err) { setError(errMsg(err)); setTransport((s) => ({ ...s, saving: false })); }
  };

  const chooseStudent = async (s) => {
    setPick(false); setStudent(s); setLedger(null); setSummary(null); setSel({}); setError(''); setOk('');
    setWaive({ on: false, reason: '' }); setExempt({}); setStoreAdvance(false); setShow360(false); setReceived(''); // never carry across students
    feesService.getDuesByYear(s.uuid).then(setDuesByYear).catch(() => setDuesByYear([])); // cross-year "also owes" banner
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
      const dueNowTotal = due.filter((ln) => ln.due).reduce((sum, ln) => sum + Number(ln.remaining || 0), 0);
      setReceived(dueNowTotal > 0 ? String(Math.round(dueNowTotal * 100) / 100) : ''); // anchor cash to due-now
    } catch (err) { setError(errMsg(err, 'Failed to load the ledger')); }
    finally { setLoadingLedger(false); }
  };

  // pre-load a student passed via navigation (e.g. the Collect button on the student 360 panel)
  useEffect(() => {
    const pre = location.state?.student;
    if (pre?.uuid && student?.uuid !== pre.uuid) chooseStudent(pre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // reload the selected student's ledger when the academic year changes — otherwise it keeps showing
  // the previous year's (often empty) ledger and a clerk wrongly reads the student as "all clear".
  useEffect(() => {
    if (student?.uuid) chooseStudent(student);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId]);

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

  // balance gate: Amount received is the anchor. Collect enables only when the cash is fully
  // accounted for — received == allocated cash (payable) + any deliberately-stored advance.
  const receivedNum = Number(received) || 0;
  const overBy = r2(receivedNum - payable);          // >0 cash beyond allocations, <0 short of them
  const storeAdvanceAmt = storeAdvance && overBy > 0 ? overBy : 0;
  const balanced = Math.abs(receivedNum - payable - storeAdvanceAmt) < 0.5;
  const exemptList = Object.entries(exempt).filter(([, e]) => e?.on && Number(e.amount) > 0).map(([id, e]) => ({ id, amount: Number(e.amount), reason: e.reason || '' }));
  const exemptTotal = exemptList.reduce((s, e) => s + e.amount, 0);
  const otherYearDues = (duesByYear || []).filter((d) => d.academicYearId !== academicYearId && Number(d.balance) > 0);
  const somethingToDo = payable > 0 || waiveTotal > 0 || storeAdvanceAmt > 0 || exemptTotal > 0;
  const waiveNeedsReason = waiveTotal > 0 && !waive.reason.trim();
  const canCollect = balanced && somethingToDo && !waiveNeedsReason;

  const toggle = (id, checked) => setSel((p) => ({ ...p, [id]: { ...p[id], checked } }));
  const setAmt = (id, amount) => setSel((p) => ({ ...p, [id]: { ...p[id], amount } }));

  // ---- late-fee exemption (a waiver on a Late Fee Fine charge; distinct from a general write-off) ----
  const isFine = (ln) => /late\s*fee/i.test(ln.headLabel || '');
  const toggleExempt = (id, rem) => {
    setExempt((p) => {
      if (p[id]?.on) { const { [id]: _drop, ...rest } = p; return rest; }
      return { ...p, [id]: { on: true, amount: String(rem), reason: '' } };
    });
    setSel((p) => ({ ...p, [id]: { ...p[id], checked: false } })); // an exempted fine isn't being paid
  };
  const setExemptField = (id, k, v) => setExempt((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

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

  // restore defaults: due-now ticked at full, others cleared, received back to the due-now total
  const resetSelection = () => {
    const next = {};
    dueLines.forEach((ln) => { next[ln.chargeId] = { checked: !!ln.due, amount: String(ln.remaining) }; });
    setSel(next);
    const dueNowTotal = dueNowLines.reduce((s, ln) => s + Number(ln.remaining || 0), 0);
    setReceived(dueNowTotal > 0 ? String(r2(dueNowTotal)) : '');
    setWaive({ on: false, reason: '' }); setStoreAdvance(false);
  };

  const renderDueRow = (ln, upcoming) => {
    const e = sel[ln.chargeId] || {};
    const ex = exempt[ln.chargeId];
    const payNow = Number(e.amount) || 0;
    const rem = Number(ln.remaining) || 0;
    const cover = e.checked && payNow > 0 ? (payNow >= rem - 0.01 ? 'full' : 'partial') : null; // this payment's coverage of the row
    const fine = isFine(ln);
    const border = ex?.on ? FEE_COLORS.primary : cover === 'full' ? FEE_COLORS.success : cover === 'partial' ? FEE_COLORS.warning : 'transparent';
    return (
      <TableRow key={ln.chargeId} hover selected={!!e.checked}
        sx={{ ...(upcoming ? { opacity: 0.75 } : {}), borderLeft: `3px solid ${border}` }}>
        <TableCell padding="checkbox"><Checkbox size="small" checked={!!e.checked} disabled={ex?.on} onChange={(ev) => toggle(ln.chargeId, ev.target.checked)} /></TableCell>
        <TableCell>{ln.cycleLabel || '—'}</TableCell>
        <TableCell>
          {ln.headLabel}
          {cover === 'full' && <Chip size="small" color="success" variant="outlined" label="Full" sx={{ ml: 1, height: 18 }} />}
          {cover === 'partial' && <Chip size="small" color="warning" label={`Partial ${inr(payNow)}/${inr(rem)}`} sx={{ ml: 1, height: 18 }} />}
          {ln.status === 'partial' && <Chip size="small" color="warning" variant="outlined" label="Part-paid" sx={{ ml: 1, height: 18 }} />}
          {ln.category && ln.category !== 'fee' && <Chip size="small" variant="outlined" label={ln.category} sx={{ ml: 1, height: 18 }} />}
          {fine && <Chip size="small" clickable color={ex?.on ? 'info' : 'default'} variant={ex?.on ? 'filled' : 'outlined'}
            label={ex?.on ? 'Exempted' : 'Exempt'} onClick={() => toggleExempt(ln.chargeId, ln.remaining)} sx={{ ml: 1, height: 18 }} />}
        </TableCell>
        <TableCell align="right">{inr(ln.charged)}</TableCell>
        <TableCell align="right">{ln.concession ? '−' + inr(ln.concession) : '0'}</TableCell>
        <TableCell align="right">{inr(ln.paid)}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>{inr(ln.remaining)}</TableCell>
        <TableCell align="right" sx={{ p: 0.5 }}>
          {ex?.on ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
              <TextField size="small" variant="standard" type="number" value={ex.amount ?? ''} onChange={(evt) => setExemptField(ln.chargeId, 'amount', evt.target.value)}
                inputProps={{ style: { textAlign: 'right', width: 78 }, max: ln.remaining }} helperText="exempt ₹" FormHelperTextProps={{ sx: { m: 0, fontSize: 9, textAlign: 'right' } }} />
              <TextField size="small" variant="standard" placeholder="reason (optional)" value={ex.reason ?? ''} onChange={(evt) => setExemptField(ln.chargeId, 'reason', evt.target.value)}
                inputProps={{ style: { fontSize: 11, width: 110 } }} />
            </Box>
          ) : (
            <TextField size="small" variant="standard" type="number" disabled={!e.checked}
              value={e.amount ?? ''} onChange={(ev) => setAmt(ln.chargeId, ev.target.value)}
              inputProps={{ style: { textAlign: 'right', width: 78 }, max: ln.remaining }} />
          )}
        </TableCell>
      </TableRow>
    );
  };

  const collect = async () => {
    const allocations = dueLines
      .filter((ln) => sel[ln.chargeId]?.checked && Number(sel[ln.chargeId]?.amount) > 0)
      .map((ln) => ({ ledgerId: ln.chargeId, amount: Number(sel[ln.chargeId].amount) }));
    const genericWaivers = waive.on
      ? dueLines
          .filter((ln) => sel[ln.chargeId]?.checked)
          .map((ln) => ({ ledgerId: ln.chargeId, amount: r2(Number(ln.remaining) - (Number(sel[ln.chargeId]?.amount) || 0)) }))
          .filter((w) => w.amount > 0)
      : [];
    const fineWaivers = exemptList.map((e) => ({ ledgerId: e.id, amount: r2(e.amount), reason: e.reason.trim() || 'Fine exemption' }));
    const waivers = [...genericWaivers, ...fineWaivers];
    if (!allocations.length && !waivers.length) { setError('Tick at least one component to collect, exempt, or waive.'); return; }
    if (genericWaivers.length && !waive.reason.trim()) { setError('Enter a reason for the write-off.'); return; }
    setCollecting(true); setError(''); setOk('');
    try {
      const receipt = await feesService.collect({
        studentId: student.uuid, academicYearId, allocations,
        advanceApplied: useAdvance ? Math.min(advanceAvail, allocations.reduce((s, a) => s + a.amount, 0)) : 0,
        waivers, waiveReason: waive.reason.trim() || null, storeAsAdvance: storeAdvanceAmt || 0,
        paymentMode: pay.mode, receivedFrom: pay.receivedFrom, receiptDate: pay.date, remarks: pay.remarks || null,
      });
      setOk(`Receipt ${receipt.receiptNo || ''} — collected ${inr(receipt.totalPaid)}${receipt.waiverTotal ? `, waived ${inr(receipt.waiverTotal)}` : ''}${storeAdvanceAmt ? `, ${inr(storeAdvanceAmt)} to advance` : ''}.`);
      openReceipt(receipt.uuid);
      setWaive({ on: false, reason: '' }); setExempt({}); setStoreAdvance(false); setReceived('');
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
          <ToggleButton value="transport">Transport</ToggleButton>
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
            {student && (
              <Accordion expanded={show360} onChange={(_, v) => setShow360(v)} disableGutters elevation={0}
                sx={{ borderTop: `1px solid ${FEE_COLORS.border}`, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: FEE_COLORS.primary }}>View full ledger &amp; receipts</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, bgcolor: 'action.hover' }}>
                  {show360 && <StudentFeesPanel studentId={student.uuid} student={student} />}
                </AccordionDetails>
              </Accordion>
            )}
          </Card>

          {student && otherYearDues.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <b>Also owes in other years:</b>{' '}
              {otherYearDues.map((d) => `${d.yearName || d.academicYearId} — ${inr(d.balance)}`).join('  ·  ')}
              {'  '}· switch the academic-year selector to collect there.
            </Alert>
          )}

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
                      <TextField size="small" type="number" label="Amount received (cash in hand)" value={received} onChange={(e) => setReceived(e.target.value)} sx={{ flex: 1 }} />
                      <Button size="small" variant="outlined" onClick={autoAllocate} disabled={!(Number(received) > 0)} sx={{ whiteSpace: 'nowrap' }}>Split oldest-first</Button>
                      <Button size="small" onClick={resetSelection} sx={{ whiteSpace: 'nowrap' }}>Reset</Button>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, fontSize: 12, color: FEE_COLORS.muted }}>
                      <span>Due now {inr(summary?.dueNow || 0)}</span>
                      <span>Qtr {inr(summary?.dueQuarter || 0)}</span>
                      <span>Full yr {inr(summary?.outstanding || 0)}</span>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <span>Selected</span><b>{inr(selectedTotal)}</b>
                    </Box>
                    {exemptTotal > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, color: FEE_COLORS.primary }}>
                        <span>Fine exemptions ({exemptList.length})</span><b>− {inr(exemptTotal)}</b>
                      </Box>
                    )}
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
                        {waive.on && waiveTotal === 0 && (
                          <Typography sx={{ fontSize: 11.5, color: FEE_COLORS.muted, ml: 3.5, mt: -0.25 }}>Lower a “Pay now” below its due — the unpaid remainder on ticked rows gets written off.</Typography>
                        )}
                        {waive.on && <TextField fullWidth size="small" label="Write-off reason" value={waive.reason} onChange={(e) => setWaive((w) => ({ ...w, reason: e.target.value }))} sx={{ mt: 0.5 }} />}
                      </Box>
                    )}
                    {waiveTotal > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, color: FEE_COLORS.danger, fontSize: 13 }}>
                        <span>Write-off (waived)</span><span>− {inr(waiveTotal)}</span>
                      </Box>
                    )}
                    {overBy > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <FormControlLabel sx={{ m: 0 }}
                          control={<Checkbox size="small" color="warning" checked={storeAdvance} onChange={(e) => setStoreAdvance(e.target.checked)} />}
                          label={<span style={{ fontSize: 13, color: FEE_COLORS.warning }}>Store extra {inr(overBy)} as advance</span>} />
                      </Box>
                    )}
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, fontSize: 18 }}>
                      <b>Payable</b><b style={{ color: FEE_COLORS.primary }}>{inr(payable)}</b>
                    </Box>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 1.25, py: 0.75, borderRadius: 1, fontSize: 12.5, fontWeight: 600,
                      bgcolor: !somethingToDo ? 'action.hover' : balanced ? 'rgba(21,128,61,.10)' : overBy > 0 ? 'rgba(198,40,40,.10)' : 'rgba(180,83,9,.10)',
                      color: !somethingToDo ? FEE_COLORS.muted : balanced ? FEE_COLORS.success : overBy > 0 ? FEE_COLORS.danger : FEE_COLORS.warning,
                    }}>
                      {!somethingToDo ? 'Tick a row and enter the amount received'
                        : balanced ? '✓ Balanced — received matches what’s allocated'
                        : overBy > 0 ? `Over by ${inr(overBy)} — allocate more, waive, or tick “store as advance”`
                        : `Short by ${inr(Math.abs(overBy))} — reduce a “Pay now”, or waive the rest`}
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}><TextField fullWidth size="small" select label="Mode" value={pay.mode} onChange={(e) => setPay((p) => ({ ...p, mode: e.target.value }))}>{PAY_MODES.map((m) => <MenuItem key={m} value={m}>{PAYMENT_MODE_LABELS[m] || m}</MenuItem>)}</TextField></Grid>
                      <Grid item xs={6}><TextField fullWidth size="small" select label="Received from" value={pay.receivedFrom} onChange={(e) => setPay((p) => ({ ...p, receivedFrom: e.target.value }))}>{RECEIVED.map((m) => <MenuItem key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</MenuItem>)}</TextField></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" type="date" label="Receipt date" InputLabelProps={{ shrink: true }} value={pay.date} onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))} /></Grid>
                      <Grid item xs={12}><TextField fullWidth size="small" label="Remarks (optional)" value={pay.remarks} onChange={(e) => setPay((p) => ({ ...p, remarks: e.target.value }))} /></Grid>
                    </Grid>
                    <FormControlLabel sx={{ mt: 1 }} control={<Checkbox size="small" checked={pay.notify} onChange={(e) => setPay((p) => ({ ...p, notify: e.target.checked }))} />} label={<span style={{ fontSize: 13 }}>Send payment SMS/WhatsApp</span>} />
                    <Button fullWidth variant="contained" sx={{ mt: 2, py: 1.2 }} disabled={collecting || !canCollect} onClick={collect}>
                      {collecting ? 'Collecting…'
                        : !balanced ? 'Amount must match to collect'
                        : payable > 0 ? `Collect ${inr(receivedNum)} & print`
                        : `Settle (waive ${inr(waiveTotal)}) & print`}
                    </Button>
                    <Typography sx={{ textAlign: 'center', mt: 1, fontSize: 11, color: FEE_COLORS.muted }}>Collect enables only when the amount received is fully accounted for.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      ) : tab === 'adhoc' ? (
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
      ) : (
        <Card sx={{ maxWidth: 640 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Transport collection</Typography>
            <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: 12.5 }}>
              Transport is tracked separately — no dues yet (stops/distance not mapped). This records a per-student transport receipt, month-tagged so it reconciles once transport charges exist.
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
              {student
                ? <Chip label={`${student.name}${student.admissionNumber ? ' · ' + student.admissionNumber : ''}`} onDelete={() => setStudent(null)} />
                : <Button variant="outlined" startIcon={<PersonSearchIcon />} onClick={() => setPick(true)}>Find student</Button>}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}><TextField fullWidth size="small" type="number" label="Amount" value={transport.amount} onChange={(e) => setTransport((s) => ({ ...s, amount: e.target.value }))} /></Grid>
              <Grid item xs={6} sm={4}><TextField fullWidth size="small" select label="Mode" value={transport.mode} onChange={(e) => setTransport((s) => ({ ...s, mode: e.target.value }))}>{PAY_MODES.map((m) => <MenuItem key={m} value={m}>{PAYMENT_MODE_LABELS[m] || m}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={transport.date} onChange={(e) => setTransport((s) => ({ ...s, date: e.target.value }))} /></Grid>
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted, mb: 0.5 }}>Months (select the period this covers)</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {TRANSPORT_MONTHS.map((m) => (
                    <Chip key={m} label={m} size="small" clickable
                      color={transport.months.includes(m) ? 'primary' : 'default'}
                      variant={transport.months.includes(m) ? 'filled' : 'outlined'}
                      onClick={() => toggleMonth(m)} />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Remark (optional)" value={transport.remark} onChange={(e) => setTransport((s) => ({ ...s, remark: e.target.value }))} /></Grid>
            </Grid>
            <Button variant="contained" sx={{ mt: 2 }} disabled={transport.saving || !student || !(Number(transport.amount) > 0)} onClick={saveTransport}>
              {transport.saving ? 'Saving…' : 'Collect transport & print'}
            </Button>
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
