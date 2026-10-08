import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Menu, MenuItem,
  ListItemIcon, ListItemText, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Stack, Chip,
} from '@mui/material';
import {
  Check as CheckIcon, Block as BlockIcon, SettingsBackupRestore as DefaultIcon,
  RadioButtonChecked as SelectedIcon,
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { can, baseGrants, setPermissionOverrides } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// God-only Permissions grid for the Attendance module. Identical mechanics to the Examinations
// and Clubs grids — the file policy is the default; god layers GLOBAL grant/revoke overrides.
// Fetches the `attendance` slice.
export default function AttendancePermissions() {
  const { user } = useAuth();
  const allowed = can(user, ACTIONS.AUTHZ_MANAGE);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [menu, setMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await authService.getPermissions('attendance');
      setData(r);
      setPermissionOverrides(r.overrides || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load permissions');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (allowed) load(); else setLoading(false); }, [allowed, load]);

  const overrideFor = (role, action) =>
    (data?.overrides || []).find((o) => o.role === role && o.action === action)?.effect || null;

  const choose = async (role, action, desired) => {
    setMenu(null); setBusy(true); setErr(''); setMsg('');
    try {
      const r = await authService.togglePermission(role, action, desired);
      setData((d) => ({ ...d, overrides: r.overrides || [] }));
      setPermissionOverrides(r.overrides || []);
      setMsg('Permission updated.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to update permission');
    } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!allowed) {
    return (
      <Box sx={{ maxWidth: 640 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Permissions</Typography>
        <Alert severity="warning">Only the super-admin (god) can manage permissions.</Alert>
      </Box>
    );
  }

  const roles = data?.roles || [];
  const actions = data?.actions || [];
  const current = menu ? overrideFor(menu.role, menu.action) : null;
  const menuDefault = menu ? baseGrants(menu.role, menu.action) : false;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Permissions · Attendance</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Who can do what in this module. The grid starts from the built-in policy; force-allow or force-deny any
        cell and it applies everywhere, immediately. A cell marked <b>overridden</b> differs from the default —
        reset it to fall back to the policy. (god always has everything and can't be changed.)
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card variant="outlined">
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ width: '100%', minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                {actions.map((a) => (
                  <TableCell key={a.action} align="center" sx={{ fontWeight: 700 }}>
                    <Tooltip title={a.action}><span>{a.label}</span></Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.role} hover>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {r.label}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{r.role}</Typography>
                  </TableCell>
                  {actions.map((a) => {
                    const ov = overrideFor(r.role, a.action);
                    const def = baseGrants(r.role, a.action);
                    const eff = ov === 'grant' ? true : ov === 'revoke' ? false : def;
                    return (
                      <TableCell key={a.action} align="center">
                        <Stack alignItems="center" spacing={0.3}>
                          <Chip
                            size="small"
                            icon={eff ? <CheckIcon /> : <BlockIcon />}
                            label={eff ? 'Allowed' : 'Denied'}
                            color={eff ? 'success' : 'default'}
                            variant={eff ? 'filled' : 'outlined'}
                            onClick={(e) => setMenu({ anchor: e.currentTarget, role: r.role, action: a.action })}
                            disabled={busy}
                            sx={{ cursor: 'pointer', fontWeight: 600, ...(ov ? { borderWidth: 2, borderStyle: 'solid', borderColor: 'warning.main' } : {}) }}
                          />
                          {ov && <Typography variant="caption" color="warning.main" sx={{ lineHeight: 1 }}>overridden</Typography>}
                        </Stack>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => choose(menu.role, menu.action, 'default')}>
          <ListItemIcon>{current === null ? <SelectedIcon fontSize="small" color="primary" /> : <DefaultIcon fontSize="small" />}</ListItemIcon>
          <ListItemText primary="Use default" secondary={`Policy says: ${menuDefault ? 'Allowed' : 'Denied'}`} />
        </MenuItem>
        <MenuItem onClick={() => choose(menu.role, menu.action, 'grant')}>
          <ListItemIcon>{current === 'grant' ? <SelectedIcon fontSize="small" color="primary" /> : <CheckIcon fontSize="small" color="success" />}</ListItemIcon>
          <ListItemText primary="Force allow" />
        </MenuItem>
        <MenuItem onClick={() => choose(menu.role, menu.action, 'revoke')}>
          <ListItemIcon>{current === 'revoke' ? <SelectedIcon fontSize="small" color="primary" /> : <BlockIcon fontSize="small" color="error" />}</ListItemIcon>
          <ListItemText primary="Force deny" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
