import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, Grid, Chip, Alert, Button, Stack, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import { biometricService } from "../../services/biometricService";
import { employeeService } from "../../services/employeeService";
import { useCan } from "../../permissions/can";
import { fmtDateTime } from "../../utils/date";

const ENR_COLOR = { enrolled: "success", synced: "info", pending: "warning", removed: "default" };
const CMD_COLOR = { confirmed: "success", sent: "info", queued: "warning", failed: "error", cancelled: "default" };

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
  const [syncDialog, setSyncDialog] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(null);
  const [deviceNumber, setDeviceNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sn]);

  const load = async () => {
    setLoading(true);
    setError("");
    try { setData(await biometricService.getDevice(sn)); }
    catch (err) { setError(err.response?.data?.error?.description || "Failed to load device"); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (e) => {
    try { await biometricService.updateDevice(sn, { status: e.target.checked ? "active" : "disabled" }); await load(); }
    catch (err) { setError(err.response?.data?.error?.description || "Failed to update device"); }
  };

  const openSync = async () => {
    setSyncDialog(true);
    setPicked(null);
    setDeviceNumber("");
    try { setEmployees(await employeeService.searchEmployees({})); } catch { /* ignore */ }
  };

  const doSync = async () => {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await biometricService.syncEmployee(picked.uuid, { deviceSn: sn, deviceNumber: deviceNumber.trim() || undefined });
      setSyncDialog(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to sync");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) return <Box sx={{ py: 8, textAlign: "center" }}><Typography color="text.secondary">Loading…</Typography></Box>;

  const d = data.device || {};
  const enrollCols = [
    { field: "deviceNumber", headerName: "PIN", width: 90 },
    { field: "employeeName", headerName: "Staff", flex: 1, minWidth: 140, renderCell: (p) => p.value || p.row.name },
    { field: "status", headerName: "Status", width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={ENR_COLOR[p.value] || "default"} variant={p.value === "removed" ? "outlined" : "filled"} /> },
    { field: "fpCount", headerName: "Fingers", width: 90 },
    { field: "syncedAt", headerName: "Synced", width: 150, renderCell: (p) => p.value ? fmtDateTime(p.value) : "" },
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
        <Stack direction="row" spacing={1} alignItems="center">
          {canManage && <FormControlLabel control={<Switch checked={d.status === "active"} onChange={toggleStatus} />} label={d.status === "active" ? "Active" : "Disabled"} />}
          {canSync && <Button startIcon={<SyncIcon />} variant="contained" onClick={openSync}>Sync staff</Button>}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

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
        <ResponsiveDataGrid rows={data.enrollments || []} columns={enrollCols} getRowId={(r) => r.deviceNumber} autoHeight disableRowSelectionOnClick titleField="employeeName" primaryChipField="status" emptyMessage="No one synced to this device yet." />
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>Recent commands</Typography>
      <ResponsiveDataGrid rows={data.commands || []} columns={cmdCols} getRowId={(r) => r.uuid} autoHeight disableRowSelectionOnClick titleField="kind" primaryChipField="status" emptyMessage="No commands yet." />

      <Dialog open={syncDialog} onClose={() => !saving && setSyncDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sync a staff member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(o) => `${o.name}${o.deviceNumber ? ` (#${o.deviceNumber})` : ""}`}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              value={picked}
              onChange={(_e, v) => { setPicked(v); setDeviceNumber(v?.deviceNumber || ""); }}
              renderInput={(params) => <TextField {...params} label="Staff member" />}
            />
            <TextField label="Device number (PIN)" value={deviceNumber} onChange={(e) => setDeviceNumber(e.target.value)}
              inputProps={{ inputMode: "numeric", maxLength: 9 }}
              helperText="Numeric. Leave blank to keep the employee's existing number (or auto-assign)." fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialog(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={doSync} disabled={saving || !picked}>{saving ? "Syncing…" : "Sync"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
