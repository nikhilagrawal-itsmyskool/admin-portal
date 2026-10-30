import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Stack,
  Switch, FormControlLabel, RadioGroup, Radio, FormControl, FormLabel, Divider, TextField, Grid,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { transferService } from '../../services/transferService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const GATE_MODES = [
  { value: 'block', label: 'Block (default)', help: 'Issuing a TC is blocked while the student has outstanding fees. A super-admin can override per-TC.' },
  { value: 'warn', label: 'Warn but allow', help: 'Shows the outstanding amount as a warning but lets anyone with TC-manage issue anyway.' },
  { value: 'off', label: 'Off', help: 'Never check dues when issuing a TC.' },
];

const csv = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');
const parseCsv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

// God-only by default (transfer.config.manage). Per-school Transfer Certificate defaults:
// dropdown option sets, default field values, register book no + number formats, dues gate.
export default function TransferConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.TRANSFER_CONFIG_MANAGE);

  const [c, setC] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const dirty = c && JSON.stringify(c) !== baseline;

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    (async () => {
      try {
        const cfg = await transferService.getConfig();
        setC(cfg);
        setBaseline(JSON.stringify(cfg));
      } catch (e) {
        setErr(e.response?.data?.error?.description || 'Failed to load config');
      } finally { setLoading(false); }
    })();
  }, [canManage]);

  const set = (k) => (e) => { setC((p) => ({ ...p, [k]: e.target.value })); setMsg(''); };

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const saved = await transferService.updateConfig({
        ...c,
        resultOptions: Array.isArray(c.resultOptions) ? c.resultOptions : parseCsv(c.resultOptions),
        conductOptions: Array.isArray(c.conductOptions) ? c.conductOptions : parseCsv(c.conductOptions),
      });
      setC(saved);
      setBaseline(JSON.stringify(saved));
      setMsg('Transfer Certificate config saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save config');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!canManage) {
    return (
      <Box sx={{ maxWidth: 640 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Transfer Certificate Config</Typography>
        <Alert severity="warning">You don't have permission to manage TC config. This is restricted to the super-admin (god) by default.</Alert>
      </Box>
    );
  }
  if (!c) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 820 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Transfer Certificate Config</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Per-school defaults and dropdown choices for the Transfer Certificate. The school header
        and CBSE Reg No. are edited on the Branding page.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <FormControl>
            <FormLabel sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>No-dues gate on issue</FormLabel>
            <RadioGroup value={c.duesGateMode || 'block'} onChange={set('duesGateMode')}>
              {GATE_MODES.map((m) => (
                <Box key={m.value} sx={{ mb: 0.5 }}>
                  <FormControlLabel value={m.value} control={<Radio />} label={m.label} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: -0.5 }}>{m.help}</Typography>
                </Box>
              ))}
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Numbering & register</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Default Book No. (optional)" value={c.tcBookNo || ''} onChange={set('tcBookNo')} helperText="Physical TC register book — leave blank if not used" /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="S.R.N. prefix" value={c.srnPrefix || ''} onChange={set('srnPrefix')} helperText="Continuous serial, never resets · DBPASN TC/ → DBPASN TC/163" /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="TC No. prefix" value={c.tcNumberPrefix || ''} onChange={set('tcNumberPrefix')} helperText="Resets each year; year appended · DBPASN/TC/ → DBPASN/TC/1/2026-27" /></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Field defaults</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Default result" value={c.defaultResult || ''} onChange={set('defaultResult')} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Default conduct" value={c.defaultConduct || ''} onChange={set('defaultConduct')} /></Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Default promotion" value={c.defaultPromotion || 'yes'} onChange={set('defaultPromotion')} SelectProps={{ native: true }}>
                <option value="yes">Yes</option><option value="no">No</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Default failed" value={c.defaultFailed || 'no'} onChange={set('defaultFailed')} SelectProps={{ native: true }}>
                <option value="no">No</option><option value="once">Once</option><option value="twice">Twice</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Default dues paid up to" value={c.defaultDuesPaidUpto || ''} onChange={set('defaultDuesPaidUpto')} helperText="e.g. MARCH" /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Default NCC / Scout / Guide" value={c.defaultNcc || ''} onChange={set('defaultNcc')} /></Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Result options (comma-separated)" value={csv(c.resultOptions)} onChange={(e) => setC((p) => ({ ...p, resultOptions: parseCsv(e.target.value) }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Conduct options (comma-separated)" value={csv(c.conductOptions)} onChange={(e) => setC((p) => ({ ...p, conductOptions: parseCsv(e.target.value) }))} />
            </Grid>
          </Grid>

          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch checked={!!c.autoDeriveSubjects} onChange={(e) => setC((p) => ({ ...p, autoDeriveSubjects: e.target.checked }))} />}
            label="Auto-fill 'Subjects studied' from the class's academic subjects"
          />
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={!dirty || saving}>
          {dirty ? (saving ? 'Saving…' : 'Save') : 'Saved'}
        </Button>
      </Stack>
    </Box>
  );
}
