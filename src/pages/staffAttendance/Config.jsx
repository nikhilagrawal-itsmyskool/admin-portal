import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid, Alert, Switch,
  FormControlLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  Autocomplete, Chip, MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { staffAttendanceService } from "../../services/staffAttendanceService";
import { employeeService } from "../../services/employeeService";
import { useCan } from "../../permissions/can";

const EMPTY_SEASON = { name: "", startMonth: 4, startDay: 1, endMonth: 6, endDay: 30, expectedIn: "07:30", expectedOut: "13:30", graceMin: 10, halfDayAfterMin: "", sortOrder: 0 };
const MONTHS = [[1, "Jan"], [2, "Feb"], [3, "Mar"], [4, "Apr"], [5, "May"], [6, "Jun"], [7, "Jul"], [8, "Aug"], [9, "Sep"], [10, "Oct"], [11, "Nov"], [12, "Dec"]];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function StaffAttendanceConfig() {
  const can = useCan();
  const canManage = can("staff-attendance.config.manage");

  const [cfg, setCfg] = useState(null);
  const [baseline, setBaseline] = useState("");
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [seasonDialog, setSeasonDialog] = useState(null); // { ...season, _edit:bool }
  const [del, setDel] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  const dirty = cfg && JSON.stringify(cfg) !== baseline;

  // Helpers to map stored code/id arrays <-> option objects for the pickers.
  const rolesFromCodes = (codes) => allRoles.filter((r) => (codes || []).includes(r.code));
  const empsFromIds = (ids) => allEmployees.filter((e) => (ids || []).includes(e.uuid));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [c, roles, emps] = await Promise.all([
        staffAttendanceService.getConfig(),
        employeeService.listRoles().catch(() => []),
        employeeService.searchEmployees({}).catch(() => []),
      ]);
      setAllRoles(roles || []);
      setAllEmployees(emps || []);
      const picked = {
        expectedIn: c.expectedIn || "09:00",
        expectedOut: c.expectedOut || "15:00",
        graceMin: c.graceMin ?? 10,
        halfDayAfterMin: c.halfDayAfterMin ?? "",
        enabled: c.enabled || "on",
        exemptRoleCodes: c.exemptRoleCodes || [],
        includeEmployeeIds: c.includeEmployeeIds || [],
        exemptEmployeeIds: c.exemptEmployeeIds || [],
      };
      setCfg(picked);
      setBaseline(JSON.stringify(picked));
      setSeasons(await staffAttendanceService.listSeasons());
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to load config");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...cfg, halfDayAfterMin: cfg.halfDayAfterMin === "" ? null : Number(cfg.halfDayAfterMin), graceMin: Number(cfg.graceMin) };
      const c = await staffAttendanceService.updateConfig(payload);
      const picked = {
        expectedIn: c.expectedIn, expectedOut: c.expectedOut, graceMin: c.graceMin ?? 10,
        halfDayAfterMin: c.halfDayAfterMin ?? "", enabled: c.enabled || "on",
        exemptRoleCodes: c.exemptRoleCodes || [], includeEmployeeIds: c.includeEmployeeIds || [], exemptEmployeeIds: c.exemptEmployeeIds || [],
      };
      setCfg(picked);
      setBaseline(JSON.stringify(picked));
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveSeason = async () => {
    setSaving(true);
    setError("");
    try {
      const s = seasonDialog;
      const payload = {
        name: s.name, startMonth: Number(s.startMonth), startDay: Number(s.startDay),
        endMonth: Number(s.endMonth), endDay: Number(s.endDay),
        expectedIn: s.expectedIn, expectedOut: s.expectedOut,
        graceMin: Number(s.graceMin) || 0, halfDayAfterMin: s.halfDayAfterMin === "" ? null : Number(s.halfDayAfterMin),
        sortOrder: Number(s.sortOrder) || 0,
      };
      if (s._edit) await staffAttendanceService.updateSeason(s.uuid, payload);
      else await staffAttendanceService.createSeason(payload);
      setSeasonDialog(null);
      setSeasons(await staffAttendanceService.listSeasons());
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to save season");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setSaving(true);
    try {
      await staffAttendanceService.deleteSeason(del.uuid);
      setDel(null);
      setSeasons(await staffAttendanceService.listSeasons());
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return <Alert severity="warning">You do not have permission to manage staff-attendance config.</Alert>;
  if (loading || !cfg) return <Box sx={{ py: 8, textAlign: "center" }}><Typography color="text.secondary">Loading…</Typography></Box>;

  const seasonCols = [
    { field: "name", headerName: "Season", flex: 1, minWidth: 120 },
    { field: "window", headerName: "Window", width: 150, renderCell: (p) => `${p.row.startDay}/${p.row.startMonth} – ${p.row.endDay}/${p.row.endMonth}` },
    { field: "expectedIn", headerName: "In", width: 80 },
    { field: "expectedOut", headerName: "Out", width: 80 },
    { field: "graceMin", headerName: "Grace", width: 80 },
    { field: "actions", headerName: "", width: 90, sortable: false,
      renderCell: (p) => (
        <Box>
          <IconButton size="small" title="Edit" onClick={() => setSeasonDialog({ ...p.row, halfDayAfterMin: p.row.halfDayAfterMin ?? "", _edit: true })}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" title="Delete" onClick={() => setDel(p.row)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ) },
  ];

  return (
    <Box sx={{ maxWidth: 980 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Staff Attendance — Config</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Default policy</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}><TextField fullWidth type="time" label="Expected in" value={cfg.expectedIn} onChange={(e) => setCfg({ ...cfg, expectedIn: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="time" label="Expected out" value={cfg.expectedOut} onChange={(e) => setCfg({ ...cfg, expectedOut: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="number" label="Grace (min)" value={cfg.graceMin} onChange={(e) => setCfg({ ...cfg, graceMin: e.target.value })} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="number" label="Half-day if worked < (min)" value={cfg.halfDayAfterMin} onChange={(e) => setCfg({ ...cfg, halfDayAfterMin: e.target.value })} helperText="Blank = no half-day rule" /></Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={cfg.enabled === "on"} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked ? "on" : "off" })} />} label="Attendance tracking enabled" />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={saveConfig} disabled={!dirty || saving}>{dirty ? (saving ? "Saving…" : "Save policy") : "Saved"}</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>Exemptions</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Who does NOT appear in staff attendance. Exempt whole roles, then (optionally) pull
            specific people back in with “take attendance anyway”. You can also exempt individual
            employees who hold no exempt role.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                multiple options={allRoles} getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={rolesFromCodes(cfg.exemptRoleCodes)}
                onChange={(_e, v) => setCfg({ ...cfg, exemptRoleCodes: v.map((r) => r.code) })}
                renderTags={(value, getTagProps) => value.map((o, i) => <Chip label={o.name} size="small" {...getTagProps({ index: i })} />)}
                renderInput={(p) => <TextField {...p} label="Exempt roles" placeholder="Pick roles…" helperText="Everyone holding any of these roles is exempt." />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple options={allEmployees} getOptionLabel={(o) => `${o.name}${o.employeeNumber ? ` (${o.employeeNumber})` : ""}`}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={empsFromIds(cfg.includeEmployeeIds)}
                onChange={(_e, v) => setCfg({ ...cfg, includeEmployeeIds: v.map((x) => x.uuid) })}
                renderTags={(value, getTagProps) => value.map((o, i) => <Chip label={o.name} size="small" {...getTagProps({ index: i })} />)}
                renderInput={(p) => <TextField {...p} label="Take attendance anyway" placeholder="Pick employees…" helperText="Overrides the role exemption for these people." />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple options={allEmployees} getOptionLabel={(o) => `${o.name}${o.employeeNumber ? ` (${o.employeeNumber})` : ""}`}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={empsFromIds(cfg.exemptEmployeeIds)}
                onChange={(_e, v) => setCfg({ ...cfg, exemptEmployeeIds: v.map((x) => x.uuid) })}
                renderTags={(value, getTagProps) => value.map((o, i) => <Chip label={o.name} size="small" {...getTagProps({ index: i })} />)}
                renderInput={(p) => <TextField {...p} label="Also exempt (individuals)" placeholder="Pick employees…" helperText="Exempt these people even without an exempt role." />}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={saveConfig} disabled={!dirty || saving}>{dirty ? (saving ? "Saving…" : "Save") : "Saved"}</Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6">Seasonal schedules</Typography>
              <Typography variant="caption" color="text.secondary">Override the default timing for a recurring date window (e.g. Summer). A date not in any season uses the default above.</Typography>
            </Box>
            <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setSeasonDialog({ ...EMPTY_SEASON, _edit: false })}>Add season</Button>
          </Box>
          <ResponsiveDataGrid rows={seasons} columns={seasonCols} getRowId={(r) => r.uuid} autoHeight disableRowSelectionOnClick titleField="name" emptyMessage="No seasonal overrides — the default policy applies year-round." />
        </CardContent>
      </Card>

      <Dialog open={!!seasonDialog} onClose={() => !saving && setSeasonDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{seasonDialog?._edit ? "Edit season" : "Add season"}</DialogTitle>
        <DialogContent>
          {seasonDialog && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}><TextField fullWidth label="Name" value={seasonDialog.name} onChange={(e) => setSeasonDialog({ ...seasonDialog, name: e.target.value })} /></Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth label="Start month" value={Number(seasonDialog.startMonth)} onChange={(e) => setSeasonDialog({ ...seasonDialog, startMonth: e.target.value })}>
                  {MONTHS.map(([v, n]) => <MenuItem key={v} value={v}>{n}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth label="Start day" value={Number(seasonDialog.startDay)} onChange={(e) => setSeasonDialog({ ...seasonDialog, startDay: e.target.value })}>
                  {DAYS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth label="End month" value={Number(seasonDialog.endMonth)} onChange={(e) => setSeasonDialog({ ...seasonDialog, endMonth: e.target.value })}>
                  {MONTHS.map(([v, n]) => <MenuItem key={v} value={v}>{n}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth label="End day" value={Number(seasonDialog.endDay)} onChange={(e) => setSeasonDialog({ ...seasonDialog, endDay: e.target.value })}>
                  {DAYS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth type="time" label="Expected in" value={seasonDialog.expectedIn} onChange={(e) => setSeasonDialog({ ...seasonDialog, expectedIn: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><TextField fullWidth type="time" label="Expected out" value={seasonDialog.expectedOut} onChange={(e) => setSeasonDialog({ ...seasonDialog, expectedOut: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6} sm={4}><TextField fullWidth type="number" label="Grace (min)" value={seasonDialog.graceMin} onChange={(e) => setSeasonDialog({ ...seasonDialog, graceMin: e.target.value })} helperText="Lateness allowed after check-in" /></Grid>
              <Grid item xs={6} sm={4}><TextField fullWidth type="number" label="Half day if worked < (min)" value={seasonDialog.halfDayAfterMin} onChange={(e) => setSeasonDialog({ ...seasonDialog, halfDayAfterMin: e.target.value })} helperText="0 / blank = off" /></Grid>
              <Grid item xs={6} sm={4}><TextField fullWidth type="number" label="Sort order" value={seasonDialog.sortOrder} onChange={(e) => setSeasonDialog({ ...seasonDialog, sortOrder: e.target.value })} helperText="Lower checked first" /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeasonDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveSeason} disabled={saving || !seasonDialog?.name}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!del} title="Delete season" message={`Delete the "${del?.name}" season?`} onConfirm={doDelete} onCancel={() => setDel(null)} loading={saving} />
    </Box>
  );
}
