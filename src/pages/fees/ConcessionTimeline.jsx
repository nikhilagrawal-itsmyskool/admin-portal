import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Divider,
} from '@mui/material';
import { SwapHoriz as ChangeIcon } from '@mui/icons-material';
import { feesService } from '../../services/feesService';
import { inr, errMsg, FEE_COLORS } from './feesUi';

const REASON_PRESETS = [
  'Staff member left', 'Sibling graduated / left', 'EWS status changed',
  'Correction of wrong concession', 'Other',
];

const stateChip = (s) => {
  if (s === 'advance') return <Chip size="small" color="secondary" variant="outlined" label="advance" />;
  if (s === 'due') return <Chip size="small" color="error" label="due" />;
  if (s === 'partial') return <Chip size="small" color="warning" label="part-paid" />;
  return <Chip size="small" color="success" variant="outlined" label="covered" />;
};

// Per-student concession timeline + the mid-year "Change concession" action (preview-then-apply).
export default function ConcessionTimeline({ studentId, academicYearId, canManage, studentName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [data, setData] = useState({ cycles: [], changes: [], currentSchemes: [] });
  const [cycles, setCycles] = useState([]);       // ordered {uuid,name,sortOrder}
  const [allSchemes, setAllSchemes] = useState([]); // grouped {name, concessionIds}
  const [dlg, setDlg] = useState(null);           // { closeName, toKey, fromCycleId, reason }
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!studentId || !academicYearId) return;
      setLoading(true); setError('');
      try {
        const [tl, cyc, cons] = await Promise.all([
          feesService.getConcessionTimeline(studentId, academicYearId),
          feesService.getCycles(academicYearId).catch(() => []),
          feesService.getConcessions(academicYearId).catch(() => []),
        ]);
        if (!alive) return;
        setData(tl || { cycles: [] });
        const ordered = (cyc || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setCycles(ordered);
        // group offered concessions by name (a scheme may span heads)
        const g = {};
        (cons || []).forEach((c) => { (g[c.name] ||= { name: c.name, concessionIds: [] }).concessionIds.push(c.uuid); });
        setAllSchemes(Object.values(g));
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load concession timeline')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [studentId, academicYearId, refresh]);

  const cycleName = useMemo(() => { const m = {}; cycles.forEach((c) => { m[c.uuid] = c.name; }); return m; }, [cycles]);
  // marker (by effective-from cycle name) → change note, to interleave in the table
  const markerByCycle = useMemo(() => {
    const m = {};
    (data.changes || []).forEach((ch) => { const nm = cycleName[ch.effectiveFromCycle]; if (nm) (m[nm] ||= []).push(ch); });
    return m;
  }, [data.changes, cycleName]);

  const openDlg = () => { setPreview(null); setDlg({ closeName: data.currentSchemes?.[0]?.name || '', toKey: '__stop__', fromCycleId: '', reason: '' }); };

  const doPreview = async () => {
    setError('');
    const closeScheme = (data.currentSchemes || []).find((s) => s.name === dlg.closeName);
    const openScheme = dlg.toKey === '__stop__' ? null : allSchemes.find((s) => s.name === dlg.toKey);
    try {
      setBusy(true);
      const p = await feesService.changeConcession({
        studentId, academicYearId, fromCycleId: dlg.fromCycleId, reason: dlg.reason.trim(),
        closeConcessionIds: closeScheme?.concessionIds || [],
        openConcessionIds: openScheme?.concessionIds || [],
        dryRun: true,
      });
      setPreview(p);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const doApply = async () => {
    const closeScheme = (data.currentSchemes || []).find((s) => s.name === dlg.closeName);
    const openScheme = dlg.toKey === '__stop__' ? null : allSchemes.find((s) => s.name === dlg.toKey);
    try {
      setBusy(true);
      const r = await feesService.changeConcession({
        studentId, academicYearId, fromCycleId: dlg.fromCycleId, reason: dlg.reason.trim(),
        closeConcessionIds: closeScheme?.concessionIds || [],
        openConcessionIds: openScheme?.concessionIds || [],
        dryRun: false,
      });
      setDlg(null); setPreview(null);
      const parts = [];
      if (r.totalDue) parts.push(`${inr(r.totalDue)} more due`);
      if (r.totalReduced) parts.push(`${inr(r.totalReduced)} less due`);
      if (r.totalAdvance) parts.push(`${inr(r.totalAdvance)} advance`);
      setOk(`${r.transition} from ${r.fromCycle} — ${parts.join(', ') || 'no change'}.`);
      setRefresh((k) => k + 1);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const canPreview = dlg && dlg.fromCycleId && dlg.reason.trim() && (dlg.closeName || dlg.toKey !== '__stop__');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setOk('')}>{ok}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {(data.currentSchemes || []).length === 0
            ? <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted }}>No active concession scheme.</Typography>
            : (data.currentSchemes || []).map((s) => (
              <Chip key={s.name} size="small" variant="outlined" label={`${s.name}${s.heads?.length ? ` · ${[...new Set(s.heads)].join(', ')}` : ''}`} />
            ))}
        </Box>
        {canManage && (
          <Button size="small" variant="outlined" startIcon={<ChangeIcon />} onClick={openDlg} disabled={(data.currentSchemes || []).length === 0 && allSchemes.length === 0}>
            Change concession
          </Button>
        )}
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Cycle</TableCell><TableCell>Scheme(s)</TableCell>
            <TableCell align="right">Fee</TableCell><TableCell align="right">Conc.</TableCell>
            <TableCell align="right">Net</TableCell><TableCell align="right">Paid</TableCell><TableCell>State</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {(data.cycles || []).length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No fee cycles charged this year.</TableCell></TableRow>
            )}
            {(data.cycles || []).map((c) => (
              <React.Fragment key={c.cycle}>
                {(markerByCycle[c.cycle] || []).map((ch, i) => (
                  <TableRow key={`m-${c.cycle}-${i}`}>
                    <TableCell colSpan={7} sx={{ bgcolor: 'action.hover', color: FEE_COLORS.warning, fontSize: 12, fontWeight: 600, py: 0.5 }}>
                      ▲ change · from {c.cycle} · &quot;{ch.changeReason}&quot;
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow hover>
                  <TableCell>{c.cycle}</TableCell>
                  <TableCell sx={{ color: c.schemes?.length ? 'inherit' : FEE_COLORS.muted, fontStyle: c.schemes?.length ? 'normal' : 'italic' }}>
                    {c.schemes?.length ? c.schemes.join(' + ') : '— none —'}
                  </TableCell>
                  <TableCell align="right">{inr(c.fee)}</TableCell>
                  <TableCell align="right">{c.concession ? '−' + inr(c.concession) : '0'}</TableCell>
                  <TableCell align="right">{inr(c.net)}</TableCell>
                  <TableCell align="right" sx={{ color: FEE_COLORS.success }}>{inr(c.paid)}</TableCell>
                  <TableCell>{stateChip(c.state)}</TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={!!dlg} onClose={() => !busy && setDlg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Change concession — {studentName || 'student'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted, mb: 1.5 }}>
            Stop or switch a scheme from a chosen fee cycle. Retroactive is allowed; paid cycles adjust too
            (removing a concession makes that amount recoverable). Nothing is saved until you apply.
          </Typography>
          {dlg && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField select size="small" label="Stop scheme" value={dlg.closeName}
                onChange={(e) => { setDlg({ ...dlg, closeName: e.target.value }); setPreview(null); }}
                helperText="the scheme being ended (leave blank if only starting a new one)">
                <MenuItem value="">— none —</MenuItem>
                {(data.currentSchemes || []).map((s) => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Change to" value={dlg.toKey}
                onChange={(e) => { setDlg({ ...dlg, toKey: e.target.value }); setPreview(null); }}>
                <MenuItem value="__stop__">Stop — no concession</MenuItem>
                {allSchemes.filter((s) => s.name !== dlg.closeName).map((s) => <MenuItem key={s.name} value={s.name}>Switch to {s.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Effective from cycle" value={dlg.fromCycleId}
                onChange={(e) => { setDlg({ ...dlg, fromCycleId: e.target.value }); setPreview(null); }}>
                {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Reason (required)" value={REASON_PRESETS.includes(dlg.reason) ? dlg.reason : (dlg.reason ? 'Other' : '')}
                onChange={(e) => setDlg({ ...dlg, reason: e.target.value === 'Other' ? '' : e.target.value })}>
                {REASON_PRESETS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Reason note" value={dlg.reason}
                onChange={(e) => setDlg({ ...dlg, reason: e.target.value })} placeholder="e.g. Staff member left in October"
                inputProps={{ maxLength: 200 }} />

              {preview && (
                <Box sx={{ border: `1px dashed ${FEE_COLORS.muted}`, borderRadius: 1, p: 1.5, mt: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: FEE_COLORS.muted, textTransform: 'uppercase', mb: 0.5 }}>
                    Preview — nothing saved yet
                  </Typography>
                  <Typography sx={{ fontSize: 13, mb: 0.5 }}>
                    <b>{preview.transition}</b> from <b>{preview.fromCycle}</b> · {preview.affectedCount} cycle(s) affected
                    {preview.paidAffected ? <span style={{ color: FEE_COLORS.danger }}> · {preview.paidAffected} already paid</span> : null}
                  </Typography>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {(preview.affectedCycles || []).filter((r) => r.dueDelta || r.advanceDelta).map((r, i) => {
                      const isAdv = !r.dueDelta && r.advanceDelta;
                      const label = r.dueDelta > 0 ? `+ ${inr(r.dueDelta)} due`
                        : r.dueDelta < 0 ? `− ${inr(-r.dueDelta)} due (discount)`
                        : `+ ${inr(r.advanceDelta)} advance`;
                      const color = r.dueDelta > 0 ? FEE_COLORS.danger : r.dueDelta < 0 ? FEE_COLORS.success : FEE_COLORS.primary;
                      return (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: FEE_COLORS.muted }}>{r.cycle}{r.wasPaid ? ' · paid' : ''}</span>
                          <span style={{ color, fontWeight: 600 }}>{label}</span>
                        </Box>
                      );
                    })}
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    Net:{' '}
                    {preview.totalDue ? <span style={{ color: FEE_COLORS.danger }}>{inr(preview.totalDue)} more due</span> : null}
                    {preview.totalReduced ? <span style={{ color: FEE_COLORS.success }}>{preview.totalDue ? ' · ' : ''}{inr(preview.totalReduced)} less due (discount)</span> : null}
                    {preview.totalAdvance ? <span style={{ color: FEE_COLORS.primary }}>{(preview.totalDue || preview.totalReduced) ? ' · ' : ''}{inr(preview.totalAdvance)} advance</span> : null}
                    {!preview.totalDue && !preview.totalReduced && !preview.totalAdvance ? '₹0 — no change' : null}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg(null)} disabled={busy}>Cancel</Button>
          {!preview
            ? <Button variant="contained" onClick={doPreview} disabled={!canPreview || busy}>{busy ? 'Previewing…' : 'Preview'}</Button>
            : <Button variant="contained" color="warning" onClick={doApply} disabled={busy}>{busy ? 'Applying…' : 'Apply change'}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
