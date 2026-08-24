import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
  Box, Typography, Divider, CircularProgress, Alert,
} from '@mui/material';
import { feesService } from '../../services/feesService';
import { inr, errMsg, FEE_COLORS } from './feesUi';

// Reason quick-picks, contextual to the change direction (stop / start / switch). Purely a
// convenience — the free-text note still allows anything. "Correction…" and "Other" appear in all.
const REASONS = {
  stop: ['Staff member left', 'Sibling left / graduated', 'Sibling discount reassigned to another child',
         'EWS status revoked / expired', 'Scholarship ended / not renewed',
         'Concession withdrawn (management decision)', 'Correction of wrong concession', 'Other'],
  start: ['Staff member joined', 'New sibling admitted', 'Sibling discount reassigned to another child',
          'EWS status granted', 'RTE status change', 'Scholarship / merit awarded',
          'Management-approved concession', 'Financial hardship / relief',
          'Correction of wrong concession', 'Other'],
  switch: ['Sibling discount reassigned to another child', 'Switched to a different concession scheme',
           'Management-approved concession', 'Financial hardship / relief',
           'Correction of wrong concession', 'Other'],
};

// Reusable mid-year "Change concession" dialog (preview-then-apply). Self-contained: on open it
// loads the student's current schemes + the year's cycles/schemes. Used from the Student-360
// Concession tab and from the /fees/concessions roster (with the viewed scheme pre-selected to stop).
export default function ChangeConcessionDialog({ open, studentId, studentName, academicYearId, presetCloseName, onClose, onApplied }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSchemes, setCurrentSchemes] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [allSchemes, setAllSchemes] = useState([]);
  const [form, setForm] = useState(null); // { closeName, toKey, fromCycleId, reason }
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !studentId || !academicYearId) return;
    let alive = true;
    (async () => {
      setLoading(true); setError(''); setPreview(null);
      try {
        const [tl, cyc, cons] = await Promise.all([
          feesService.getConcessionTimeline(studentId, academicYearId),
          feesService.getCycles(academicYearId).catch(() => []),
          feesService.getConcessions(academicYearId).catch(() => []),
        ]);
        if (!alive) return;
        const cs = tl?.currentSchemes || [];
        setCurrentSchemes(cs);
        setCycles((cyc || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        const g = {};
        (cons || []).forEach((c) => { (g[c.name] ||= { name: c.name, concessionIds: [] }).concessionIds.push(c.uuid); });
        setAllSchemes(Object.values(g));
        const preClose = (presetCloseName && cs.some((s) => s.name === presetCloseName)) ? presetCloseName : (cs[0]?.name || '');
        setForm({ closeName: preClose, toKey: '__stop__', fromCycleId: '', reason: '' });
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load concession data')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [open, studentId, academicYearId, presetCloseName]);

  const closeScheme = currentSchemes.find((s) => s.name === form?.closeName);
  const openScheme = form?.toKey === '__stop__' ? null : allSchemes.find((s) => s.name === form?.toKey);
  const canPreview = form && form.fromCycleId && form.reason.trim() && (form.closeName || form.toKey !== '__stop__');
  // reason quick-picks contextual to the change direction
  const hasClose = !!form?.closeName;
  const hasOpen = form?.toKey && form.toKey !== '__stop__';
  const presets = REASONS[hasClose && !hasOpen ? 'stop' : (!hasClose && hasOpen ? 'start' : 'switch')];

  const payload = (dryRun) => ({
    studentId, academicYearId, fromCycleId: form.fromCycleId, reason: form.reason.trim(),
    closeConcessionIds: closeScheme?.concessionIds || [], openConcessionIds: openScheme?.concessionIds || [], dryRun,
  });

  const doPreview = async () => {
    setError('');
    try { setBusy(true); setPreview(await feesService.changeConcession(payload(true))); }
    catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const doApply = async () => {
    try { setBusy(true); const r = await feesService.changeConcession(payload(false)); onApplied?.(r); onClose?.(); }
    catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose?.()} maxWidth="sm" fullWidth>
      <DialogTitle>Change concession — {studentName || 'student'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
        {loading || !form ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        ) : (
          <>
            <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted, mb: 1.5 }}>
              Stop or switch a scheme from a chosen fee cycle. Retroactive is allowed; paid cycles adjust too
              (removing a concession makes that amount recoverable). Nothing is saved until you apply.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField select size="small" label="Stop scheme" value={form.closeName}
                onChange={(e) => { setForm({ ...form, closeName: e.target.value }); setPreview(null); }}
                helperText="the scheme being ended (leave blank if only starting a new one)">
                <MenuItem value="">— none —</MenuItem>
                {currentSchemes.map((s) => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Change to" value={form.toKey}
                onChange={(e) => { setForm({ ...form, toKey: e.target.value }); setPreview(null); }}>
                <MenuItem value="__stop__">Stop — no concession</MenuItem>
                {allSchemes.filter((s) => s.name !== form.closeName).map((s) => <MenuItem key={s.name} value={s.name}>Switch to {s.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Effective from cycle" value={form.fromCycleId}
                onChange={(e) => { setForm({ ...form, fromCycleId: e.target.value }); setPreview(null); }}>
                {cycles.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Reason (required)" value={presets.includes(form.reason) ? form.reason : (form.reason ? 'Other' : '')}
                onChange={(e) => setForm({ ...form, reason: e.target.value === 'Other' ? '' : e.target.value })}>
                {presets.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Reason note" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Staff member left in October"
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
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose?.()} disabled={busy}>Cancel</Button>
        {!preview
          ? <Button variant="contained" onClick={doPreview} disabled={!canPreview || busy}>{busy ? 'Previewing…' : 'Preview'}</Button>
          : <Button variant="contained" color="warning" onClick={doApply} disabled={busy}>{busy ? 'Applying…' : 'Apply change'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
