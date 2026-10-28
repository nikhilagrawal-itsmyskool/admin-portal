import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Stack,
  Autocomplete, TextField, Chip,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// God-only by default (employee.config.manage); god can grant others via the Permissions grid.
export default function EmployeeConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.EMPLOYEE_CONFIG_MANAGE);

  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]); // role objects
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    (async () => {
      try {
        const roles = (await employeeService.listRoles()) || [];
        setAllRoles(roles);
        const { config } = await employeeService.getConfig();
        const codes = config?.editProtectedRoles || [];
        setSelectedRoles(roles.filter((r) => codes.includes(r.code)));
      } catch (e) {
        setErr(e.response?.data?.error?.description || 'Failed to load config');
      } finally { setLoading(false); }
    })();
  }, [canManage]);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const codes = selectedRoles.map((r) => r.code);
      const { config } = await employeeService.updateConfig({ editProtectedRoles: codes });
      setSelectedRoles(allRoles.filter((r) => (config.editProtectedRoles || []).includes(r.code)));
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
    <Box sx={{ width: '100%', maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Employee Config</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Settings for how employee records are managed in this school.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Edit-protected roles</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Pick the roles that only a god user may manage. An admin will NOT be able to edit or
            delete an employee who holds any of these roles (admins can still add employees, edit
            everyone else, view all, and reset passwords). Role assignment itself is always god-only.
            Leave empty to let admins edit everyone.
          </Typography>
          <Autocomplete
            multiple
            options={allRoles}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            value={selectedRoles}
            onChange={(_e, value) => setSelectedRoles(value)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option.name} size="small" {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Roles only god can edit" placeholder="Pick roles…" />
            )}
          />

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
