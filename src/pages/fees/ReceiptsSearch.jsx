import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Chip, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableFooter, TextField, InputAdornment,
  FormControlLabel, Switch, Link, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon, Clear as ClearIcon, ChevronLeft, ChevronRight, Print as PrintIcon,
  Cancel as CancelIcon, Download as DownloadIcon,
} from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { inr, errMsg, openReceipt, FEE_COLORS, PAYMENT_MODE_LABELS } from './feesUi';
import ReceiptPrintButton from './ReceiptPrintButton';
import { fmtDate, isoDate } from '../../utils/date';

const pad = (n) => String(n).padStart(2, '0');
const monthLabel = (ym) => { if (!ym) return ''; const [y, m] = ym.split('-'); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); };
const stepMonth = (ym, delta) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const monthRange = (ym) => { const [y, m] = ym.split('-').map(Number); return { from: `${ym}-01`, to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` }; };

export default function ReceiptsSearch() {
  const navigate = useNavigate();
  const { academicYearId, years: ayList } = useAcademicYear();
  const ayName = useMemo(() => { const o = {}; (ayList || []).forEach((y) => { o[y.uuid] = y.name; }); return o; }, [ayList]);

  const [search, setSearch] = useState('');
  const [dq, setDq] = useState(''); // debounced query
  const [month, setMonth] = useState(''); // '' = Recent; else 'YYYY-MM'
  const [allYears, setAllYears] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const searchRef = useRef(null);

  const searching = dq.trim().length > 0;

  useEffect(() => { const t = setTimeout(() => setDq(search), 300); return () => clearTimeout(t); }, [search]);

  // Ctrl/Cmd+K focuses the search box
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(() => {
    let alive = true;
    setRows(null); setError('');
    const inc = showCancelled ? 'true' : undefined;
    // Active search auto-spans all years (a receipt no / admission is year-agnostic).
    const params = searching
      ? { search: dq.trim(), includeCancelled: inc, limit: 500 }
      : { includeCancelled: inc, limit: 500, ...(allYears ? {} : { academicYearId }), ...(month ? monthRange(month) : {}) };
    feesService.getReceipts(params)
      .then((r) => { if (alive) setRows(r || []); })
      .catch((err) => { if (alive) { setRows([]); setError(errMsg(err, 'Failed to load receipts')); } });
    return () => { alive = false; };
  }, [searching, dq, allYears, academicYearId, month, showCancelled]);

  useEffect(() => load(), [load]);

  const crossYear = searching || allYears;
  const shown = rows || [];
  const totals = shown.reduce((a, r) => r.status === 'cancelled' ? a : { n: a.n + 1, sum: a.sum + Number(r.totalPaid || 0) }, { n: 0, sum: 0 });

  const doCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try { await feesService.cancelReceipt(cancelTarget.uuid, { reason: cancelReason || undefined }); setCancelTarget(null); setCancelReason(''); load(); }
    catch (err) { setError(errMsg(err, 'Cancel failed')); }
    finally { setCancelBusy(false); }
  };

  const exportCsv = () => {
    const head = ['Receipt', 'Date', 'Year', 'Student', 'Admission', 'Class', 'Type', 'Mode', 'Amount', 'Status'];
    const lines = shown.map((r) => [r.receiptNo || r.legacyReceiptNo || '', isoDate(r.receiptDate), ayName[r.academicYearId] || '', r.payerName || '', r.admissionNoSnapshot || '', r.payerClassSnapshot || '', r.type || 'fee', PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '', Math.round(r.totalPaid || 0), r.status || '']);
    const csv = [head, ...lines].map((a) => a.map((v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const scopeLabel = searching ? 'all years (search)' : allYears ? 'all years' : (ayName[academicYearId] || 'selected year');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Receipts</Typography>
        <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>
          {searching ? 'Search across all years.' : month ? `${monthLabel(month)} · ${scopeLabel}.` : `Recent receipts · ${scopeLabel}.`} Press <b>Ctrl/⌘ + K</b> to search.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${FEE_COLORS.border}` }}>
          <TextField
            size="small" inputRef={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt no, student, admission…" sx={{ minWidth: 300, flex: '1 1 300px' }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
          {/* Month stepper — disabled while searching (search spans all years) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: searching ? 0.4 : 1 }}>
            <Tooltip title="Previous month"><span><IconButton size="small" disabled={searching} onClick={() => setMonth((m) => stepMonth(m || thisMonth(), -1))}><ChevronLeft /></IconButton></span></Tooltip>
            <Chip
              label={month ? monthLabel(month) : 'Recent'} size="small"
              variant={month ? 'filled' : 'outlined'} color={month ? 'primary' : 'default'}
              onClick={() => !searching && setMonth((m) => (m ? '' : thisMonth()))}
              onDelete={month ? () => setMonth('') : undefined}
              sx={{ minWidth: 90, cursor: searching ? 'default' : 'pointer' }}
            />
            <Tooltip title="Next month"><span><IconButton size="small" disabled={searching || !month} onClick={() => setMonth((m) => stepMonth(m, 1))}><ChevronRight /></IconButton></span></Tooltip>
          </Box>
          <FormControlLabel control={<Switch size="small" checked={allYears} disabled={searching} onChange={(e) => setAllYears(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>All years</span>} />
          <FormControlLabel control={<Switch size="small" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>Show cancelled</span>} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!shown.length}>CSV</Button>
        </CardContent>

        {rows === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Receipt</TableCell><TableCell>Date</TableCell>{crossYear && <TableCell>Year</TableCell>}
                  <TableCell>Student</TableCell><TableCell>Class</TableCell><TableCell>Type</TableCell>
                  <TableCell>Mode</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.length === 0 && <TableRow><TableCell colSpan={crossYear ? 9 : 8} align="center" sx={{ color: FEE_COLORS.muted, py: 4 }}>No receipts match.</TableCell></TableRow>}
                {shown.map((r) => {
                  const cancelled = r.status === 'cancelled';
                  return (
                    <TableRow key={r.uuid} hover sx={cancelled ? { opacity: 0.6 } : undefined}>
                      <TableCell sx={cancelled ? { textDecoration: 'line-through' } : undefined}>
                        {r.receiptNo || r.legacyReceiptNo || '—'}
                        {cancelled && <Chip size="small" color="error" label={r.cancelReason ? `cancelled · ${r.cancelReason}` : 'cancelled'} sx={{ ml: 1, height: 18, textDecoration: 'none' }} />}
                      </TableCell>
                      <TableCell>{r.receiptDate ? fmtDate(r.receiptDate) : '—'}</TableCell>
                      {crossYear && <TableCell>{ayName[r.academicYearId] || '—'}</TableCell>}
                      <TableCell>
                        {r.studentId
                          ? <Link component="button" underline="hover" onClick={() => navigate(`/students/${r.studentId}`)} sx={{ textAlign: 'left' }}>{r.payerName || '—'}</Link>
                          : (r.payerName || '—')}
                        {r.admissionNoSnapshot && <Box component="span" sx={{ color: FEE_COLORS.muted, fontSize: 12, ml: 0.5 }}>· {r.admissionNoSnapshot}</Box>}
                      </TableCell>
                      <TableCell>{r.payerClassSnapshot || '—'}</TableCell>
                      <TableCell>{r.type || 'fee'}</TableCell>
                      <TableCell>{PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, ...(cancelled ? { textDecoration: 'line-through', color: FEE_COLORS.muted } : {}) }}>{inr(r.totalPaid)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <ReceiptPrintButton receiptId={r.uuid} variant="icon" />
                        {!cancelled && <Tooltip title="Cancel receipt"><IconButton size="small" color="error" onClick={() => { setCancelTarget(r); setCancelReason(''); }}><CancelIcon fontSize="small" /></IconButton></Tooltip>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {shown.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={crossYear ? 7 : 6} sx={{ fontWeight: 700, color: 'text.primary' }}>{totals.n} active receipt{totals.n === 1 ? '' : 's'}{shown.length !== totals.n ? ` (+${shown.length - totals.n} cancelled)` : ''}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15 }}>{inr(totals.sum)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Box>
        )}
      </Card>

      <Dialog open={!!cancelTarget} onClose={() => !cancelBusy && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel receipt {cancelTarget?.receiptNo || cancelTarget?.legacyReceiptNo}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted, mb: 2 }}>
            This reverses the receipt's ledger effect ({inr(cancelTarget?.totalPaid)}) and marks it cancelled. This cannot be undone from here.
          </Typography>
          <TextField autoFocus fullWidth size="small" label="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelBusy}>Keep</Button>
          <Button color="error" variant="contained" onClick={doCancel} disabled={cancelBusy} startIcon={cancelBusy ? <CircularProgress size={16} /> : <CancelIcon />}>Cancel receipt</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
