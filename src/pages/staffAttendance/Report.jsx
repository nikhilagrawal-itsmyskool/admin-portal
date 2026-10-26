import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, Alert } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import { staffAttendanceService } from "../../services/staffAttendanceService";
import { todayIso } from "../../utils/date";

const COLS = [
  { field: "name", headerName: "Staff", flex: 1, minWidth: 160 },
  { field: "deviceNumber", headerName: "Device #", width: 100 },
  { field: "workingDays", headerName: "Working", width: 90 },
  { field: "present", headerName: "Present", width: 90 },
  { field: "late", headerName: "Late", width: 80 },
  { field: "halfDay", headerName: "Half", width: 70 },
  { field: "absent", headerName: "Absent", width: 90 },
  { field: "missingPunch", headerName: "Missing", width: 90 },
  { field: "regularized", headerName: "Reg.", width: 70 },
  { field: "onLeave", headerName: "Leave", width: 80 },
  { field: "totalLateMin", headerName: "Late (min)", width: 100 },
];

export default function StaffAttendanceReport() {
  const monthStart = todayIso().slice(0, 7) + "-01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState({ rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await staffAttendanceService.report({ from, to }));
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = COLS.map((c) => c.headerName).join(",");
    const lines = (data.rows || []).map((r) =>
      COLS.map((c) => {
        const v = r[c.field];
        return v == null ? "" : String(v).includes(",") ? `"${v}"` : v;
      }).join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-attendance_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 3 }}>
        <Typography variant="h4">Attendance Report</Typography>
        <Button startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!(data.rows || []).length}>
          Export CSV
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <TextField type="date" size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button variant="contained" onClick={load}>Run</Button>
      </Box>

      <ResponsiveDataGrid
        rows={data.rows || []}
        columns={COLS}
        getRowId={(r) => r.employeeId}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        titleField="name"
        emptyMessage="No data for this range."
      />
    </Box>
  );
}
