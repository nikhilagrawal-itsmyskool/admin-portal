import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Switch, FormControlLabel, TextField, MenuItem,
  Button, Alert, Chip, Table, TableHead, TableBody, TableRow, TableCell, Divider, CircularProgress, Stack,
} from '@mui/material';
import { Bolt as BoltIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { errMsg, inr, FEE_COLORS } from './feesUi';

const NEVER = ['toa', 'full term'];
const norm = (s) => String(s || '').trim().toLowerCase();

export default function LateFeeSettings() {
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [ruleId, setRuleId] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ enabled: false, mode: 'perday', amount: 10, cap: 1010, effectiveFrom: '', minDuePct: '', minDueAmount: '', scope: [] });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    setLoading(true); setErr(''); setPreview(null);
    try {
      const [rules, cyc] = await Promise.all([feesService.getLateFeeRules(academicYearId), feesService.getCycles(academicYearId)]);
      setCycles(cyc || []);
      const fineableDefault = (cyc || []).map((c) => c.name).filter((nm) => !NEVER.includes(norm(nm)));
      const r = (rules || [])[0];
      if (r) {
        setRuleId(r.uuid);
        setForm({
          enabled: !!r.enabled, mode: r.mode || 'perday', amount: r.amount ?? 10, cap: r.cap ?? 1010,
          effectiveFrom: r.effectiveFrom ? String(r.effectiveFrom).slice(0, 10) : '',
          minDuePct: r.minDuePct ?? '', minDueAmount: r.minDueAmount ?? '',
          scope: r.cycleScope ? String(r.cycleScope).split(',').map((s) => s.trim()).filter(Boolean) : fineableDefault,
        });
      } else {
        setRuleId(null);
        setForm((f) => ({ ...f, scope: fineableDefault }));
      }
    } catch (e) { setErr(errMsg(e, 'Failed to load late-fee settings')); }
    finally { setLoading(false); }
  };

  const payload = () => ({
    academicYearId, mode: form.mode, amount: Number(form.amount) || 0,
    cap: form.cap === '' ? null : Number(form.cap),
    enabled: form.enabled,
    effectiveFrom: form.effectiveFrom || null,
    minDuePct: form.minDuePct === '' ? null : Number(form.minDuePct),
    minDueAmount: form.minDueAmount === '' ? null : Number(form.minDueAmount),
    cycleScope: form.scope.length ? form.scope.join(',') : null,
  });

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      if (ruleId) await feesService.updateLateFeeRule(ruleId, payload());
      else await feesService.createLateFeeRule(payload());
      setMsg('Saved.'); await load();
    } catch (e) { setErr(errMsg(e, 'Save failed')); }
    finally { setSaving(false); }
  };

  const doPreview = async () => {
    setPreviewing(true); setErr(''); setPreview(null);
    try { setPreview(await feesService.previewApplyFine({ academicYearId })); }
    catch (e) { setErr(errMsg(e, 'Preview failed')); }
    finally { setPreviewing(false); }
  };

  const runNow = async () => {
    if (!window.confirm('Run the Apply-Fine job now? This persists fines to the ledger.')) return;
    setSaving(true); setErr(''); setMsg('');
    try { const r = await feesService.runApplyFine({ academicYearId }); setMsg(`Done — created ${r.created}, grew ${r.grown}, total ${inr(r.total)}.`); }
    catch (e) { setErr(errMsg(e, 'Run failed')); }
    finally { setSaving(false); }
  };

  const toggleCycle = (nm) => setForm((f) => ({ ...f, scope: f.scope.includes(nm) ? f.scope.filter((x) => x !== nm) : [...f.scope, nm] }));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 0.5 }}>Late Fee</Typography>
      <Typography sx={{ color: FEE_COLORS.muted, mb: 2, fontSize: 13 }}>
        Auto-levies a per-day fine on overdue, unpaid cycles. Off until you enable it. The nightly job recomputes daily; fines freeze once a cycle is paid and are never touched after being exempted.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <FormControlLabel
            control={<Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />}
            label={<span style={{ fontWeight: 700 }}>{form.enabled ? 'Enabled — fines will be levied' : 'Disabled — no fines'}</span>}
          />
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField select label="Mode" size="small" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} sx={{ width: 150 }}>
              <MenuItem value="perday">Per day</MenuItem>
              <MenuItem value="flat">Flat</MenuItem>
            </TextField>
            <TextField label={form.mode === 'perday' ? 'Rate ₹/day' : 'Amount ₹'} size="small" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} sx={{ width: 140 }} />
            <TextField label="Cap ₹ (max)" size="small" type="number" value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} sx={{ width: 140 }} />
            <TextField label="Fine from (clock floor)" size="small" type="date" InputLabelProps={{ shrink: true }} value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} sx={{ width: 200 }} helperText="Days counted from max(due, this)" />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
            <TextField label="Skip if unpaid ≤ %" size="small" type="number" value={form.minDuePct} onChange={(e) => setForm({ ...form, minDuePct: e.target.value })} sx={{ width: 180 }} helperText="e.g. 10 = fine only if >10% of cycle unpaid" />
            <TextField label="Skip if unpaid ≤ ₹" size="small" type="number" value={form.minDueAmount} onChange={(e) => setForm({ ...form, minDueAmount: e.target.value })} sx={{ width: 180 }} helperText="optional ₹ floor" />
          </Stack>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2, mb: 1 }}>Fineable cycles <span style={{ color: FEE_COLORS.muted, fontWeight: 400 }}>(TOA & Full Term never fined)</span></Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {cycles.map((c) => {
              const never = NEVER.includes(norm(c.name));
              const on = form.scope.includes(c.name);
              return <Chip key={c.uuid} label={c.name} size="small" disabled={never}
                color={never ? 'default' : on ? 'primary' : 'default'} variant={on && !never ? 'filled' : 'outlined'}
                onClick={never ? undefined : () => toggleCycle(c.name)} />;
            })}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
            <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
            <Button startIcon={<PreviewIcon />} onClick={doPreview} disabled={previewing}>{previewing ? 'Previewing…' : 'Preview levy now'}</Button>
            <Button startIcon={<BoltIcon />} color="warning" onClick={runNow} disabled={saving || !form.enabled}>Run now</Button>
          </Box>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Preview — what a run right now would levy</Typography>
            {!preview.enabled ? (
              <Alert severity="info">{preview.message} (enable + save first to preview a live levy)</Alert>
            ) : (
              <>
                <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted, mb: 1 }}>
                  as-of {preview.asOf} · floor {preview.effectiveFrom || 'none'} · ₹{preview.rate}/day cap {preview.cap ? inr(preview.cap) : '—'} · skip ≤ {preview.minPct ?? '—'}% / {preview.minAmt != null ? inr(preview.minAmt) : '—'}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 1 }}>
                  {preview.created} new + {preview.grown} grown = {inr(preview.total)}
                  <span style={{ fontSize: 12, color: FEE_COLORS.muted, fontWeight: 400 }}>  · {preview.paidFrozen} paid/frozen · {preview.belowThreshold} below threshold · {preview.exemptedSkipped} exempted</span>
                </Typography>
                {preview.byCycle?.length > 0 && (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Cycle</TableCell><TableCell align="right">Fines</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
                      <TableBody>{preview.byCycle.map((r) => <TableRow key={r.cycle}><TableCell>{r.cycle}</TableCell><TableCell align="right">{r.count}</TableCell><TableCell align="right">{inr(r.amount)}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </Box>
                )}
                {preview.total === 0 && <Alert severity="success" sx={{ mt: 1 }}>Nothing to levy right now.</Alert>}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
