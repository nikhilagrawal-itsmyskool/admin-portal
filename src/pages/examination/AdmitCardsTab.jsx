import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Stack, Alert, CircularProgress, Button, TextField, MenuItem, Chip, Typography, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox, Tooltip, IconButton, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Print as PrintIcon, GppGood as OverrideIcon, Undo as RevokeIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { classService } from '../../services/classService';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';
import { buildAdmitCardsHtml } from './admitCardHtml';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AdmitCardsTab({ examId, exam, canManage }) {
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');
  const isMobile = useIsMobile();

  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [roster, setRoster] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [per, setPer] = useState(exam.cardsPerPage || 4);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [schoolSummary, setSchoolSummary] = useState(null); // { clear, blocked, printed, total } across all classes
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(null); // { count, studentIds } awaiting "did it print?" confirm

  useEffect(() => {
    classService.getClasses({ academicYearId: exam.academicYearId })
      .then(setSections).catch(() => setSections([]));
  }, [exam.academicYearId]);

  const loadRoster = useCallback(async (sid) => {
    if (!sid) { setRoster(null); return; }
    setLoading(true); setErr('');
    try {
      const r = await examinationService.roster(examId, sid);
      setRoster(r);
      // Default-select printable students that haven't been printed yet, so already-
      // printed cards aren't reselected. (Reprinting is a manual re-tick.)
      setSelected(new Set(r.students.filter((s) => s.printable && !s.printedOn).map((s) => s.studentId)));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the class roster');
    } finally { setLoading(false); }
  }, [examId]);

  useEffect(() => { loadRoster(sectionId); }, [sectionId, loadRoster]);
  // Re-gate the roster when the exam's dues settings change (edited in the header).
  useEffect(() => {
    if (sectionId) loadRoster(sectionId);
  }, [exam.duesCutoffDate, exam.duesThresholdCurrent, exam.duesThresholdPrior]); // eslint-disable-line react-hooks/exhaustive-deps

  // No class selected → tally clear/blocked across the WHOLE school by summing each class's
  // roster (throttled parallel). Recomputed when the dues gate changes. Same gate as a class.
  useEffect(() => {
    if (sectionId || !sections.length) { setSchoolSummary(null); return; }
    let alive = true;
    (async () => {
      setSummaryLoading(true); setSchoolSummary(null);
      const agg = { clear: 0, blocked: 0, printed: 0, total: 0 };
      const queue = [...sections];
      const worker = async () => {
        while (queue.length && alive) {
          const c = queue.shift();
          try {
            const r = await examinationService.roster(examId, c.uuid);
            const studs = r?.students || [];
            agg.total += studs.length;
            agg.clear += studs.filter((s) => s.printable).length;
            agg.blocked += studs.filter((s) => !s.printable).length;
            agg.printed += studs.filter((s) => s.printedOn).length;
          } catch { /* skip a class that fails to load */ }
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));
      if (alive) { setSchoolSummary(agg); setSummaryLoading(false); }
    })();
    return () => { alive = false; };
  }, [sectionId, sections, examId, exam.duesCutoffDate, exam.duesThresholdCurrent, exam.duesThresholdPrior]); // eslint-disable-line react-hooks/exhaustive-deps

  const printableSelected = useMemo(() => {
    if (!roster) return [];
    return roster.students.filter((s) => s.printable && selected.has(s.studentId));
  }, [roster, selected]);

  const pageCount = Math.ceil(printableSelected.length / per) || 0;

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    const all = roster.students.filter((s) => s.printable).map((s) => s.studentId);
    setSelected((s) => (all.every((id) => s.has(id)) ? new Set() : new Set(all)));
  };

  const override = async (studentId) => {
    const reason = window.prompt('Reason for allowing this dues-blocked student to print?');
    if (reason === null) return;
    try { await examinationService.createOverrides(examId, [studentId], reason); loadRoster(sectionId); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Override failed (god only)'); }
  };
  const revoke = async (studentId) => {
    try { await examinationService.revokeOverride(examId, studentId); loadRoster(sectionId); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Revoke failed (god only)'); }
  };

  // Fetch the admit-card data, render it into a hidden iframe (self-contained HTML with
  // logo/stamp/QR inlined), and print that — reliable across browsers. Logs the print.
  const startPrint = async () => {
    if (!printableSelected.length) return;
    setErr('');
    let data;
    try {
      data = await examinationService.admitCards(examId, sectionId, printableSelected.map((s) => s.studentId));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to prepare admit cards');
      return;
    }
    const count = data.cards.length;
    if (!count) { setErr('No printable cards in this selection.'); return; }

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    win.document.open();
    win.document.write(buildAdmitCardsHtml(data, per));
    win.document.close();

    // The browser can't tell us whether the user actually printed or hit Cancel
    // (afterprint fires either way), so after the dialog closes we ASK — and only mark
    // the cards "printed" (so they aren't reselected) if the user confirms.
    let done = false;
    const askConfirm = () => {
      if (done) return; done = true;
      setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* gone */ } }, 500);
      setPendingPrint({ count, studentIds: data.cards.map((c) => c.studentId) });
    };
    win.onafterprint = askConfirm;
    setTimeout(() => { win.focus(); win.print(); }, 350);
    setTimeout(askConfirm, 60000); // safety: some browsers never fire onafterprint
  };

  // "Yes, printed" → log + stamp printed; "Not printed" (cancelled) → do nothing.
  const confirmPrinted = async () => {
    const pp = pendingPrint;
    setPendingPrint(null);
    if (!pp) return;
    try {
      await examinationService.recordPrint(examId, sectionId, {
        cardsPerPage: per, studentCount: pp.count, pageCount: Math.ceil(pp.count / per), reason: 'normal',
        studentIds: pp.studentIds,
      });
      setToast(`Marked ${pp.count} admit card${pp.count === 1 ? '' : 's'} printed`);
      if (sectionId) loadRoster(sectionId);
    } catch { /* best effort */ }
  };

  const blocked = roster?.students.filter((s) => !s.printable) || [];
  const readyCount = roster?.students.filter((s) => s.printable).length || 0;
  const printedCount = roster?.students.filter((s) => s.printedOn).length || 0;

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {exam.status !== 'published' && (
        <Alert severity="info" sx={{ mb: 2 }}>This exam is a draft — publish it before distributing admit cards.</Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
        <TextField
          select size="small" label="Class" sx={{ minWidth: 200 }}
          value={sectionId} onChange={(e) => setSectionId(e.target.value)}
        >
          <MenuItem value=""><em>Select a class</em></MenuItem>
          {sections.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Cards per page" sx={{ minWidth: 130 }} value={per} onChange={(e) => setPer(Number(e.target.value))}>
          <MenuItem value={4}>4 per page</MenuItem>
          <MenuItem value={3}>3 per page</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        {canManage && (isMobile ? (
          <Chip size="small" variant="outlined" label="Print from desktop" />
        ) : (
          <Button
            variant="contained" startIcon={<PrintIcon />} onClick={startPrint}
            disabled={!printableSelected.length}
          >
            Print {printableSelected.length} card{printableSelected.length === 1 ? '' : 's'} · {pageCount} page{pageCount === 1 ? '' : 's'}
          </Button>
        ))}
      </Stack>

      {/* School-wide tally when no class is picked */}
      {!sectionId && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
          <Chip size="small" variant="outlined" label="All classes" />
          {summaryLoading ? (
            <>
              <CircularProgress size={15} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Tallying the whole school…</Typography>
            </>
          ) : schoolSummary ? (
            <>
              <Chip size="small" color="success" label={`${schoolSummary.clear} clear`} />
              {schoolSummary.blocked > 0 && <Chip size="small" color="error" label={`${schoolSummary.blocked} blocked by dues`} />}
              {schoolSummary.printed > 0 && <Chip size="small" variant="outlined" color="info" label={`${schoolSummary.printed} already printed`} />}
              <Chip size="small" variant="outlined" label={`${schoolSummary.total} students`} />
            </>
          ) : null}
        </Stack>
      )}

      {roster && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }} useFlexGap>
          <Chip size="small" color="success" label={`${readyCount} clear`} />
          {blocked.length > 0 && <Chip size="small" color="error" label={`${blocked.length} blocked by dues`} />}
          {printedCount > 0 && <Chip size="small" variant="outlined" color="info" label={`${printedCount} already printed`} />}
          <Chip size="small" variant="outlined" label={`Threshold — current ${rupee(roster.thresholds.current)} · prior ${rupee(roster.thresholds.prior)}`} />
        </Stack>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !roster ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>Select a class to see its admit-card roster.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table
          size="small"
          sx={{
            '& thead th': {
              bgcolor: 'action.hover', fontWeight: 700, fontSize: 11.5,
              textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary',
              borderBottom: 2, borderColor: 'divider',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={roster.students.some((s) => s.printable) && roster.students.filter((s) => s.printable).every((s) => selected.has(s.studentId))}
                  indeterminate={printableSelected.length > 0 && printableSelected.length < roster.students.filter((s) => s.printable).length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Admission</TableCell>
              <TableCell align="right">Current due</TableCell>
              <TableCell align="right">Prior due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Printed</TableCell>
              {isGod && <TableCell align="right">Override</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {roster.students.map((s) => (
              <TableRow key={s.studentId} hover>
                <TableCell padding="checkbox">
                  <Checkbox size="small" disabled={!s.printable} checked={selected.has(s.studentId)} onChange={() => toggle(s.studentId)} />
                </TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.admissionNumber || '—'}</TableCell>
                <TableCell align="right" style={{ color: s.currentDue > 0 ? '#b71c1c' : undefined }}>{rupee(s.currentDue)}</TableCell>
                <TableCell align="right" style={{ color: s.priorDue > 0 ? '#b71c1c' : undefined }}>{rupee(s.priorDue)}</TableCell>
                <TableCell>
                  {s.overridden ? <Chip size="small" color="warning" label="override" />
                    : s.blocked ? <Chip size="small" color="error" label="blocked" />
                      : <Chip size="small" color="success" label="clear" />}
                </TableCell>
                <TableCell>
                  {s.printedOn ? (
                    <Tooltip title={`Printed ${s.printCount || 1}×`}>
                      <Chip size="small" variant="outlined" color="info" label={fmtDate(s.printedOn)} />
                    </Tooltip>
                  ) : <span style={{ opacity: 0.4 }}>—</span>}
                </TableCell>
                {isGod && (
                  <TableCell align="right">
                    {s.overridden ? (
                      <Tooltip title="Revoke override"><IconButton size="small" onClick={() => revoke(s.studentId)}><RevokeIcon fontSize="small" /></IconButton></Tooltip>
                    ) : s.blocked ? (
                      <Tooltip title="Allow print despite dues"><IconButton size="small" color="warning" onClick={() => override(s.studentId)}><OverrideIcon fontSize="small" /></IconButton></Tooltip>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Paper>
      )}

      <Dialog open={!!pendingPrint} onClose={() => setPendingPrint(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Did the cards print?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Mark {pendingPrint?.count} admit card{pendingPrint?.count === 1 ? '' : 's'} as printed so they aren't selected again?
            Choose <b>Not printed</b> if you cancelled the print dialog.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingPrint(null)}>Not printed</Button>
          <Button variant="contained" onClick={confirmPrinted}>Yes, mark printed</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
