import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as ActivateIcon,
} from "@mui/icons-material";
import { timetableService } from "../../services/timetableService";
import { AcademicYearSelect } from "./components/Selectors";
import GridViewer from "./components/GridViewer";
import { useAuth } from "../../context/AuthContext";

// Hand-author a timetable master from scratch: pick a wing (classes) + a grid config,
// create a draft, fill it cell by cell (teacher-less labels are fine — pre-primary), then
// activate it. Lives alongside the solver flow; the published master is the same shape.
export default function ManualTimetable() {
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes("god");

  const [academicYearId, setAcademicYearId] = useState("");
  const [masters, setMasters] = useState([]);
  const [wings, setWings] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // the master currently being authored: { uuid, status, wingId, config, entries, wingClassIds }
  const [open, setOpen] = useState(null);

  // new-master dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newWing, setNewWing] = useState("");
  const [newConfig, setNewConfig] = useState("");

  const loadList = useCallback(async () => {
    if (!academicYearId) {
      setMasters([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [listRes, wingsRes, configsRes] = await Promise.all([
        timetableService.getPublishedList(academicYearId, true),
        timetableService.getWings({ academicYearId }),
        timetableService.getConfigs({ academicYearId }),
      ]);
      setMasters(listRes.published || []);
      setWings(wingsRes.wings || []);
      setConfigs(configsRes.configs || []);
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to load manual timetables",
      );
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    setOpen(null);
    loadList();
  }, [loadList]);

  const wingClassIds = (wingId) =>
    wings.find((w) => w.uuid === wingId)?.classIds || [];

  const openMaster = async (m) => {
    setBusy(true);
    setError("");
    try {
      const res = await timetableService.getPublishedById(m.uuid);
      setOpen({
        uuid: m.uuid,
        status: res.publishedTimetable?.status || m.status,
        wingId: m.wingId,
        config: res.config,
        entries: res.entries || [],
        wingClassIds: wingClassIds(m.wingId),
      });
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to open timetable");
    } finally {
      setBusy(false);
    }
  };

  const reloadOpen = async () => {
    if (!open) return;
    const res = await timetableService.getPublishedById(open.uuid);
    setOpen((o) => ({
      ...o,
      status: res.publishedTimetable?.status || o.status,
      config: res.config,
      entries: res.entries || [],
    }));
  };

  const createMaster = async () => {
    if (!newWing || !newConfig) {
      setError("Pick a wing and a grid config");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await timetableService.createManualMaster({
        academicYearId,
        wingId: newWing,
        configId: newConfig,
      });
      setNewOpen(false);
      setNewWing("");
      setNewConfig("");
      await loadList();
      await openMaster({ uuid: res.publishedTimetableId, wingId: newWing, status: "draft" });
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to create master");
    } finally {
      setBusy(false);
    }
  };

  const activate = async (id) => {
    setBusy(true);
    setError("");
    try {
      await timetableService.activateDraft(id);
      if (open?.uuid === id) await reloadOpen();
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to activate");
    } finally {
      setBusy(false);
    }
  };

  const discard = async (id) => {
    if (!window.confirm("Discard this draft timetable? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await timetableService.deleteMaster(id);
      if (open?.uuid === id) setOpen(null);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to discard");
    } finally {
      setBusy(false);
    }
  };

  const statusChip = (s) =>
    s === "active" ? (
      <Chip size="small" color="success" label="Active" />
    ) : (
      <Chip size="small" color="warning" label="Draft" />
    );

  // ---- Authoring view ----
  if (open) {
    const draft = open.status !== "active";
    return (
      <Box>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Button startIcon={<BackIcon />} onClick={() => { setOpen(null); loadList(); }}>
            Back
          </Button>
          <Typography variant="h5">Author timetable</Typography>
          {statusChip(open.status)}
          <Box sx={{ flexGrow: 1 }} />
          {draft && isGod && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ActivateIcon />}
              disabled={busy}
              onClick={() => activate(open.uuid)}
            >
              Activate (make live)
            </Button>
          )}
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        <Alert severity={draft ? "info" : "success"} sx={{ mb: 2 }}>
          {draft
            ? "Draft — not yet live. Pick a class below, click a period to add/edit its label (or subject + teacher), then Activate."
            : "This master is live. Edits apply immediately."}
        </Alert>
        {!open.config ? (
          <Alert severity="warning">This master has no grid config.</Alert>
        ) : (
          <Card>
            <CardContent>
              <GridViewer
                config={open.config}
                entries={open.entries}
                editable={isGod}
                publishedTimetableId={open.uuid}
                classIds={open.wingClassIds}
                onChanged={reloadOpen}
                showMaster={false}
              />
            </CardContent>
          </Card>
        )}
      </Box>
    );
  }

  // ---- List view ----
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Manual Timetable
      </Typography>
      <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 3 }}>
        Hand-build a timetable for a wing from a grid config — no solver. Fill periods with
        free-text labels (teacher-less is fine, e.g. pre-primary) or subject + teacher, then
        activate it as the live master.
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <AcademicYearSelect value={academicYearId} onChange={setAcademicYearId} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!academicYearId || !isGod}
          onClick={() => setNewOpen(true)}
        >
          New manual timetable
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !academicYearId ? (
        <Alert severity="info">Select an academic year.</Alert>
      ) : masters.length === 0 ? (
        <Alert severity="info">
          No timetables yet for this year. Click “New manual timetable” to build one.
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {masters.map((m) => (
            <Card key={m.uuid} variant="outlined">
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {m.wingName || "Whole school"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
                      {m.entryCount || 0} periods
                    </Typography>
                  </Box>
                  {statusChip(m.status)}
                  <Box sx={{ flexGrow: 1 }} />
                  <Button size="small" variant="outlined" onClick={() => openMaster(m)}>
                    {m.status === "active" ? "Open / edit" : "Author"}
                  </Button>
                  {m.status !== "active" && isGod && (
                    <>
                      <Tooltip title="Activate (make live)">
                        <span>
                          <IconButton
                            color="success"
                            disabled={busy}
                            onClick={() => activate(m.uuid)}
                          >
                            <ActivateIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Discard draft">
                        <span>
                          <IconButton
                            color="error"
                            disabled={busy}
                            onClick={() => discard(m.uuid)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* New-master dialog */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New manual timetable</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: "#8f9bb3", display: "block", mb: 2 }}>
            Pick the wing (which classes) and the grid config (the bell schedule). Build these
            first under Wings and Grid Config if they don’t exist yet.
          </Typography>
          <TextField
            select
            fullWidth
            label="Wing (classes)"
            value={newWing}
            onChange={(e) => setNewWing(e.target.value)}
            sx={{ mb: 2 }}
          >
            {wings.length === 0 && (
              <MenuItem value="" disabled>
                No wings — create one under Wings
              </MenuItem>
            )}
            {wings.map((w) => (
              <MenuItem key={w.uuid} value={w.uuid}>
                {w.name} ({(w.classIds || []).length} classes)
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Grid config (bell schedule)"
            value={newConfig}
            onChange={(e) => setNewConfig(e.target.value)}
          >
            {configs.length === 0 && (
              <MenuItem value="" disabled>
                No configs — create one under Grid Config
              </MenuItem>
            )}
            {configs.map((c) => (
              <MenuItem key={c.uuid} value={c.uuid}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={createMaster} disabled={busy || !newWing || !newConfig}>
            {busy ? "Creating…" : "Create & author"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
