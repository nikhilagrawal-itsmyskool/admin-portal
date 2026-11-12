import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, Grid, Chip, Alert, Button, Stack, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Autocomplete, MenuItem,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import RuleIcon from "@mui/icons-material/Rule";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import { biometricService } from "../../services/biometricService";
import { employeeService } from "../../services/employeeService";
import { useCan } from "../../permissions/can";
import { fmtDateTime } from "../../utils/date";

const ENR_COLOR = { enrolled: "success", synced: "info", pending: "warning", suspended: "secondary", removed: "default" };
const CMD_COLOR = { confirmed: "success", sent: "info", queued: "warning", failed: "error", cancelled: "default" };
// Statuses that mean the person is live on the device (vs removed/suspended).
const LIVE = ["pending", "synced", "enrolled"];
const PRIV_OPTIONS = [{ value: 0, label: "User" }, { value: 14, label: "Super admin" }];

function Fact({ label, value }) {
  return (
    <Grid item xs={6} sm={4} md={3}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value ?? "—"}</Typography>
    </Grid>
  );
}

export default function BiometricDeviceDetail() {
  const { id: sn } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can("biometric.device.manage");
  const canSync = can("biometric.enrollment.sync");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncDialog, setSyncDialog] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(null);
  const [deviceNumber, setDeviceNumber] = useState("");
  const [privilege, setPrivilege] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [syncAllDialog, setSyncAllDialog] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [reconcileDialog, setReconcileDialog] = useState(false);
  const [reconcilePlan, setReconcilePlan] = useState([]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sn]);

  // Auto-refresh the device facts / enrollments / commands every 5s (silent, no spinner)
  // so new syncs + punches appear live during registration. Toggle off to stop polling.
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [autoRefresh, sn]);

  const load = async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try { setData(await biometricService.getDevice(sn)); }
    catch (err) { if (!silent) setError(err.response?.data?.error?.description || "Failed to load device"); }
    finally { if (!silent) setLoading(false); }
  };

  const toggleStatus = async (e) => {
    try { await biometricService.updateDevice(sn, { status: e.target.checked ? "active" : "disabled" }); await load(); }
    catch (err) { setError(err.response?.data?.error?.description || "Failed to update device"); }
  };

  const openSync = async () => {
    setSyncDialog(true);
    setPicked(null);
    setDeviceNumber("");
    setPrivilege(0);
    try { setEmployees(await employeeService.searchEmployees({})); } catch { /* ignore */ }
  };

  const doSync = async () => {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await biometricService.syncEmployee(picked.uuid, { deviceSn: sn, deviceNumber: deviceNumber.trim() || undefined, privilege });
      setSyncDialog(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to sync");
    } finally {
      setSaving(false);
    }
  };

  // Preview first: fetch exactly who would be pushed (only staff who already have a device
  // number — a bulk sync never invents one), show the list, then push on confirm.
  const openSyncAll = async () => {
    setBusyAll(true); setError(""); setNotice("");
    try {
      const r = await biometricService.syncAllPreview(sn);
      setCandidates(r.candidates || []);
      setSyncAllDialog(true);
    } catch (err) { setError(err.response?.data?.error?.description || "Failed to load candidates"); }
    finally { setBusyAll(false); }
  };

  const confirmSyncAll = async () => {
    setBusyAll(true); setError("");
    try {
      const r = await biometricService.syncAll(sn, {});
      const names = (r.people || []).map((p) => `${p.name} (#${p.deviceNumber})`).join(", ");
      setNotice(r.synced ? `Queued ${r.synced}: ${names}` : "Nobody to sync.");
      setSyncAllDialog(false);
      await load();
    } catch (err) { setError(err.response?.data?.error?.description || "Failed to sync all"); }
    finally { setBusyAll(false); }
  };

  // Preview first: compute what reconcile WOULD do (who gets suspended/restored), show it,
  // then apply on confirm. If nothing would change, just say so — no dialog.
  const openReconcile = async () => {
    setBusyAll(true); setError(""); setNotice("");
    try {
      const r = await biometricService.reconcilePreview(sn);
      if (!r.changed) { setNotice("Reconcile: nothing to change — the device matches current staff status."); return; }
      setReconcilePlan(r.actions || []);
      setReconcileDialog(true);
    } catch (err) { setError(err.response?.data?.error?.description || "Failed to preview reconcile"); }
    finally { setBusyAll(false); }
  };

  const confirmReconcile = async () => {
    setBusyAll(true); setError("");
    try {
      const r = await biometricService.reconcileDevice(sn);
      const names = (r.actions || []).map((a) => `${a.name} ${a.action}`).join(", ");
      setNotice(r.changed ? `Reconcile: ${r.changed} change(s) — ${names}` : "Reconcile: nothing to change.");
      setReconcileDialog(false);
      await load();
    } catch (err) { setError(err.response?.data?.error?.description || "Failed to reconcile"); }
    finally { setBusyAll(false); }
  };

  const toggleRole = async (row) => {
    const next = row.privilege === 14 ? 0 : 14;
    setError("");
    try { await biometricService.setPrivilege(row.employeeId, { deviceSn: sn, privilege: next }); await load(); }
    catch (err) { setError(err.response?.data?.error?.description || "Failed to change role"); }
  };

  if (loading || !data) return <Box sx={{ py: 8, textAlign: "center" }}><Typography color="text.secondary">Loading…</Typography></Box>;

  const d = data.device || {};
  const enrollments = data.enrollments || [];
  // Employee ids currently live on this device — used to mark them in the sync picker.
  const liveEmpIds = new Set(enrollments.filter((e) => LIVE.includes(e.status)).map((e) => e.employeeId));

  const enrollCols = [
    { field: "deviceNumber", headerName: "PIN", width: 90 },
    { field: "employeeName", headerName: "Staff", flex: 1, minWidth: 140, renderCell: (p) => p.value || p.row.name },
    { field: "status", headerName: "Status", width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={ENR_COLOR[p.value] || "default"} variant={["removed", "suspended"].includes(p.value) ? "outlined" : "filled"} /> },
    { field: "privilege", headerName: "Role", width: 120, renderCell: (p) => <Chip size="small" variant="outlined" color={p.value === 14 ? "secondary" : "default"} label={p.value === 14 ? "Super admin" : "User"} /> },
    { field: "fpCount", headerName: "Fingers", width: 80 },
    { field: "syncedAt", headerName: "Synced", width: 150, renderCell: (p) => p.value ? fmtDateTime(p.value) : "" },
    ...(canSync ? [{
      field: "actions", headerName: "", width: 160, sortable: false, filterable: false,
      renderCell: (p) => (LIVE.includes(p.row.status)
        ? <Button size="small" onClick={() => toggleRole(p.row)}>{p.row.privilege === 14 ? "Make user" : "Make super-admin"}</Button>
        : null),
    }] : []),
  ];
  const cmdCols = [
    { field: "kind", headerName: "Command", width: 140 },
    { field: "status", headerName: "Status", width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={CMD_COLOR[p.value] || "default"} variant="outlined" /> },
    { field: "returnCode", headerName: "Return", width: 90 },
    { field: "createdAt", headerName: "Queued", width: 150, renderCell: (p) => p.value ? fmtDateTime(p.value) : "" },
  ];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/staff-attendance/devices")} sx={{ mb: 1 }}>Devices</Button>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Typography variant="h4">{d.name || d.serialNumber}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <FormControlLabel
            control={<Switch size="small" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
            label="Auto-refresh (5s)"
          />
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => load()}>Refresh</Button>
          {canManage && <FormControlLabel control={<Switch checked={d.status === "active"} onChange={toggleStatus} />} label={d.status === "active" ? "Active" : "Disabled"} />}
          {canManage && <Button size="small" startIcon={<RuleIcon />} onClick={openReconcile} disabled={busyAll}>Reconcile now</Button>}
          {canSync && <Button size="small" startIcon={<GroupAddIcon />} onClick={openSyncAll} disabled={busyAll}>Sync all un-synced</Button>}
          {canSync && <Button startIcon={<SyncIcon />} variant="contained" onClick={openSync}>Sync staff</Button>}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Fact label="Serial" value={d.serialNumber} />
            <Fact label="Model" value={d.model} />
            <Fact label="Status" value={d.status} />
            <Fact label="Last seen" value={d.lastSeenAt ? fmtDateTime(d.lastSeenAt) : "never"} />
            <Fact label="Firmware" value={d.firmware} />
            <Fact label="Push ver" value={d.pushVersion} />
            <Fact label="Users on device" value={d.userCount} />
            <Fact label="Fingerprints" value={d.fpCount} />
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Enrollments</Typography>
      <Box sx={{ mb: 3 }}>
        <ResponsiveDataGrid rows={enrollments} columns={enrollCols} getRowId={(r) => r.deviceNumber} autoHeight disableRowSelectionOnClick titleField="employeeName" primaryChipField="status" emptyMessage="No one synced to this device yet." />
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>Recent commands</Typography>
      <ResponsiveDataGrid rows={data.commands || []} columns={cmdCols} getRowId={(r) => r.uuid} autoHeight disableRowSelectionOnClick titleField="kind" primaryChipField="status" emptyMessage="No commands yet." />

      <Dialog open={syncDialog} onClose={() => !saving && setSyncDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sync a staff member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(o) => `${o.name}${o.deviceNumber ? ` (#${o.deviceNumber})` : ""}${liveEmpIds.has(o.uuid) ? " • on device" : ""}`}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              value={picked}
              onChange={(_e, v) => { setPicked(v); setDeviceNumber(v?.deviceNumber || ""); }}
              renderInput={(params) => <TextField {...params} label="Staff member" helperText="“• on device” = already synced here." />}
            />
            <TextField label="Device number (PIN)" value={deviceNumber} onChange={(e) => setDeviceNumber(e.target.value)}
              inputProps={{ inputMode: "numeric", maxLength: 9 }}
              helperText="Numeric. Leave blank to keep the employee's existing number (or auto-assign)." fullWidth />
            <TextField select label="Role on device" value={privilege} onChange={(e) => setPrivilege(Number(e.target.value))}
              helperText="Super admins can enrol others at the keypad." fullWidth>
              {PRIV_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialog(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={doSync} disabled={saving || !picked}>{saving ? "Syncing…" : "Sync"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={syncAllDialog} onClose={() => !busyAll && setSyncAllDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sync all un-synced</DialogTitle>
        <DialogContent>
          {candidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Everyone with a device number is already on this device. Only staff who have a device
              number assigned (and aren't yet synced) are pushed — assign a number on the employee
              screen first.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                These {candidates.length} staff member(s) will be pushed to the device:
              </Typography>
              <Stack spacing={0.5} sx={{ maxHeight: 280, overflowY: "auto" }}>
                {candidates.map((c) => (
                  <Typography key={c.uuid} variant="body2">• {c.name} <Typography component="span" color="text.secondary">(#{c.deviceNumber})</Typography></Typography>
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncAllDialog(false)} disabled={busyAll}>Cancel</Button>
          <Button variant="contained" onClick={confirmSyncAll} disabled={busyAll || candidates.length === 0}>
            {busyAll ? "Syncing…" : `Sync ${candidates.length}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reconcileDialog} onClose={() => !busyAll && setReconcileDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reconcile this device</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
            {reconcilePlan.length} change(s) will be applied:
          </Typography>
          <Stack spacing={0.5} sx={{ maxHeight: 280, overflowY: "auto" }}>
            {reconcilePlan.map((a, i) => (
              <Typography key={`${a.deviceNumber}-${i}`} variant="body2">
                <Chip size="small" sx={{ mr: 1 }} color={a.action === "restored" ? "success" : "warning"}
                  label={a.action === "restored" ? "Restore" : "Remove"} />
                {a.name} <Typography component="span" color="text.secondary">(#{a.deviceNumber})</Typography>
              </Typography>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
            Remove = employee is inactive/left (user deleted from device, fingerprints kept). Restore =
            employee is active again (user + stored fingerprints pushed back).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReconcileDialog(false)} disabled={busyAll}>Cancel</Button>
          <Button variant="contained" onClick={confirmReconcile} disabled={busyAll || reconcilePlan.length === 0}>
            {busyAll ? "Applying…" : `Apply ${reconcilePlan.length}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
