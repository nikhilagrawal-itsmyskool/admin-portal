import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Stack,
  FormControlLabel, Switch, RadioGroup, Radio, FormControl, FormLabel, Divider,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { attendanceService } from '../../services/attendanceService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// How a half-day counts toward the attendance %. Mirrors the backend HALF_DAY_WEIGHTS.
const WEIGHTS = [
  { value: 'half', label: 'Half day (0.5)', help: 'Counts as 0.5 of a working day — the student gets half credit. Most literal.' },
  { value: 'full', label: 'Full present', help: "Counts as a full present (like 'Late'). Recorded as half-day but doesn't lower the %." },
  { value: 'excluded', label: 'Excluded', help: "Not counted as a working day at all (like 'Leave'). Purely a record that the student left early." },
];

// God-only by default (attendance.config.manage); god can grant others via the Permissions grid.
// Define how a Half-day attendance is treated.
export default function AttendanceConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.ATTENDANCE_CONFIG_MANAGE);

  const [enabled, setEnabled] = useState(true);
  const [weight, setWeight] = useState('half');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    (async () => {
      try {
        const { config } = await attendanceService.getConfig();
        setEnabled(config?.halfDayEnabled ?? true);
        setWeight(config?.halfDayWeight || 'half');
      } catch (e) {
        setErr(e.response?.data?.error?.description || 'Failed to load config');
      } finally { setLoading(false); }
    })();
  }, [canManage]);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const { config } = await attendanceService.updateConfig({ halfDayEnabled: enabled, halfDayWeight: weight });
      setEnabled(config.halfDayEnabled);
      setWeight(config.halfDayWeight);
      setMsg('Attendance config saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save config');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!canManage) {
    return (
      <Box sx={{ maxWidth: 640 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Attendance Config</Typography>
        <Alert severity="warning">You don't have permission to manage attendance config. This is restricted to the super-admin (god) by default.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Attendance Config</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Settings for how attendance is recorded and counted for this school.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Half-day attendance</Typography>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label="Offer a 'Half day' status when marking attendance"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            For students who come to school but leave before off-time. When off, the Half-day button
            is hidden on the marking screen (existing half-day records are still counted as below).
          </Typography>

          <Divider sx={{ my: 2 }} />

          <FormControl disabled={!enabled}>
            <FormLabel sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              How a half-day counts toward the attendance %
            </FormLabel>
            <RadioGroup value={weight} onChange={(e) => setWeight(e.target.value)}>
              {WEIGHTS.map((w) => (
                <Box key={w.value} sx={{ mb: 0.5 }}>
                  <FormControlLabel value={w.value} control={<Radio />} label={w.label} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: -0.5 }}>
                    {w.help}
                  </Typography>
                </Box>
              ))}
            </RadioGroup>
          </FormControl>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
              Save
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
