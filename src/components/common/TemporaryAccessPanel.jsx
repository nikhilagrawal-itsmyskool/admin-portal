import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton, Chip, Stack, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, TextField,
  ToggleButton, ToggleButtonGroup, Divider, CircularProgress, Tooltip,
} from '@mui/material';
import {
  AccessTime as ClockIcon, Add as AddIcon, Delete as RevokeIcon, PersonSearch as PickIcon,
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import EmployeeSearchDialog from './EmployeeSearchDialog';

const PRESETS = [1, 4, 8, 12, 24];

// Human "expires in 3h 12m" from an epoch-ms timestamp.
function remaining(expiresMs) {
  const ms = expiresMs - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Temporary per-employee access, shown on every module's Permissions grid (god-only). Assign a
// teacher a set of this module's actions for a fixed number of hours; they auto-expire. Enforced
// in the backend (shared/lib/authz-policy.ts hasActiveUserGrant).
export default function TemporaryAccessPanel({ module, actions = [] }) {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [picked, setPicked] = useState([]); // action strings
  const [hours, setHours] = useState(12);
  const [customHours, setCustomHours] = useState('');
  const [reason, setReason] = useState('');
  const [, force] = useState(0); // 1-min tick so the countdowns advance

  const labelFor = (a) => actions.find((x) => x.action === a)?.label || a;

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await authService.listGrants(module);
      setGrants(r.grants || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load temporary grants');
    } finally { setLoading(false); }
  }, [module]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const resetForm = () => { setEmployee(null); setPicked([]); setHours(12); setCustomHours(''); setReason(''); };

  const toggleAction = (a) =>
    setPicked((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const effectiveHours = customHours ? Number(customHours) : hours;

  const submit = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await authService.createGrants(employee.uuid, picked, effectiveHours, reason || undefined);
      setMsg(`Granted ${r.actions.length} permission(s) to ${r.employeeName || 'the teacher'} for ${r.hours}h.`);
      setAddOpen(false); resetForm();
      await load();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to grant temporary access');
    } finally { setBusy(false); }
  };

  const revoke = async (id) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await authService.revokeGrant(id);
      setGrants((g) => g.filter((x) => x.uuid !== id));
      setMsg('Grant revoked.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to revoke');
    } finally { setBusy(false); }
  };

  const canSubmit = employee && picked.length && effectiveHours >= 1 && effectiveHours <= 720;

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ClockIcon fontSize="small" /> Temporary access
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Grant one teacher these permissions for a fixed number of hours. They expire automatically.
            </Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { resetForm(); setAddOpen(true); }}>
            Add
          </Button>
        </Box>

        {err && <Alert severity="error" sx={{ my: 1 }} onClose={() => setErr('')}>{err}</Alert>}
        {msg && <Alert severity="success" sx={{ my: 1 }} onClose={() => setMsg('')}>{msg}</Alert>}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={22} /></Box>
        ) : grants.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No active temporary grants for this module.
          </Typography>
        ) : (
          <Stack divider={<Divider />} spacing={0}>
            {grants.map((g) => (
              <Box key={g.uuid} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.employeeName || g.employeeId}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {labelFor(g.action)}{g.reason ? ` · ${g.reason}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" icon={<ClockIcon />} label={remaining(g.expiresMs)} color="warning" variant="outlined" />
                  <Tooltip title="Revoke now">
                    <IconButton size="small" color="error" onClick={() => revoke(g.uuid)} disabled={busy}>
                      <RevokeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grant temporary access</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Teacher</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Button variant="outlined" size="small" startIcon={<PickIcon />} onClick={() => setPickOpen(true)}>
              {employee ? 'Change' : 'Pick teacher'}
            </Button>
            {employee && <Chip label={employee.name} onDelete={() => setEmployee(null)} />}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Permissions</Typography>
          <Box sx={{ mb: 2 }}>
            {actions.map((a) => (
              <FormControlLabel
                key={a.action}
                control={<Checkbox size="small" checked={picked.includes(a.action)} onChange={() => toggleAction(a.action)} />}
                label={<span>{a.label} <Typography component="span" variant="caption" color="text.secondary">({a.action})</Typography></span>}
                sx={{ display: 'block' }}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Duration</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={customHours ? null : hours}
              onChange={(_e, v) => { if (v) { setHours(v); setCustomHours(''); } }}
            >
              {PRESETS.map((p) => <ToggleButton key={p} value={p}>{p}h</ToggleButton>)}
            </ToggleButtonGroup>
            <TextField
              size="small" label="Custom hours" type="number" value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              inputProps={{ min: 1, max: 720 }} sx={{ width: 130 }}
            />
          </Box>

          <TextField
            fullWidth size="small" label="Reason (optional)" value={reason}
            onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 255 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!canSubmit || busy}>
            Grant for {effectiveHours || '…'}h
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeSearchDialog open={pickOpen} onClose={() => setPickOpen(false)} onSelect={(e) => setEmployee(e)} />
    </Card>
  );
}
