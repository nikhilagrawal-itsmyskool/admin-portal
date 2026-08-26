import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Stack, Alert, CircularProgress, Button, TextField, MenuItem, Chip, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox, Tooltip, IconButton, Snackbar,
} from '@mui/material';
import { Print as PrintIcon, Image as BrandingIcon, GppGood as OverrideIcon, Undo as RevokeIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/classService';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';
import AdmitCardPrintLayout from './AdmitCardPrintLayout';
import BrandingDialog from './BrandingDialog';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AdmitCardsTab({ examId, exam, canManage }) {
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');

  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [roster, setRoster] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [per, setPer] = useState(exam.cardsPerPage || 4);
  const [cycles, setCycles] = useState([]);
  const [cutoff, setCutoff] = useState(exam.duesCutoffDate || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [printData, setPrintData] = useState(null);
  const [brandingOpen, setBrandingOpen] = useState(false);

  useEffect(() => {
    classService.getClasses({ academicYearId: exam.academicYearId })
      .then(setSections).catch(() => setSections([]));
    examinationService.feeCycles(examId).then(setCycles).catch(() => setCycles([]));
  }, [exam.academicYearId, examId]);

  // Change the dues cutoff (which cycle's dues must be clear) → persist + re-gate roster.
  const changeCutoff = async (val) => {
    setCutoff(val); setErr('');
    try {
      await examinationService.update(examId, { duesCutoffDate: val || null });
      if (sectionId) loadRoster(sectionId);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to set the dues cutoff');
    }
  };

  const loadRoster = useCallback(async (sid) => {
    if (!sid) { setRoster(null); return; }
    setLoading(true); setErr('');
    try {
      const r = await examinationService.roster(examId, sid);
      setRoster(r);
      setSelected(new Set(r.students.filter((s) => s.printable).map((s) => s.studentId)));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the class roster');
    } finally { setLoading(false); }
  }, [examId]);

  useEffect(() => { loadRoster(sectionId); }, [sectionId, loadRoster]);

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

  const startPrint = async () => {
    if (!printableSelected.length) return;
    setErr('');
    try {
      const data = await examinationService.admitCards(examId, sectionId, printableSelected.map((s) => s.studentId));
      setPrintData(data);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to prepare admit cards');
    }
  };

  // Mount the print sheet, fire the browser print, then log the print & unmount.
  useEffect(() => {
    if (!printData) return;
    const count = printData.cards.length;
    const after = async () => {
      setPrintData(null);
      try {
        await examinationService.recordPrint(examId, sectionId, {
          cardsPerPage: per, studentCount: count, pageCount: Math.ceil(count / per), reason: 'normal',
        });
        setToast(`Printed ${count} admit card${count === 1 ? '' : 's'} · logged`);
      } catch { /* logging is best-effort */ }
    };
    window.addEventListener('afterprint', after, { once: true });
    const t = setTimeout(() => window.print(), 120);
    return () => { window.removeEventListener('afterprint', after); clearTimeout(t); };
  }, [printData]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocked = roster?.students.filter((s) => !s.printable) || [];

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
        {canManage && (
          <TextField
            select size="small" label="Dues cleared till" sx={{ minWidth: 200 }}
            value={cutoff} onChange={(e) => changeCutoff(e.target.value)}
            helperText="Which cycle's dues to check"
          >
            <MenuItem value=""><em>Due now (this month)</em></MenuItem>
            {cycles.filter((c) => c.dueDate).map((c) => (
              <MenuItem key={c.uuid} value={c.dueDate}>{c.name} · due {fmtDate(c.dueDate)}</MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<BrandingIcon />} onClick={() => setBrandingOpen(true)}>Branding</Button>
        {canManage && (
          <Button
            variant="contained" startIcon={<PrintIcon />} onClick={startPrint}
            disabled={!printableSelected.length}
          >
            Print {printableSelected.length} card{printableSelected.length === 1 ? '' : 's'} · {pageCount} page{pageCount === 1 ? '' : 's'}
          </Button>
        )}
      </Stack>

      {roster && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip size="small" label={`Threshold — current ${rupee(roster.thresholds.current)} · prior ${rupee(roster.thresholds.prior)}`} />
          {blocked.length > 0 && <Chip size="small" color="error" label={`${blocked.length} blocked by dues`} />}
        </Stack>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !roster ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>Select a class to see its admit-card roster.</Typography>
      ) : (
        <Table size="small">
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
              {isGod && <TableCell align="right">Override</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {roster.students.map((s) => (
              <TableRow key={s.studentId} sx={{ bgcolor: s.printable ? undefined : 'error.light' }}>
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
      )}

      <BrandingDialog open={brandingOpen} onClose={() => setBrandingOpen(false)} />
      {printData && <AdmitCardPrintLayout data={printData} cardsPerPage={per} />}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
