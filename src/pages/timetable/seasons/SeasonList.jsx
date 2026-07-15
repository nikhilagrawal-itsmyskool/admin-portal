import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
const errMsg = (err, fallback) =>
  err?.response?.data?.error?.description || fallback;

export default function SeasonList() {
  const { canMutate } = useTimetablePerms();
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState([]);
  const [activations, setActivations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seasonDialog, setSeasonDialog] = useState({ open: false, season: null });
  const [actDialog, setActDialog] = useState({ open: false, activation: null });
  const [archive, setArchive] = useState({ open: false, season: null });
  const [delAct, setDelAct] = useState({ open: false, activation: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        timetableService.getSeasons(),
        timetableService.getSeasonActivations(),
      ]);
      setSeasons(s.seasons || []);
      setActivations(a.activations || []);
    } catch {
      setError("Failed to load seasons");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const seasonName = (id) => seasons.find((s) => s.uuid === id)?.name || id;

  const doArchive = async () => {
    try {
      await timetableService.deleteSeason(archive.season.uuid);
      setArchive({ open: false, season: null });
      load();
    } catch (err) {
      setError(errMsg(err, "Failed to archive"));
      setArchive({ open: false, season: null });
    }
  };

  const doDeleteActivation = async () => {
    try {
      await timetableService.deleteSeasonActivation(delAct.activation.uuid);
      setDelAct({ open: false, activation: null });
      load();
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
      setDelAct({ open: false, activation: null });
    }
  };

  const activeSeasons = seasons.filter((s) => s.status !== "archived");

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Seasons &amp; Bell Timings
      </Typography>
      <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 3 }}>
        The grid structure stays the same all year; a season only changes the clock
        times of the periods (e.g. Summer vs Winter). An activation window decides
        which season is in effect on a given date. These times drive the student
        app's "what's happening now" view.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {/* ---- Seasons ---- */}
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Seasons
            </Typography>
            {canMutate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setSeasonDialog({ open: true, season: null })}
              >
                Add Season
              </Button>
            )}
          </Stack>

          <Stack spacing={2} sx={{ mb: 4 }}>
            {seasons.length === 0 && (
              <Typography sx={{ color: "#8f9bb3" }}>No seasons yet.</Typography>
            )}
            {seasons.map((s) => (
              <Card key={s.uuid}>
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="h6">{s.name}</Typography>
                    {s.status === "archived" && (
                      <Chip label="Archived" size="small" />
                    )}
                  </Stack>
                  <Box>
                    <Tooltip title="Edit bell times">
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/timetable/seasons/${s.uuid}`)}
                      >
                        <ScheduleIcon />
                      </IconButton>
                    </Tooltip>
                    {canMutate && s.status !== "archived" && (
                      <>
                        <Tooltip title="Rename">
                          <IconButton
                            onClick={() => setSeasonDialog({ open: true, season: s })}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Archive">
                          <IconButton
                            color="error"
                            onClick={() => setArchive({ open: true, season: s })}
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* ---- Activation windows ---- */}
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Activation Calendar
            </Typography>
            {canMutate && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={activeSeasons.length === 0}
                onClick={() => setActDialog({ open: true, activation: null })}
              >
                Add Window
              </Button>
            )}
          </Stack>
          <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 2 }}>
            Windows must not overlap. Leave "To" empty for an open-ended window that
            stays active until a later one supersedes it. Dates with no window fall
            back to each period's base time.
          </Typography>

          <Card>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Season</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  {canMutate && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {activations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canMutate ? 4 : 3} sx={{ color: "#8f9bb3" }}>
                      No activation windows yet.
                    </TableCell>
                  </TableRow>
                )}
                {activations.map((a) => (
                  <TableRow key={a.uuid}>
                    <TableCell>{a.seasonName || seasonName(a.seasonId)}</TableCell>
                    <TableCell>{fmtDate(a.effectiveFrom)}</TableCell>
                    <TableCell>{a.effectiveTo ? fmtDate(a.effectiveTo) : "Open-ended"}</TableCell>
                    {canMutate && (
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => setActDialog({ open: true, activation: a })}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDelAct({ open: true, activation: a })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {seasonDialog.open && (
        <SeasonDialog
          season={seasonDialog.season}
          onClose={() => setSeasonDialog({ open: false, season: null })}
          onSaved={load}
        />
      )}
      {actDialog.open && (
        <ActivationDialog
          activation={actDialog.activation}
          seasons={activeSeasons}
          onClose={() => setActDialog({ open: false, activation: null })}
          onSaved={load}
        />
      )}
      <ConfirmDialog
        open={archive.open}
        title="Archive Season"
        message={`Archive "${archive.season?.name}"? Its activation windows stop taking effect.`}
        onConfirm={doArchive}
        onCancel={() => setArchive({ open: false, season: null })}
      />
      <ConfirmDialog
        open={delAct.open}
        title="Delete Window"
        message="Delete this activation window?"
        onConfirm={doDeleteActivation}
        onCancel={() => setDelAct({ open: false, activation: null })}
      />
    </Box>
  );
}

function SeasonDialog({ season, onClose, onSaved }) {
  const isEdit = Boolean(season?.uuid);
  const [name, setName] = useState(season?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit)
        await timetableService.updateSeason(season.uuid, { name: name.trim() });
      else await timetableService.createSeason({ name: name.trim() });
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Rename Season" : "Add Season"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label="Season name"
          placeholder="e.g. Summer, Winter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ActivationDialog({ activation, seasons, onClose, onSaved }) {
  const isEdit = Boolean(activation?.uuid);
  const [seasonId, setSeasonId] = useState(activation?.seasonId || "");
  const [from, setFrom] = useState(activation?.effectiveFrom ? String(activation.effectiveFrom).slice(0, 10) : "");
  const [to, setTo] = useState(activation?.effectiveTo ? String(activation.effectiveTo).slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!seasonId || !from) {
      setError("Season and From date are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit)
        await timetableService.updateSeasonActivation(activation.uuid, {
          effectiveFrom: from,
          effectiveTo: to || null,
        });
      else
        await timetableService.createSeasonActivation({
          seasonId,
          effectiveFrom: from,
          effectiveTo: to || null,
        });
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Edit Window" : "Add Activation Window"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          select
          fullWidth
          label="Season"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          disabled={isEdit}
          sx={{ mt: 1, mb: 2 }}
        >
          {seasons.map((s) => (
            <MenuItem key={s.uuid} value={s.uuid}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="date"
          label="To (optional)"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          helperText="Leave empty for open-ended"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
