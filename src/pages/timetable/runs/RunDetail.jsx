import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Button,
  Divider,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  InfoOutlined as InfoIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { timetableService } from "../../../services/timetableService";
import GridViewer from "../components/GridViewer";
import { downloadRunExport } from "../components/exportDownload";
import { useTimetablePerms } from "../components/usePerms";

const SCORE_HELP =
  "Higher is better. The score is a weighted sum of soft goals: teacher gaps (−), honored preferences (+), even daily load (−), spread across the week (−), cohort lockstep (−). Scores are only comparable within this run (same weights).";

const fmt = (t) => (t ? new Date(t).toLocaleString() : "—");

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canMutate } = useTimetablePerms();
  const [run, setRun] = useState(null);
  const [config, setConfig] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [publishResult, setPublishResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const loadCompleted = useCallback(async (configId) => {
    const [data, cfg] = await Promise.all([
      timetableService.getCandidates(id),
      configId ? timetableService.getConfig(configId) : Promise.resolve(null),
    ]);
    setCandidates(data.candidates || []);
    setSelected((data.candidates || [])[0] || null);
    setConfig(cfg);
  }, [id]);

  const refresh = useCallback(async () => {
    try {
      const r = await timetableService.getRun(id);
      setRun(r);
      if (r.status === "completed") {
        if (pollRef.current) clearInterval(pollRef.current);
        await loadCompleted(r.configId);
      } else if (r.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      setError("Failed to load run");
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [id, loadCompleted]);

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  // Poll while still in flight.
  useEffect(() => {
    if (!run) return;
    if (["queued", "running"].includes(run.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(refresh, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [run, refresh]);

  const doPublish = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await timetableService.publish({
        candidateId: selected.uuid,
        effectiveFrom: effectiveFrom || undefined,
      });
      setPublishResult(result);
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to publish");
    } finally {
      setBusy(false);
    }
  };

  const doDownload = async (format) => {
    setError("");
    try {
      await downloadRunExport(id, format);
    } catch (err) {
      setError(
        err.response?.data?.error?.description ||
          `Could not download ${format.toUpperCase()} (it may still be rendering).`,
      );
    }
  };

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate("/timetable/runs")}
        sx={{ mb: 2 }}
      >
        Back to runs
      </Button>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Generation Run
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {!run ? (
        <CircularProgress />
      ) : (
        <>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2 }}
          >
            <Chip
              label={run.status}
              color={
                run.status === "completed"
                  ? "success"
                  : run.status === "failed"
                    ? "error"
                    : run.status === "running"
                      ? "info"
                      : "default"
              }
            />
            <Typography variant="body2">
              {run.configName || run.configId} ·{" "}
              {run.wingName || "Whole school"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
              started {fmt(run.startedAt)} · finished {fmt(run.finishedAt)}
            </Typography>
          </Stack>

          {(run.status === "queued" || run.status === "running") && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                py: 4,
                justifyContent: "center",
              }}
            >
              <CircularProgress size={28} />
              <Typography>
                Generating… (status: {run.status}). This page updates on its own;
                you can safely leave and return.
              </Typography>
            </Box>
          )}

          {run.status === "failed" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Generation failed: {run.error || "unknown error"}
            </Alert>
          )}

          {publishResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Published! {publishResult.entryCount} entries are now the active
              master.
            </Alert>
          )}

          {run.status === "completed" && candidates.length === 0 && (
            <Alert severity="warning">No candidates were produced.</Alert>
          )}

          {run.status === "completed" && candidates.length > 0 && (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Candidates</Typography>
                <Tooltip title={SCORE_HELP}>
                  <InfoIcon sx={{ fontSize: 16, color: "#8f9bb3" }} />
                </Tooltip>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 2 }}
                flexWrap="wrap"
                useFlexGap
              >
                {candidates.map((c) => (
                  <Tooltip
                    key={c.uuid}
                    title={
                      c.scoreBreakdown
                        ? Object.entries(c.scoreBreakdown)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join("  ·  ")
                        : SCORE_HELP
                    }
                  >
                    <Chip
                      label={`#${c.rank} · score ${c.score}`}
                      color={selected?.uuid === c.uuid ? "primary" : "default"}
                      onClick={() => setSelected(c)}
                      variant={selected?.uuid === c.uuid ? "filled" : "outlined"}
                    />
                  </Tooltip>
                ))}
              </Stack>

              {selected && (
                <>
                  <GridViewer config={config} entries={selected.entries || []} />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => doDownload("xlsx")}
                    >
                      Download XLS
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => doDownload("pdf")}
                    >
                      Download PDF
                    </Button>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      type="date"
                      size="small"
                      label="Effective from"
                      InputLabelProps={{ shrink: true }}
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                    />
                    {canMutate && (
                      <Button
                        variant="contained"
                        color="success"
                        disabled={busy}
                        onClick={doPublish}
                      >
                        Publish this candidate
                      </Button>
                    )}
                  </Stack>
                </>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
