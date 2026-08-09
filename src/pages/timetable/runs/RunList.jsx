import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  TextField,
  MenuItem,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { timetableService } from "../../../services/timetableService";
import { AcademicYearSelect } from "../components/Selectors";
import { fmtDateTime as fmt } from "../../../utils/date";

const STATUS_COLOR = {
  queued: "default",
  running: "info",
  completed: "success",
  failed: "error",
  stalled: "warning",
};

// A run is "stalled" when it claims to be running but its worker heartbeat is old —
// usually the worker isn't running. Surfaced so a stuck run isn't a silent mystery.
const STALE_MS = 2 * 60 * 1000;
function effectiveStatus(run) {
  if (run.status === "running" && run.heartbeatAt) {
    if (Date.now() - new Date(run.heartbeatAt).getTime() > STALE_MS)
      return "stalled";
  }
  return run.status;
}


export default function RunList() {
  const navigate = useNavigate();
  const [academicYearId, setAcademicYearId] = useState("");
  const [status, setStatus] = useState("");
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    try {
      const data = await timetableService.getRuns({
        academicYearId,
        status: status || undefined,
      });
      setRuns(data.runs || []);
    } catch {
      setError("Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [academicYearId, status]);
  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh while any run is still in flight (queued/running).
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const inFlight = runs.some((r) => ["queued", "running"].includes(r.status));
    if (inFlight) pollRef.current = setInterval(load, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runs, load]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Generation Runs
      </Typography>
      <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 3 }}>
        Every timetable generation you start is saved here — so you can leave the
        page and come back to its result, or review and publish an earlier run.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <AcademicYearSelect value={academicYearId} onChange={setAcademicYearId} />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="queued">Queued</MenuItem>
          <MenuItem value="running">Running</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
        </TextField>
        <Button
          startIcon={<RefreshIcon />}
          onClick={load}
          disabled={!academicYearId || loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading && runs.length === 0 ? (
        <CircularProgress />
      ) : runs.length === 0 ? (
        <Typography sx={{ color: "#8f9bb3" }}>
          No generation runs yet for this year.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Config</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell align="right">Candidates</TableCell>
              <TableCell align="right">Best score</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Finished</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((r) => {
              const st = effectiveStatus(r);
              return (
                <TableRow
                  key={r.uuid}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/timetable/runs/${r.uuid}`)}
                >
                  <TableCell>
                    <Chip
                      size="small"
                      label={st}
                      color={STATUS_COLOR[st] || "default"}
                    />
                    {st === "failed" && r.error && (
                      <Tooltip title={r.error}>
                        <Typography
                          variant="caption"
                          sx={{ ml: 1, color: "error.main" }}
                        >
                          (why?)
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{r.configName || r.configId}</TableCell>
                  <TableCell>{r.wingName || "Whole school"}</TableCell>
                  <TableCell align="right">{r.candidateCount ?? 0}</TableCell>
                  <TableCell align="right">
                    {r.bestScore != null ? r.bestScore : "—"}
                  </TableCell>
                  <TableCell>{fmt(r.startedAt)}</TableCell>
                  <TableCell>{fmt(r.finishedAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
