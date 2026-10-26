import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Chip, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import { biometricService } from "../../services/biometricService";
import { useCan } from "../../permissions/can";
import { fmtDateTime } from "../../utils/date";

const STATUS_COLOR = { active: "success", disabled: "default", deleted: "error" };

export default function BiometricDevices() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can("biometric.device.manage");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try { setRows(await biometricService.listDevices()); }
    catch (err) { setError(err.response?.data?.error?.description || "Failed to load devices"); }
    finally { setLoading(false); }
  };

  const register = async () => {
    setSaving(true);
    setError("");
    try {
      await biometricService.registerDevice({ serialNumber: dialog.serialNumber.trim(), name: dialog.name, model: dialog.model });
      setDialog(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to register device");
    } finally {
      setSaving(false);
    }
  };

  const open = (sn) => navigate(`/staff-attendance/devices/${encodeURIComponent(sn)}`);

  const columns = [
    { field: "name", headerName: "Device", flex: 1, minWidth: 150, renderCell: (p) => p.value || p.row.serialNumber },
    { field: "serialNumber", headerName: "Serial", width: 160 },
    { field: "status", headerName: "Status", width: 110, renderCell: (p) => <Chip size="small" label={p.value} color={STATUS_COLOR[p.value] || "default"} variant={p.value === "active" ? "filled" : "outlined"} /> },
    { field: "lastSeenAt", headerName: "Last seen", width: 150, renderCell: (p) => p.value ? fmtDateTime(p.value) : <Typography variant="caption" color="text.secondary">never</Typography> },
    { field: "firmware", headerName: "Firmware", width: 150 },
    { field: "enrollmentCount", headerName: "Enrolled", width: 90 },
    { field: "actions", headerName: "", width: 70, sortable: false,
      renderCell: (p) => <IconButton size="small" title="View" onClick={() => open(p.row.serialNumber)}><VisibilityIcon fontSize="small" /></IconButton> },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 3 }}>
        <Typography variant="h4">Biometric Devices</Typography>
        {canManage && <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialog({ serialNumber: "", name: "", model: "ESSL K30 Pro" })}>Register device</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <ResponsiveDataGrid
        rows={rows} columns={columns} getRowId={(r) => r.uuid} loading={loading}
        autoHeight disableRowSelectionOnClick onRowClick={(p) => open(p.row.serialNumber)}
        onCardClick={(r) => open(r.serialNumber)}
        titleField="name" primaryChipField="status"
        emptyMessage="No devices registered yet."
      />

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Register device</DialogTitle>
        <DialogContent>
          {dialog && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField label="Serial number" value={dialog.serialNumber} onChange={(e) => setDialog({ ...dialog, serialNumber: e.target.value })} fullWidth required helperText="On the device: Menu → System Info (SN)" />
              <TextField label="Name / location" value={dialog.name} onChange={(e) => setDialog({ ...dialog, name: e.target.value })} fullWidth placeholder="e.g. Office Entrance" />
              <TextField label="Model" value={dialog.model} onChange={(e) => setDialog({ ...dialog, model: e.target.value })} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={register} disabled={saving || !dialog?.serialNumber?.trim()}>{saving ? "Saving…" : "Register"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
