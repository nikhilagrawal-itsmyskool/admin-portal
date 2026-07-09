import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Stack,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from "@mui/material";
import { timetableService } from "../../../services/timetableService";
import { AcademicYearSelect } from "../components/Selectors";
import GridViewer from "../components/GridViewer";
import MasterTimetable from "../components/MasterTimetable";
import { useAuth } from "../../../context/AuthContext";

export default function PublishedTimetable() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [scopes, setScopes] = useState([]); // [{ value, label }] of published masters
  const [scope, setScope] = useState(""); // '' = whole school, else wingId
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("individual"); // 'individual' (class/teacher) | 'master'
  const [editMode, setEditMode] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { user } = useAuth();
  // Phone = either dimension < 600px, so it stays true when rotated to landscape.
  const isPhone = useMediaQuery("(max-width:599.95px), (max-height:599.95px)");
  const isGod = (user?.roles || []).includes("god");
  // Non-god on a phone gets a stripped view: their own timetable only — no year/scope
  // selectors, no Class/Teacher/Master toggle, no edit. God keeps the full controls.
  const simpleMobile = isPhone && !isGod;
  // A logged-in teacher (an employee whose id teaches in this timetable) defaults to
  // their own By-Teacher view with their id preselected.
  const myTeacherId = user?.employeeId || user?.id || "";
  const iAmTeacher =
    !!myTeacherId &&
    (data?.entries || []).some((e) => e.teacherId === myTeacherId);

  // Which scopes (whole-school + wings) have an active published master this year.
  useEffect(() => {
    setData(null);
    if (!academicYearId) {
      setScopes([]);
      return;
    }
    timetableService
      .getPublishedList(academicYearId)
      .then((res) => {
        const opts = (res.published || []).map((p) => ({
          value: p.wingId || "",
          label: p.wingId ? p.wingName || "Wing" : "Whole school",
        }));
        setScopes(opts);
        setScope(opts.length > 0 ? opts[0].value : "");
      })
      .catch(() => setScopes([]));
  }, [academicYearId]);

  // Load the selected scope's master.
  useEffect(() => {
    if (!academicYearId || scopes.length === 0) return;
    setLoading(true);
    setError("");
    timetableService
      .getPublished(academicYearId, scope || undefined)
      .then((res) => setData(res))
      .catch((err) =>
        setError(
          err.response?.data?.error?.description ||
            "Failed to load published timetable",
        ),
      )
      .finally(() => setLoading(false));
  }, [academicYearId, scope, scopes.length, reloadKey]);

  const pt = data?.publishedTimetable;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Published Timetable
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ mb: 3, display: simpleMobile ? "none" : "flex" }}
      >
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
        />
        {scopes.length > 0 && (
          <TextField
            select
            label="Scope"
            size="small"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {scopes.map((s) => (
              <MenuItem key={s.value || "whole"} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {pt && (
          <Chip
            color="success"
            label={`Active${pt.effectiveFrom ? ` from ${pt.effectiveFrom}` : ""}`}
          />
        )}
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
      ) : scopes.length === 0 ? (
        <Alert severity="info">
          No published timetable for this year yet. Generate and publish one
          first.
        </Alert>
      ) : !pt ? (
        <Alert severity="info">No published timetable for this scope.</Alert>
      ) : (
        <Card>
          <CardContent>
            {!simpleMobile && (
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={view}
                  onChange={(e, v) => {
                    if (v) setView(v);
                  }}
                >
                  <ToggleButton value="individual">Class / Teacher</ToggleButton>
                  <ToggleButton value="master">Master</ToggleButton>
                </ToggleButtonGroup>
                {!isPhone && view === "individual" && (
                  <Chip
                    label={editMode ? "Editing — click a period" : "Edit"}
                    color={editMode ? "warning" : "default"}
                    variant={editMode ? "filled" : "outlined"}
                    onClick={() => setEditMode((v) => !v)}
                  />
                )}
              </Stack>
            )}
            {view === "individual" ? (
              <GridViewer
                config={data.config}
                entries={data.entries || []}
                editable={editMode && !isPhone}
                publishedTimetableId={pt.uuid}
                onChanged={() => setReloadKey((k) => k + 1)}
                initialMode={iAmTeacher ? "teacher" : undefined}
                initialSelectedId={iAmTeacher ? myTeacherId : undefined}
                isPhone={isPhone}
                showSelector={!simpleMobile}
              />
            ) : (
              <MasterTimetable
                config={data.config}
                entries={data.entries || []}
                title="Master Timetable"
                subtitle={
                  pt?.effectiveFrom ? `Effective from ${pt.effectiveFrom}` : ""
                }
              />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
