import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Chip, Alert, Stack, Button, Card, CardContent, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { staffAttendanceService, STATUS_META, REG_KINDS } from "../../services/staffAttendanceService";
import { todayIso, fmtDate, fmtDateDow } from "../../utils/date";

const KIND_LABEL = Object.fromEntries(REG_KINDS.map((k) => [k.value, k.label]));

function monthRange(month) {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${month}-${String(last).padStart(2, "0")}` };
}

export default function MyAttendance() {
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [data, setData] = useState(null);
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { from, to } = monthRange(month);
      const [att, r] = await Promise.all([
        staffAttendanceService.myAttendance({ from, to }),
        staffAttendanceService.myRegularizations(),
      ]);
      setData(att);
      setRegs(r);
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to load your attendance");
    } finally {
      setLoading(false);
    }
  };

  const openRequest = (day) => setDialog({
    attDate: day?.date || todayIso(), kind: "missing_both", claimedIn: "", claimedOut: "", reason: "",
  });

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await staffAttendanceService.applyRegularization({
        attDate: dialog.attDate, kind: dialog.kind,
        claimedIn: dialog.claimedIn || undefined, claimedOut: dialog.claimedOut || undefined, reason: dialog.reason,
      });
      setDialog(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  const cancelReg = async (id) => {
    try { await staffAttendanceService.cancelRegularization(id); await load(); }
    catch (err) { setError(err.response?.data?.error?.description || "Failed to cancel"); }
  };

  const chip = (status) => {
    const m = STATUS_META[status] || { label: status, color: "default" };
    return <Chip size="small" label={m.label} color={m.color} variant={m.color === "default" ? "outlined" : "filled"} />;
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Typography variant="h4">My Attendance</Typography>
        <Stack direction="row" spacing={1}>
          <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button startIcon={<AddIcon />} variant="outlined" onClick={() => openRequest(null)}>Regularize</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {data?.summary && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Stat label="Present" value={data.summary.present} />
            <Stat label="Late" value={data.summary.late} />
            <Stat label="Absent" value={data.summary.absent} />
            <Stat label="Half day" value={data.summary.halfDay} />
            <Stat label="Regularized" value={data.summary.regularized} />
            <Stat label="Late (min)" value={data.summary.totalLateMin} />
          </CardContent>
        </Card>
      )}

      <Stack spacing={1}>
        {(data?.days || []).map((d) => {
          const working = !["weekly_off", "holiday", "on_leave"].includes(d.status);
          const canReg = working && ["absent", "missing_punch", "late"].includes(d.status);
          return (
            <Card key={d.date} variant="outlined">
              <CardContent sx={{ py: 1, display: "flex", alignItems: "center", gap: 1, "&:last-child": { pb: 1 } }}>
                <Box sx={{ minWidth: 150 }}><Typography variant="body2">{fmtDateDow(d.date)}</Typography></Box>
                {chip(d.status)}
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  {d.firstIn ? `${d.firstIn}${d.lastOut ? " – " + d.lastOut : " – (no out)"}` : ""}
                  {d.lateByMin ? `  · late ${d.lateByMin}m` : ""}
                </Typography>
                {canReg && <Button size="small" onClick={() => openRequest(d)}>Regularize</Button>}
              </CardContent>
            </Card>
          );
        })}
        {!loading && !(data?.days || []).length && <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No data.</Typography>}
      </Stack>

      {regs.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>My requests</Typography>
          <Stack spacing={1}>
            {regs.map((r) => (
              <Card key={r.uuid} variant="outlined">
                <CardContent sx={{ py: 1, display: "flex", alignItems: "center", gap: 1, "&:last-child": { pb: 1 } }}>
                  <Typography variant="body2" sx={{ minWidth: 110 }}>{fmtDate(r.attDate)}</Typography>
                  <Typography variant="caption" sx={{ flex: 1 }}>{KIND_LABEL[r.kind] || r.kind} · {r.reason}</Typography>
                  <Chip size="small" label={r.status} color={r.status === "approved" ? "success" : r.status === "rejected" ? "error" : r.status === "open" ? "warning" : "default"} variant={r.status === "open" ? "filled" : "outlined"} />
                  {r.status === "open" && <IconButton size="small" title="Cancel" onClick={() => cancelReg(r.uuid)}><CloseIcon fontSize="small" /></IconButton>}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Request regularization</DialogTitle>
        <DialogContent>
          {dialog && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField type="date" label="Date" value={dialog.attDate} onChange={(e) => setDialog({ ...dialog, attDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField select label="Type" value={dialog.kind} onChange={(e) => setDialog({ ...dialog, kind: e.target.value })} fullWidth>
                {REG_KINDS.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField type="time" label="Claimed in" value={dialog.claimedIn} onChange={(e) => setDialog({ ...dialog, claimedIn: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                <TextField type="time" label="Claimed out" value={dialog.claimedOut} onChange={(e) => setDialog({ ...dialog, claimedOut: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              </Stack>
              <TextField label="Reason" value={dialog.reason} onChange={(e) => setDialog({ ...dialog, reason: e.target.value })} multiline minRows={2} fullWidth required />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving || !dialog?.reason?.trim()}>{saving ? "Submitting…" : "Submit"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Stat({ label, value }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h6">{value ?? 0}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
