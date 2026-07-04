import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Autocomplete,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import { timetableService } from "../../../services/timetableService";
import EmployeeSearchDialog from "../../../components/common/EmployeeSearchDialog";
import TeacherName from "./TeacherName";

const DOW_LABEL = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
const subjectLabel = (s) => (s?.code ? `${s.name} (${s.code})` : s?.name || "");

// Manual edit of one published grid cell (a class's rows at one day+slot).
// Single-offering cells can change subject/teacher; any cell can be moved or swapped.
export default function EditCellDialog({
  open,
  onClose,
  publishedTimetableId,
  classId,
  group, // the entries at this (class, day, slot)
  config,
  allEntries,
  onChanged,
}) {
  const first = group[0];
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState(first?.subjectId || "");
  const [teacher, setTeacher] = useState(
    first?.teacherId ? { uuid: first.teacherId } : null,
  );
  const [picker, setPicker] = useState(false);
  const [toDay, setToDay] = useState("");
  const [toSlot, setToSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    timetableService
      .getSubjects()
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  const days = useMemo(
    () => [...(config?.days || [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [config],
  );
  const slotsOfDay = (dayUuid) => {
    const d = days.find((x) => x.uuid === dayUuid);
    return (d?.slots || []).filter((s) => s.slotType === "teaching");
  };
  const single = group.length === 1;

  const fail = (err, fallback) =>
    setError(err?.response?.data?.error?.description || fallback);

  const saveEdit = async () => {
    if (!subjectId) {
      setError("Pick a subject");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await timetableService.editPublishedEntry(first.uuid, {
        publishedTimetableId,
        subjectId,
        teacherId: teacher?.uuid || null,
      });
      onChanged();
      onClose();
    } catch (err) {
      fail(err, "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const relocate = async () => {
    setError("");
    setInfo("");
    const day = days.find((d) => d.uuid === toDay);
    if (!day || !toSlot) {
      setError("Pick a target day and period");
      return;
    }
    // occupied by THIS class already? -> swap; else move.
    const target = (allEntries || []).find(
      (e) =>
        e.classId === classId &&
        e.dayOfWeek === day.dayOfWeek &&
        e.timeSlotId === toSlot &&
        !group.some((g) => g.uuid === e.uuid),
    );
    setBusy(true);
    try {
      if (target) {
        await timetableService.swapPublishedEntries({
          publishedTimetableId,
          entryIdA: first.uuid,
          entryIdB: target.uuid,
        });
      } else {
        const v = await timetableService.validateMove({
          publishedTimetableId,
          entryId: first.uuid,
          toDayOfWeek: day.dayOfWeek,
          toTimeSlotId: toSlot,
        });
        if (!v.valid) {
          setError((v.issues || ["Move not allowed"]).join("; "));
          setBusy(false);
          return;
        }
        await timetableService.movePublishedEntry(first.uuid, {
          publishedTimetableId,
          toDayOfWeek: day.dayOfWeek,
          toTimeSlotId: toSlot,
        });
      }
      onChanged();
      onClose();
    } catch (err) {
      fail(err, "Failed to relocate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit cell</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            {info}
          </Alert>
        )}

        {/* --- Change subject / teacher (single-offering cells only) --- */}
        {single ? (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Change subject / teacher
            </Typography>
            <Autocomplete
              sx={{ mb: 2 }}
              options={subjects}
              getOptionLabel={subjectLabel}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              value={subjects.find((s) => s.uuid === subjectId) || null}
              onChange={(e, v) => setSubjectId(v?.uuid || "")}
              renderInput={(p) => <TextField {...p} label="Subject" />}
            />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2">Teacher:</Typography>
              <Chip
                label={teacher?.uuid ? <TeacherName id={teacher.uuid} /> : "none"}
              />
              <Button size="small" variant="outlined" onClick={() => setPicker(true)}>
                {teacher?.uuid ? "Change" : "Pick"}
              </Button>
            </Stack>
            <Button variant="contained" size="small" disabled={busy} onClick={saveEdit}>
              Save subject/teacher
            </Button>
          </>
        ) : (
          <Alert severity="info">
            This is a band cell (parallel options); edit its offerings from the class
            group's band setup. You can still move or swap the whole cell below.
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* --- Move / swap the whole cell --- */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Move or swap this cell
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            select
            fullWidth
            label="To day"
            value={toDay}
            onChange={(e) => {
              setToDay(e.target.value);
              setToSlot("");
            }}
          >
            {days.map((d) => (
              <MenuItem key={d.uuid} value={d.uuid}>
                {d.label || DOW_LABEL[d.dayOfWeek] || d.dayOfWeek}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="To period"
            value={toSlot}
            disabled={!toDay}
            onChange={(e) => setToSlot(e.target.value)}
          >
            {slotsOfDay(toDay).map((s) => (
              <MenuItem key={s.uuid} value={s.uuid}>
                {s.label || `Period ${s.sequence}`}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Typography variant="caption" sx={{ color: "#8f9bb3", mt: 1, display: "block" }}>
          If the target period is free this cell moves there; if the class already has a
          period there, the two swap. Clashes are checked first.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button variant="contained" onClick={relocate} disabled={busy || !toSlot}>
          {busy ? "Working…" : "Move / Swap"}
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
