import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Stack,
  FormControlLabel, Switch,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// God-only by default (employee.config.manage); god can grant others via the Permissions grid.
export default function EmployeeConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.EMPLOYEE_CONFIG_MANAGE);

  const [restrict, setRestrict] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    (async () => {
      try {
        const { config } = await employeeService.getConfig();
        setRestrict(config?.restrictRoledEdit ?? true);
      } catch (e) {
        setErr(e.response?.data?.error?.description || 'Failed to load config');
      } finally { setLoading(false); }
    })();
  }, [canManage]);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const { config } = await employeeService.updateConfig({ restrictRoledEdit: restrict });
      setRestrict(config.restrictRoledEdit);
      setMsg('Employee config saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save config');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!canManage) {
    return (
      <Box sx={{ maxWidth: 640 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Employee Config</Typography>
        <Alert severity="warning">You don't have permission to manage employee config. This is restricted to the super-admin (god) by default.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Employee Config</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Settings for how employee records are managed in this school.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Protect employees who have roles</Typography>
          <FormControlLabel
            control={<Switch checked={restrict} onChange={(e) => setRestrict(e.target.checked)} />}
            label="Only a god user can edit or delete an employee who holds a role"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            When ON, an admin can still add employees and edit those with no role, but employees who
            have been assigned any role (e.g. teacher, in-charge) can only be edited or deleted by a
            god user. Admins can always view them. Role assignment is god-only regardless of this setting.
          </Typography>

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
