import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Chip,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import { classService } from "../../../services/classService";
import { AcademicYearSelect } from "../components/Selectors";
import BlockRulesEditor from "../components/BlockRulesEditor";
import TeacherName from "../components/TeacherName";
import EmployeeSearchDialog from "../../../components/common/EmployeeSearchDialog";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

const subjectLabel = (s) => (s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : "");
const blockSummary = (br) =>
  !br?.blocks?.length
    ? "singles"
    : br.blocks.map((b) => `${b.size}×${b.count}`).join(", ");

// A cohort (class_group) is a set of co-scheduled classes — a composite class like
// XI-A whose streams study some subjects together. Shared subjects and cross-stream
// option blocks are entered ONCE here, on the cohort; stream-specific subjects stay
// on each member class (in Class Setup).
export default function ClassGroupList() {
  const { canMutate } = useTimetablePerms();
  const [academicYearId, setAcademicYearId] = useState("");
  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, group: null });
  const [del, setDel] = useState({ open: false, group: null });

  useEffect(() => {
    classService
      .getClasses()
      .then((d) => setClasses(Array.isArray(d) ? d : d.classes || []))
      .catch(() => {});
    timetableService
      .getSubjects()
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    try {
      const data = await timetableService.getClassGroups({ academicYearId });
      setGroups(data.classGroups || []);
    } catch {
      setError("Failed to load class groups");
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);
  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    try {
      await timetableService.deleteClassGroup(del.group.uuid);
      setDel({ open: false, group: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to delete");
      setDel({ open: false, group: null });
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Class Groups (Cohorts)
      </Typography>
      <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 3 }}>
        A cohort is a set of classes that are timetabled together — a composite
        class like XI-A (Science + Commerce). Enter the subjects/bands they study
        TOGETHER here; each stream's own subjects stay on its class in Class Setup.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <AcademicYearSelect value={academicYearId} onChange={setAcademicYearId} />
        {canMutate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!academicYearId}
            onClick={() => setDialog({ open: true, group: null })}
          >
            Add Cohort
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={2}>
          {groups.length === 0 && (
            <Typography sx={{ color: "#8f9bb3" }}>
              No cohorts yet for this year.
            </Typography>
          )}
          {groups.map((group) => (
            <Accordion key={group.uuid} defaultExpanded={groups.length === 1}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    pr: 2,
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{group.name}</Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 0.5 }}
                    >
                      {(group.classes || []).length === 0 && (
                        <Typography variant="body2" sx={{ color: "#8f9bb3" }}>
                          No classes.
                        </Typography>
                      )}
                      {(group.classes || []).map((c) => (
                        <Chip
                          key={c.classId}
                          label={c.className || c.classId}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                  {canMutate && (
                    <Box onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit cohort">
                        <IconButton
                          color="primary"
                          onClick={() => setDialog({ open: true, group })}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete cohort">
                        <IconButton
                          color="error"
                          onClick={() => setDel({ open: true, group })}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <CohortBands
                  group={group}
                  academicYearId={academicYearId}
                  subjects={subjects}
                  canMutate={canMutate}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      {dialog.open && (
        <ClassGroupDialog
          academicYearId={academicYearId}
          classes={classes}
          group={dialog.group}
          onClose={() => setDialog({ open: false, group: null })}
          onSaved={load}
        />
      )}
      <ConfirmDialog
        open={del.open}
        title="Delete Cohort"
        message={`Delete cohort "${del.group?.name}"? Its member classes are kept; only the grouping and its shared bands are removed.`}
        onConfirm={handleDelete}
        onCancel={() => setDel({ open: false, group: null })}
      />
    </Box>
  );
}

function ClassGroupDialog({ academicYearId, classes, group, onClose, onSaved }) {
  const isEdit = Boolean(group?.uuid);
  const [name, setName] = useState(group?.name || "");
  const [code, setCode] = useState(group?.code || "");
  const [selected, setSelected] = useState(
    (group?.classIds || [])
      .map((id) => classes.find((c) => c.uuid === id))
      .filter(Boolean),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const classIds = selected.map((c) => c.uuid);
    if (classIds.length < 2) {
      setError("A cohort needs at least 2 member classes");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit)
        await timetableService.updateClassGroup(group.uuid, {
          name: name.trim(),
          code: code.trim() || undefined,
          classIds,
        });
      else
        await timetableService.createClassGroup({
          academicYearId,
          name: name.trim(),
          code: code.trim() || undefined,
          classIds,
        });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Cohort" : "Add Cohort"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label="Cohort name (e.g. XI-A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          fullWidth
          label="Code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Autocomplete
          multiple
          options={classes}
          value={selected}
          onChange={(e, v) => setSelected(v)}
          getOptionLabel={(o) => o.name || ""}
          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Member classes (the streams)"
              placeholder="Add the stream classes"
            />
          )}
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

// The shared subjects/bands of a cohort: elective bands scoped to the class_group
// (a band-of-one = a subject the whole cohort studies together; a multi-offering
// band = cross-stream parallel rooms, any student opts one).
function CohortBands({ group, academicYearId, subjects, canMutate }) {
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bandDialog, setBandDialog] = useState(false);
  const [editBand, setEditBand] = useState(null);
  const [delBand, setDelBand] = useState({ open: false, band: null });
  const [offeringFor, setOfferingFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await timetableService.getElectiveBands({
        classGroupId: group.uuid,
        academicYearId,
      });
      setBands(data.bands || []);
    } catch {
      setError("Failed to load bands");
    } finally {
      setLoading(false);
    }
  }, [group.uuid, academicYearId]);
  useEffect(() => {
    load();
  }, [load]);

  const removeOffering = async (offeringId) => {
    try {
      await timetableService.deleteElectiveOffering(offeringId);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to remove offering");
    }
  };
  const deleteBand = async () => {
    try {
      await timetableService.deleteElectiveBand(delBand.band.uuid);
      setDelBand({ open: false, band: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to delete band");
      setDelBand({ open: false, band: null });
    }
  };

  if (loading) return <CircularProgress size={24} />;
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2">Shared subjects & bands</Typography>
        {canMutate && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setBandDialog(true)}
          >
            Add band
          </Button>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
        One offering = a subject the whole cohort studies together (e.g. English).
        Several offerings = parallel rooms; any student of any stream picks one.
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {bands.length === 0 && (
          <Typography variant="body2" sx={{ color: "#8f9bb3" }}>
            No shared bands yet.
          </Typography>
        )}
        {bands.map((band) => (
          <Card key={band.uuid} variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{band.name}</Typography>
                  <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
                    {band.periodsPerWeek} periods/week · blocks:{" "}
                    {blockSummary(band.blockRules)}
                  </Typography>
                </Box>
                {canMutate && (
                  <Box>
                    <Tooltip title="Add room/subject">
                      <IconButton color="primary" onClick={() => setOfferingFor(band)}>
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit band">
                      <IconButton onClick={() => setEditBand(band)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete band">
                      <IconButton
                        color="error"
                        onClick={() => setDelBand({ open: true, band })}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(band.offerings || []).length === 0 && (
                  <Typography variant="body2" sx={{ color: "#8f9bb3" }}>
                    No subjects yet.
                  </Typography>
                )}
                {(band.offerings || []).map((o) => {
                  const stream = o.classId
                    ? (group.classes || []).find((c) => c.classId === o.classId)
                    : null;
                  return (
                    <Chip
                      key={o.uuid}
                      label={
                        <span>
                          {stream ? `[${stream.className || o.classId}] ` : ""}
                          {o.subjectName || o.subjectId} —{" "}
                          <TeacherName id={o.teacherId} />
                          {o.periodShare ? ` (${o.periodShare})` : ""}
                        </span>
                      }
                      onDelete={canMutate ? () => removeOffering(o.uuid) : undefined}
                      variant="outlined"
                    />
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {bandDialog && (
        <CohortBandDialog
          classGroupId={group.uuid}
          academicYearId={academicYearId}
          onClose={() => setBandDialog(false)}
          onSaved={load}
        />
      )}
      {editBand && (
        <CohortBandDialog
          classGroupId={group.uuid}
          academicYearId={academicYearId}
          band={editBand}
          onClose={() => setEditBand(null)}
          onSaved={load}
        />
      )}
      {offeringFor && (
        <CohortOfferingDialog
          band={offeringFor}
          subjects={subjects}
          members={group.classes || []}
          onClose={() => setOfferingFor(null)}
          onSaved={() => {
            setOfferingFor(null);
            load();
          }}
        />
      )}
      <ConfirmDialog
        open={delBand.open}
        title="Delete Band"
        message={`Delete band "${delBand.band?.name}" and its offerings?`}
        onConfirm={deleteBand}
        onCancel={() => setDelBand({ open: false, band: null })}
      />
    </Box>
  );
}

function CohortBandDialog({ classGroupId, academicYearId, band, onClose, onSaved }) {
  const isEdit = Boolean(band?.uuid);
  const [name, setName] = useState(band?.name || "");
  const [periodsPerWeek, setPeriodsPerWeek] = useState(band?.periodsPerWeek || 1);
  const [blockRules, setBlockRules] = useState(band?.blockRules || undefined);
  // parallel = the two streams run their OWN subjects at the same block (co_schedule=false);
  // default is "together" (pooled). Existing bands: coSchedule===false means parallel.
  const [parallel, setParallel] = useState(band?.coSchedule === false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const ppw = Number(periodsPerWeek);
    if (!Number.isInteger(ppw) || ppw < 1) {
      setError("Periods/week must be a positive integer");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit)
        await timetableService.updateElectiveBand(band.uuid, {
          name: name.trim(),
          periodsPerWeek: ppw,
          blockRules,
          coSchedule: !parallel,
        });
      else
        await timetableService.createElectiveBand({
          academicYearId,
          classGroupId,
          name: name.trim(),
          periodsPerWeek: ppw,
          blockRules,
          coSchedule: !parallel,
        });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.description ||
          `Failed to ${isEdit ? "update" : "create"} band`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Shared Band" : "Add Shared Band"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
          For a single shared subject (e.g. English 8/wk), make a band and add ONE
          offering. For parallel rooms (e.g. Maths/Bio/Accounting), add several.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Band name (e.g. English, or Maths/Bio/Acc)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 2, mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={parallel}
              onChange={(e) => setParallel(e.target.checked)}
            />
          }
          label="Parallel streams (each stream studies its own subjects)"
        />
        <Typography variant="caption" sx={{ color: "#8f9bb3", display: "block", mb: 2 }}>
          {parallel
            ? "Parallel: each stream runs its OWN offerings at this block (e.g. Science: Bio/Maths, Commerce: Accountancy). Kept aligned where possible, but they may differ — set each offering's stream below."
            : "Together (default): one pooled block — all streams share the same offerings and slots (students regroup by choice)."}
        </Typography>
        <TextField
          fullWidth
          type="number"
          label="Periods per week (combined)"
          value={periodsPerWeek}
          onChange={(e) => setPeriodsPerWeek(e.target.value)}
          sx={{ mb: 2 }}
        />
        <BlockRulesEditor
          value={blockRules}
          periodsPerWeek={periodsPerWeek}
          onChange={setBlockRules}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CohortOfferingDialog({ band, subjects, members = [], onClose, onSaved }) {
  const parallel = band?.coSchedule === false;
  const [subjectId, setSubjectId] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [share, setShare] = useState("");
  const [classId, setClassId] = useState(""); // "" = shared by all streams
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!subjectId) {
      setError("Pick a subject");
      return;
    }
    if (!teacher?.uuid) {
      setError("Pick a teacher");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await timetableService.addElectiveOffering(band.uuid, {
        subjectId,
        teacherId: teacher.uuid,
        periodShare: share === "" ? undefined : Number(share),
        classId: parallel && classId ? classId : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to add offering");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Subject to {band.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <Autocomplete
          sx={{ mt: 1, mb: 2 }}
          options={subjects}
          getOptionLabel={(o) => subjectLabel(o)}
          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
          value={subjects.find((s) => s.uuid === subjectId) || null}
          onChange={(e, v) => setSubjectId(v?.uuid || "")}
          renderInput={(params) => <TextField {...params} label="Subject" />}
        />
        {parallel && (
          <TextField
            select
            fullWidth
            label="Which stream?"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            helperText="Whose subject is this? Pick a stream, or 'Shared' if both streams study it."
            sx={{ mb: 2 }}
          >
            <MenuItem value="">Shared (all streams)</MenuItem>
            {members.map((m) => (
              <MenuItem key={m.classId} value={m.classId}>
                {m.className || m.classId}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">Teacher:</Typography>
          <Chip label={teacher?.name || "none"} />
          <Button size="small" variant="outlined" onClick={() => setPicker(true)}>
            {teacher ? "Change" : "Pick"}
          </Button>
        </Stack>
        <TextField
          type="number"
          size="small"
          label="Periods for this teacher (optional)"
          helperText="Leave blank if this teacher takes the whole subject. To split a subject across two teachers, add it twice — e.g. Biology · Mr A · 6, then Biology · Mr B · 3."
          value={share}
          onChange={(e) => setShare(e.target.value)}
          sx={{ mt: 2 }}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Add"}
        </Button>
      </DialogActions>
      <EmployeeSearchDialog
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(emp) => setTeacher(emp)}
      />
    </Dialog>
  );
}
