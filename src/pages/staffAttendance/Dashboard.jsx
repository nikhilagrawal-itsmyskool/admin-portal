import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, Button, Chip, Alert, Stack } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import { staffAttendanceService, STATUS_META } from "../../services/staffAttendanceService";
import { useCan } from "../../permissions/can";
import { todayIso } from "../../utils/date";

function StatusChip({ value }) {
  const m = STATUS_META[value] || { label: value, color: "default" };
  return <Chip size="small" label={m.label} color={m.color} variant={m.color === "default" ? "outlined" : "filled"} />;
}

export default function StaffAttendanceDashboard() {
  const navigate = useNavigate();
  const can = useCan();
  const canApprove = can("staff-attendance.regularization.approve");
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState({ rows: [], count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await staffAttendanceService.dayView(date));
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: "name", headerName: "Staff", flex: 1, minWidth: 160 },
    { field: "deviceNumber", headerName: "Device #", width: 100,
      renderCell: (p) => p.value || <Typography variant="caption" color="text.secondary">—</Typography> },
    { field: "status", headerName: "Status", width: 150, renderCell: (p) => <StatusChip value={p.value} /> },
    { field: "firstIn", headerName: "In", width: 90 },
    { field: "lastOut", headerName: "Out", width: 90 },
    { field: "lateByMin", headerName: "Late (min)", width: 100,
      renderCell: (p) => (p.value ? <Typography variant="body2" color="warning.main">{p.value}</Typography> : "") },
    { field: "seasonName", headerName: "Season", width: 110,
      renderCell: (p) => p.value ? <Chip size="small" variant="outlined" label={p.value} /> : "" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 3 }}>
        <Typography variant="h4">Staff Attendance</Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<AssessmentIcon />} onClick={() => navigate("/staff-attendance/report")}>Report</Button>
          {canApprove && (
            <Button startIcon={<FactCheckIcon />} onClick={() => navigate("/staff-attendance/regularizations")}>
              Regularizations
            </Button>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <TextField type="date" size="small" label="Date" value={date}
          onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Typography variant="body2" color="text.secondary">
          {data.count} staff
        </Typography>
      </Box>

      <ResponsiveDataGrid
        rows={data.rows || []}
        columns={columns}
        getRowId={(r) => r.employeeId}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        titleField="name"
        primaryChipField="status"
        emptyMessage="No staff / no data for this date."
      />
    </Box>
  );
}
