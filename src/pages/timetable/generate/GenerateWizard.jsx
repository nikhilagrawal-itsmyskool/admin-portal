import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Alert,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { timetableService } from "../../../services/timetableService";
import GridViewer from "../components/GridViewer";
import { downloadRunExport } from "../components/exportDownload";
import { useTimetablePerms } from "../components/usePerms";

const PRESETS = {
  balanced: { label: "Balanced (defaults)", weights: undefined },
  gaps: {
    label: "Fewer teacher gaps",
    weights: {
      minimizeTeacherGaps: 10,
      honorSoftPreferences: 5,
      evenDailyLoad: 3,
      spreadAcrossWeek: 3,
    },
  },
  prefs: {
    label: "Honor preferences",
    weights: {
      minimizeTeacherGaps: 3,
      honorSoftPreferences: 12,
      evenDailyLoad: 3,
      spreadAcrossWeek: 3,
    },
  },
  even: {
    label: "Even daily load",
    weights: {
      minimizeTeacherGaps: 3,
      honorSoftPreferences: 5,
      evenDailyLoad: 10,
      spreadAcrossWeek: 5,
    },
  },
};
const STEPS = ["Select config", "Feasibility", "Options", "Candidates"];

export default function GenerateWizard() {
  const { canMutate } = useTimetablePerms();
  const [activeStep, setActiveStep] = useState(0);
  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState("");
  const [wings, setWings] = useState([]);
  const [wingId, setWingId] = useState("");
  const [fullConfig, setFullConfig] = useState(null);
  const [feas, setFeas] = useState(null);
  const [preset, setPreset] = useState("balanced");
  const [weights, setWeights] = useState({
    minimizeTeacherGaps: 5,
    honorSoftPreferences: 8,
    evenDailyLoad: 3,
    spreadAcrossWeek: 4,
  });
  const [numCandidates, setNumCandidates] = useState(3);
  const [runId, setRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCand, setSelectedCand] = useState(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [publishResult, setPublishResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    // Only locked, active configs can be generated (the backend enforces this too).
    timetableService
      .getConfigs()
      .then((d) =>
        setConfigs(
          (d.configs || []).filter((c) => c.status === "active" && c.lockedAt),
        ),
      )
      .catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Load wings for the chosen config's academic year; reset scope when config changes.
  useEffect(() => {
    setWingId("");
    const cfg = configs.find((c) => c.uuid === configId);
    if (!cfg?.academicYearId) {
      setWings([]);
      return;
    }
    timetableService
      .getWings({ academicYearId: cfg.academicYearId })
      .then((d) => setWings(d.wings || []))
      .catch(() => setWings([]));
  }, [configId, configs]);

  const runFeasibility = async () => {
    setBusy(true);
    setError("");
    try {
      const [report, cfg] = await Promise.all([
        timetableService.feasibility({ configId, wingId: wingId || undefined }),
        timetableService.getConfig(configId),
      ]);
      setFeas(report);
      setFullConfig(cfg);
      setActiveStep(1);
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Feasibility check failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const startGenerate = async () => {
    setBusy(true);
    setError("");
    try {
      const objectiveWeights =
        preset === "advanced" ? weights : PRESETS[preset].weights;
      const { runId: id } = await timetableService.generate({
        configId,
        objectiveWeights,
        numCandidates: Number(numCandidates),
        wingId: wingId || undefined,
      });
      setRunId(id);
      setRunStatus("queued");
      setActiveStep(3);
      poll(id);
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to start generation",
      );
      setBusy(false);
    }
  };

  const poll = (id) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const run = await timetableService.getRun(id);
        setRunStatus(run.status);
        if (run.status === "completed" || run.status === "failed") {
          clearInterval(pollRef.current);
          setBusy(false);
          if (run.status === "completed") {
            const data = await timetableService.getCandidates(id);
            setCandidates(data.candidates || []);
            setSelectedCand((data.candidates || [])[0] || null);
          } else {
            setError(`Generation failed: ${run.error || "unknown error"}`);
          }
        }
      } catch {
        clearInterval(pollRef.current);
        setBusy(false);
        setError("Lost connection while polling the run");
      }
    }, 1500);
  };

  const doPublish = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await timetableService.publish({
        candidateId: selectedCand.uuid,
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
      await downloadRunExport(runId, format);
    } catch (err) {
      setError(
        err.response?.data?.error?.description ||
          `Could not download ${format.toUpperCase()} (it may still be rendering).`,
      );
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Generate Timetable
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((s) => (
          <Step key={s}>
            <StepLabel>{s}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Step 0: select config */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Stack
              direction="row"
              spacing={2}
              alignItems="flex-start"
              flexWrap="wrap"
            >
              <TextField
                select
                label="Locked Config"
                value={configId}
                onChange={(e) => setConfigId(e.target.value)}
                sx={{ minWidth: 280, flex: 1, maxWidth: 400 }}
                helperText="Only locked configs can be generated — lock one in Grid Config."
              >
                {configs.length === 0 && (
                  <MenuItem value="" disabled>
                    No locked configs — lock one in Grid Config first
                  </MenuItem>
                )}
                {configs.map((c) => (
                  <MenuItem key={c.uuid} value={c.uuid}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Scope"
                value={wingId}
                onChange={(e) => setWingId(e.target.value)}
                sx={{ minWidth: 280, flex: 1, maxWidth: 400 }}
                helperText="Generate the whole school, or just one wing's classes."
              >
                <MenuItem value="">Whole school</MenuItem>
                {wings.map((w) => (
                  <MenuItem key={w.uuid} value={w.uuid}>
                    {w.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                disabled={!configId || busy}
                onClick={runFeasibility}
              >
                {busy ? "Checking..." : "Run Feasibility"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 1: feasibility */}
      {activeStep === 1 && feas && (
        <Card>
          <CardContent>
            <Alert
              severity={feas.feasible ? "success" : "error"}
              sx={{ mb: 2 }}
            >
              {feas.feasible
                ? "Feasible — ready to generate."
                : "Not feasible — fix the issues below."}
            </Alert>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {feas.lessonCount} lessons across {feas.classCount} classes.
            </Typography>
            {feas.issues?.length > 0 && (
              <>
                <Typography variant="subtitle2" color="error">
                  Issues
                </Typography>
                <List dense>
                  {feas.issues.map((i, n) => (
                    <ListItem key={n}>
                      <ListItemText primary={i} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            {feas.warnings?.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ color: "warning.main" }}>
                  Warnings
                </Typography>
                <List dense>
                  {feas.warnings.map((w, n) => (
                    <ListItem key={n}>
                      <ListItemText primary={w} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button onClick={() => setActiveStep(0)}>Back</Button>
              <Button
                variant="contained"
                disabled={!feas.feasible}
                onClick={() => setActiveStep(2)}
              >
                Continue
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Step 2: options */}
      {activeStep === 2 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Optimization preset
            </Typography>
            <RadioGroup
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {Object.entries(PRESETS).map(([k, v]) => (
                <FormControlLabel
                  key={k}
                  value={k}
                  control={<Radio />}
                  label={v.label}
                />
              ))}
              <FormControlLabel
                value="advanced"
                control={<Radio />}
                label="Advanced (custom weights)"
              />
            </RadioGroup>

            {preset === "advanced" && (
              <Accordion defaultExpanded sx={{ mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  Custom weights
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {Object.keys(weights).map((k) => (
                      <TextField
                        key={k}
                        type="number"
                        size="small"
                        label={k}
                        value={weights[k]}
                        onChange={(e) =>
                          setWeights({
                            ...weights,
                            [k]: Number(e.target.value),
                          })
                        }
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            <TextField
              type="number"
              size="small"
              label="Number of candidates"
              value={numCandidates}
              onChange={(e) => setNumCandidates(e.target.value)}
              sx={{ mt: 2, width: 220 }}
              inputProps={{ min: 1, max: 5 }}
            />

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => setActiveStep(1)}>Back</Button>
              {canMutate && (
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={startGenerate}
                >
                  Generate
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Step 3: candidates */}
      {activeStep === 3 && (
        <Card>
          <CardContent>
            {runId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This run is saved. You can leave this page and reopen it any time
                from{" "}
                <RouterLink to={`/timetable/runs/${runId}`}>
                  Generation Runs
                </RouterLink>
                .
              </Alert>
            )}
            {(runStatus === "queued" || runStatus === "running") && (
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
                  Generating… (status: {runStatus}). The worker must be running.
                </Typography>
              </Box>
            )}

            {publishResult && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Published! {publishResult.entryCount} entries are now the active
                master.
              </Alert>
            )}

            {runStatus === "completed" && candidates.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Candidates
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2 }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  {candidates.map((c) => (
                    <Chip
                      key={c.uuid}
                      label={`#${c.rank} · score ${c.score}`}
                      color={
                        selectedCand?.uuid === c.uuid ? "primary" : "default"
                      }
                      onClick={() => setSelectedCand(c)}
                      variant={
                        selectedCand?.uuid === c.uuid ? "filled" : "outlined"
                      }
                    />
                  ))}
                </Stack>

                {selectedCand && (
                  <>
                    <GridViewer
                      config={fullConfig}
                      entries={selectedCand.entries || []}
                    />
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

            {runStatus === "completed" && candidates.length === 0 && (
              <Alert severity="warning">No candidates were produced.</Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
