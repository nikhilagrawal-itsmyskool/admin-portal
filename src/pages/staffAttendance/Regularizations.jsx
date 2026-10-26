import React, { useState, useEffect } from "react";
import {
  Box, Typography, Chip, Alert, TextField, MenuItem, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, IconButton,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import { staffAttendanceService, REG_KINDS } from "../../services/staffAttendanceService";
import { useCan } from "../../permissions/can";
import { fmtDate } from "../../utils/date";

const KIND_LABEL = Object.fromEntries(REG_KINDS.map((k) => [k.value, k.label]));
const STATUS_COLOR = { open: "warning", approved: "success", rejected: "error", cancelled: "default" };

export default function Regularizations() {
  const can = useCan();
  const canDecide = can("staff-attendance.regularization.approve");
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // { row, approve }
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await staffAttendanceService.listRegularizations({ status: status || undefined }));
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const decide = async () => {
    setSaving(true);
    try {
      const { row, approve } = dialog;
      if (approve) await staffAttendanceService.approveRegularization(row.uuid, comment);
      else await staffAttendanceService.rejectRegularization(row.uuid, comment);
      setDialog(null);
      setComment("");
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to decide");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "employeeName", headerName: "Staff", flex: 1, minWidth: 150 },
    { field: "attDate", headerName: "Date", width: 120, renderCell: (p) => fmtDate(p.value) },
    { field: "kind", headerName: "Type", width: 150, renderCell: (p) => KIND_LABEL[p.value] || p.value },
    { field: "claimedIn", headerName: "In", width: 80 },
    { field: "claimedOut", headerName: "Out", width: 80 },
    { field: "reason", headerName: "Reason", flex: 1, minWidth: 180 },
    { field: "status", headerName: "Status", width: 110,
      renderCell: (p) => <Chip size="small" label={p.value} color={STATUS_COLOR[p.value] || "default"} variant={p.value === "open" ? "filled" : "outlined"} /> },
    { field: "actions", headerName: "Actions", width: 100, sortable: false,
      renderCell: (p) => canDecide && p.row.status === "open" && (
        <Box>
          <IconButton size="small" color="success" title="Approve" onClick={() => { setDialog({ row: p.row, approve: true }); setComment(""); }}><CheckIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" title="Reject" onClick={() => { setDialog({ row: p.row, approve: false }); setComment(""); }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      ) },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Regularization Requests</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="">All</MenuItem>
        </TextField>
      </Box>

      <ResponsiveDataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.uuid}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        titleField="employeeName"
        primaryChipField="status"
        emptyMessage="No requests."
      />

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog?.approve ? "Approve" : "Reject"} request</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="body2">
              {dialog?.row?.employeeName} · {dialog && fmtDate(dialog.row.attDate)} · {dialog && (KIND_LABEL[dialog.row.kind] || dialog.row.kind)}
            </Typography>
            <Typography variant="body2" color="text.secondary">{dialog?.row?.reason}</Typography>
            <TextField label="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} multiline minRows={2} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" color={dialog?.approve ? "success" : "error"} onClick={decide} disabled={saving}>
            {saving ? "Saving..." : dialog?.approve ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
