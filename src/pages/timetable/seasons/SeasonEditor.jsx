import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  Stack,
  Alert,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Chip,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  ContentCopy as PrefillIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import { useTimetablePerms } from "../components/usePerms";

const DAYS = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday" };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
// "09:15:00" -> "09:15" for a time input; blank -> "".
const toInput = (t) => (t ? String(t).slice(0, 5) : "");
// "09:15" -> "09:15:00" for the API; blank -> null.
const toApi = (v) => (v && v.length >= 4 ? `${v}:00`.slice(0, 8) : null);
const errMsg = (err, fallback) => err?.response?.data?.error?.description || fallback;

export default function SeasonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canMutate } = useTimetablePerms();

  const [season, setSeason] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState("");
  const [config, setConfig] = useState(null);
  const [overrides, setOverrides] = useState({}); // timeSlotId -> { startTime, endTime } in HH:MM
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Load the season (name + existing slot times) and the config list.
  const loadSeason = useCallback(async () => {
    const s = await timetableService.getSeason(id);
    setSeason(s);
    const map = {};
    for (const st of s.slotTimes || []) {
      map[st.timeSlotId] = { startTime: toInput(st.startTime), endTime: toInput(st.endTime) };
    }
    setOverrides(map);
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const [, cfgs] = await Promise.all([
          loadSeason(),
          timetableService.getConfigs(),
        ]);
        setConfigs(cfgs.configs || []);
      } catch {
        setError("Failed to load season");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSeason]);

  // Load the chosen config's grid (days + slots).
  useEffect(() => {
    if (!configId) {
      setConfig(null);
      return;
    }
    let active = true;
    timetableService
      .getConfig(configId)
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch(() => setError("Failed to load config"));
    return () => {
      active = false;
    };
  }, [configId]);

  const setSlot = (slotId, field, value) => {
    setOverrides((prev) => ({
      ...prev,
      [slotId]: { ...(prev[slotId] || {}), [field]: value },
    }));
  };

  const prefill = async () => {
    if (!configId) return;
    setBusy(true);
    setError("");
    try {
      await timetableService.prefillSeason(id, { configId });
      await loadSeason();
      setToast("Filled from base times");
    } catch (err) {
      setError(errMsg(err, "Failed to prefill"));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!config) return;
    // Send every slot of the selected config so cleared cells become null (base).
    const slotTimes = [];
    for (const day of config.days || []) {
      for (const slot of day.slots || []) {
        const ov = overrides[slot.uuid] || {};
        slotTimes.push({
          timeSlotId: slot.uuid,
          startTime: toApi(ov.startTime),
          endTime: toApi(ov.endTime),
        });
      }
    }
    setBusy(true);
    setError("");
    try {
      await timetableService.setSeasonSlotTimes(id, { slotTimes });
      await loadSeason();
      setToast("Bell times saved");
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const days = [...(config?.days || [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate("/timetable/seasons")} sx={{ mb: 1 }}>
        Back to Seasons
      </Button>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {season?.name || "Season"} — Bell Times
      </Typography>
      <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 3 }}>
        Set this season's start/end time for each period of a grid. Leave a cell
        blank to use the period's base time. Times shift only — the structure is
        set in the Grid Config.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Grid Config"
          size="small"
          value={configId}
          onChange={(e) => setConfigId(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          {configs.length === 0 && (
            <MenuItem value="" disabled>
              No configs
            </MenuItem>
          )}
          {configs.map((c) => (
            <MenuItem key={c.uuid} value={c.uuid}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        {canMutate && config && (
          <>
            <Button variant="outlined" startIcon={<PrefillIcon />} disabled={busy} onClick={prefill}>
              Fill from base
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={busy} onClick={save}>
              Save
            </Button>
          </>
        )}
      </Stack>

      {!config ? (
        <Typography sx={{ color: "#8f9bb3" }}>
          Pick a grid config to edit its bell times for this season.
        </Typography>
      ) : (
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Base</TableCell>
                <TableCell>Season start</TableCell>
                <TableCell>Season end</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {days.map((day) => {
                const slots = [...(day.slots || [])].sort((a, b) => a.sequence - b.sequence);
                return (
                  <React.Fragment key={day.uuid}>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ backgroundColor: "#f7f9fc", fontWeight: 600 }}>
                        {DAYS[day.dayOfWeek] || `Day ${day.dayOfWeek}`}
                      </TableCell>
                    </TableRow>
                    {slots.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ color: "#8f9bb3" }}>
                          No slots on this day.
                        </TableCell>
                      </TableRow>
                    )}
                    {slots.map((slot) => {
                      const ov = overrides[slot.uuid] || {};
                      const base =
                        slot.startTime || slot.endTime
                          ? `${toInput(slot.startTime) || "—"}–${toInput(slot.endTime) || "—"}`
                          : "—";
                      return (
                        <TableRow key={slot.uuid}>
                          <TableCell>
                            {slot.label || `Seq ${slot.sequence}`}
                          </TableCell>
                          <TableCell>
                            <Chip label={cap(slot.slotType)} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ color: "#8f9bb3", whiteSpace: "nowrap" }}>{base}</TableCell>
                          <TableCell>
                            <TextField
                              type="time"
                              size="small"
                              value={ov.startTime || ""}
                              onChange={(e) => setSlot(slot.uuid, "startTime", e.target.value)}
                              disabled={!canMutate}
                              sx={{ width: 130 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="time"
                              size="small"
                              value={ov.endTime || ""}
                              onChange={(e) => setSlot(slot.uuid, "endTime", e.target.value)}
                              disabled={!canMutate}
                              sx={{ width: 130 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast("")}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
