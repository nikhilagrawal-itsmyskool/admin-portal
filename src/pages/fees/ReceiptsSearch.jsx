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
import { fmtDate, isoDate, todayIso } from '../../utils/date';
import { useIsMobile } from '../../hooks/useIsMobile';
import ReceiptDetailSheet from './ReceiptDetailSheet';

const DAY_MS = 24 * 60 * 60 * 1000;
// day stepper: browse receipts one day at a time (default today, walk backwards)
const stepDay = (iso, delta) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + delta * DAY_MS).toISOString().slice(0, 10);

// Memoized results list. Isolated so typing in the search box (which re-renders the parent on
// every keystroke) does NOT re-render up to 500 rows — it only re-renders when `rows` actually
// change. Handlers are passed pre-stabilised (useCallback) by the parent.
const ReceiptResults = React.memo(function ReceiptResults({ rows, isMobile, crossYear, ayName, onOpenDetail, onCancelClick, onStudent }) {
  const totals = rows.reduce((a, r) => r.status === 'cancelled' ? a : { n: a.n + 1, sum: a.sum + Number(r.totalPaid || 0) }, { n: 0, sum: 0 });

  if (isMobile) {
    return (
      <Box sx={{ p: 1.5 }}>
        {rows.length === 0 && <Typography sx={{ color: FEE_COLORS.muted, py: 4, textAlign: 'center' }}>No receipts match.</Typography>}
        {rows.map((r) => {
          const cancelled = r.status === 'cancelled';
          return (
            <Box key={r.uuid} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider', opacity: cancelled ? 0.6 : 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, cursor: 'pointer' }} onClick={() => onOpenDetail(r.uuid)}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, ...(cancelled ? { textDecoration: 'line-through' } : {}) }} noWrap>{r.receiptNo || r.legacyReceiptNo || '—'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {r.receiptDate ? fmtDate(r.receiptDate) : '—'}{crossYear ? ` · ${ayName[r.academicYearId] || ''}` : ''} · {r.type || 'fee'} · {PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }} noWrap>
                    {r.payerName || '—'}{r.payerClassSnapshot ? ` · ${r.payerClassSnapshot}` : ''}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap', ...(cancelled ? { textDecoration: 'line-through', color: FEE_COLORS.muted } : {}) }}>{inr(r.totalPaid)}</Typography>
              </Box>
              {cancelled && <Chip size="small" color="error" label={r.cancelReason ? `cancelled · ${r.cancelReason}` : 'cancelled'} sx={{ mt: 0.5, height: 18 }} />}
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
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
          {rows.length === 0 && <TableRow><TableCell colSpan={crossYear ? 9 : 8} align="center" sx={{ color: FEE_COLORS.muted, py: 4 }}>No receipts match.</TableCell></TableRow>}
          {rows.map((r) => {
            const cancelled = r.status === 'cancelled';
            return (
              <TableRow key={r.uuid} hover sx={cancelled ? { opacity: 0.6 } : undefined}>
                <TableCell sx={cancelled ? { textDecoration: 'line-through' } : undefined}>
                  <Link component="button" underline="hover" onClick={() => onOpenDetail(r.uuid)} sx={{ fontWeight: 600, textAlign: 'left' }}>{r.receiptNo || r.legacyReceiptNo || '—'}</Link>
                  {cancelled && <Chip size="small" color="error" label={r.cancelReason ? `cancelled · ${r.cancelReason}` : 'cancelled'} sx={{ ml: 1, height: 18, textDecoration: 'none' }} />}
                </TableCell>
                <TableCell>{r.receiptDate ? fmtDate(r.receiptDate) : '—'}</TableCell>
                {crossYear && <TableCell>{ayName[r.academicYearId] || '—'}</TableCell>}
                <TableCell>
                  {r.studentId
                    ? <Link component="button" underline="hover" onClick={() => onStudent(r.studentId)} sx={{ textAlign: 'left' }}>{r.payerName || '—'}</Link>
                    : (r.payerName || '—')}
                  {r.admissionNoSnapshot && <Box component="span" sx={{ color: FEE_COLORS.muted, fontSize: 12, ml: 0.5 }}>· {r.admissionNoSnapshot}</Box>}
                </TableCell>
                <TableCell>{r.payerClassSnapshot || '—'}</TableCell>
                <TableCell>{r.type || 'fee'}</TableCell>
                <TableCell>{PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, ...(cancelled ? { textDecoration: 'line-through', color: FEE_COLORS.muted } : {}) }}>{inr(r.totalPaid)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <ReceiptPrintButton receiptId={r.uuid} variant="icon" />
                  {!cancelled && <Tooltip title="Cancel receipt"><IconButton size="small" color="error" onClick={() => onCancelClick(r)}><CancelIcon fontSize="small" /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={crossYear ? 7 : 6} sx={{ fontWeight: 700, color: 'text.primary' }}>{totals.n} active receipt{totals.n === 1 ? '' : 's'}{rows.length !== totals.n ? ` (+${rows.length - totals.n} cancelled)` : ''}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15 }}>{inr(totals.sum)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Box>
  );
});

export default function ReceiptsSearch() {
  const navigate = useNavigate();
  const isMobile = useIsMobile(); // PWA: Print stays, Cancel hidden
  const { academicYearId, years: ayList } = useAcademicYear();
  const ayName = useMemo(() => { const o = {}; (ayList || []).forEach((y) => { o[y.uuid] = y.name; }); return o; }, [ayList]);

  const [search, setSearch] = useState('');
  const [dq, setDq] = useState(''); // debounced query
  const [day, setDay] = useState(todayIso()); // default today; step back a day at a time
  const [detailId, setDetailId] = useState(null); // tap a receipt to view its breakdown in-app
  const [allYears, setAllYears] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(''); // type-to-confirm speed-bump
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
      : { includeCancelled: inc, limit: 500, ...(allYears ? {} : { academicYearId }), from: day, to: day };
    feesService.getReceipts(params)
      .then((r) => { if (alive) setRows(r || []); })
      .catch((err) => { if (alive) { setRows([]); setError(errMsg(err, 'Failed to load receipts')); } });
    return () => { alive = false; };
  }, [searching, dq, allYears, academicYearId, day, showCancelled]);

  useEffect(() => load(), [load]);

  const crossYear = searching || allYears;
  const shown = rows || [];
  const today = todayIso();
  // stable handlers so the memoized results list doesn't re-render on each keystroke
  const openDetail = useCallback((id) => setDetailId(id), []);
  const onCancelClick = useCallback((r) => { setCancelTarget(r); setCancelReason(''); setCancelConfirm(''); }, []);
  const onStudent = useCallback((sid) => navigate(`/students/${sid}`), [navigate]);

  const doCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try { await feesService.cancelReceipt(cancelTarget.uuid, { reason: cancelReason.trim() || undefined }); setCancelTarget(null); setCancelReason(''); setCancelConfirm(''); load(); }
    catch (err) { setError(errMsg(err, 'Cancel failed')); }
    finally { setCancelBusy(false); }
  };

  const exportCsv = () => {
    const head = ['Receipt', 'Date', 'Year', 'Student', 'Admission', 'Class', 'Type', 'Mode', 'Amount', 'Status'];
    const lines = shown.map((r) => [r.receiptNo || r.legacyReceiptNo || '', isoDate(r.receiptDate), ayName[r.academicYearId] || '', r.payerName || '', r.admissionNoSnapshot || '', r.payerClassSnapshot || '', r.type || 'fee', PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '', Math.round(r.totalPaid || 0), r.status || '']);
    const csv = [head, ...lines].map((a) => a.map((v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `receipts-${todayIso()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const scopeLabel = searching ? 'all years (search)' : allYears ? 'all years' : (ayName[academicYearId] || 'selected year');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Receipts</Typography>
        <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>
          {searching ? 'Search across all years.' : `${day === today ? 'Today' : fmtDate(day)} · ${scopeLabel}.`} Press <b>Ctrl/⌘ + K</b> to search.
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
          {/* Day stepper — default today, walk back a day at a time. Disabled while searching (search spans all). */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: searching ? 0.4 : 1 }}>
            <Tooltip title="Previous day"><span><IconButton size="small" disabled={searching} onClick={() => setDay((d) => stepDay(d, -1))}><ChevronLeft /></IconButton></span></Tooltip>
            <Chip
              label={day === today ? 'Today' : fmtDate(day)} size="small"
              variant={day === today ? 'outlined' : 'filled'} color={day === today ? 'default' : 'primary'}
              onClick={() => !searching && setDay(today)}
              onDelete={day === today ? undefined : () => setDay(today)}
              sx={{ minWidth: 96, cursor: searching ? 'default' : 'pointer' }}
            />
            <Tooltip title="Next day"><span><IconButton size="small" disabled={searching || day >= today} onClick={() => setDay((d) => stepDay(d, 1))}><ChevronRight /></IconButton></span></Tooltip>
          </Box>
          <FormControlLabel control={<Switch size="small" checked={allYears} disabled={searching} onChange={(e) => setAllYears(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>All years</span>} />
          <FormControlLabel control={<Switch size="small" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>Show cancelled</span>} />
          <Box sx={{ flex: 1 }} />
          {!isMobile && <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!shown.length}>CSV</Button>}
        </CardContent>

        {rows === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <ReceiptResults
            rows={shown} isMobile={isMobile} crossYear={crossYear} ayName={ayName}
            onOpenDetail={openDetail} onCancelClick={onCancelClick} onStudent={onStudent}
          />
        )}
      </Card>

      <Dialog open={!!cancelTarget} onClose={() => !cancelBusy && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel receipt {cancelTarget?.receiptNo || cancelTarget?.legacyReceiptNo}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted, mb: 2 }}>
            This reverses the receipt's ledger effect ({inr(cancelTarget?.totalPaid)}) and marks it cancelled. This cannot be undone from here.
          </Typography>
          <TextField autoFocus fullWidth size="small" label="Reason (required)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} sx={{ mb: 1.5 }} />
          <TextField fullWidth size="small" label={'Type "confirm" to cancel this receipt'} value={cancelConfirm} onChange={(e) => setCancelConfirm(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelBusy}>Keep</Button>
          <Button color="error" variant="contained" onClick={doCancel} disabled={cancelBusy || !cancelReason.trim() || cancelConfirm.trim().toLowerCase() !== 'confirm'} startIcon={cancelBusy ? <CircularProgress size={16} /> : <CancelIcon />}>Cancel receipt</Button>
        </DialogActions>
      </Dialog>

      <ReceiptDetailSheet receiptId={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
    </Box>
  );
}
