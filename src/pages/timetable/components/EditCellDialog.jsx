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

// Edit, create or clear one published grid cell (a class's rows at one day+slot).
// A cell can carry free text (`label`, e.g. a pre-primary "Hindi Book" period) and/or a
// subject + teacher. When `group` is empty the dialog is in CREATE mode for the given
// day+slot. Single-offering cells can also be moved or swapped; band cells (group > 1)
// can only be moved/swapped (edit their offerings from the band setup).
export default function EditCellDialog({
  open,
  onClose,
  publishedTimetableId,
  classId,
  group = [], // the entries at this (class, day, slot); empty = create
  day, // the day object (for create: dayOfWeek + the move/swap target list)
  slot, // the slot object (for create: timeSlotId)
  config,
  allEntries,
  onChanged,
}) {
  const first = group[0];
  const creating = group.length === 0;
  const single = group.length <= 1; // create or single entry -> show the cell form

  const [subjects, setSubjects] = useState([]);
  const [label, setLabel] = useState(first?.label || "");
  const [subjectId, setSubjectId] = useState(first?.subjectId || "");
  const [teacher, setTeacher] = useState(
    first?.teacherId ? { uuid: first.teacherId } : null,
  );
  const [picker, setPicker] = useState(false);
  const [toDay, setToDay] = useState("");
  const [toSlot, setToSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const fail = (err, fallback) =>
    setError(err?.response?.data?.error?.description || fallback);

  // Create a new cell, or edit the existing single cell's label/subject/teacher.
  const saveCell = async () => {
    if (!label.trim() && !subjectId) {
      setError("Enter a label or pick a subject");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (creating) {
        await timetableService.createPublishedEntry({
          publishedTimetableId,
          classId,
          dayOfWeek: day.dayOfWeek,
          timeSlotId: slot.uuid,
          label: label.trim() || null,
          subjectId: subjectId || null,
          teacherId: teacher?.uuid || null,
        });
      } else {
        await timetableService.editPublishedEntry(first.uuid, {
          publishedTimetableId,
          subjectId: subjectId || null,
          teacherId: teacher?.uuid || null,
          label: label.trim() || null,
        });
      }
      onChanged();
      onClose();
    } catch (err) {
      fail(err, "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const clearCell = async () => {
    setBusy(true);
    setError("");
    try {
      await timetableService.deletePublishedEntry(first.uuid, publishedTimetableId);
      onChanged();
      onClose();
    } catch (err) {
      fail(err, "Failed to clear");
    } finally {
      setBusy(false);
    }
  };

  const relocate = async () => {
    setError("");
    const d = days.find((x) => x.uuid === toDay);
    if (!d || !toSlot) {
      setError("Pick a target day and period");
      return;
    }
    // occupied by THIS class already? -> swap; else move.
    const target = (allEntries || []).find(
      (e) =>
        e.classId === classId &&
        e.dayOfWeek === d.dayOfWeek &&
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
          toDayOfWeek: d.dayOfWeek,
          toTimeSlotId: toSlot,
        });
        if (!v.valid) {
          setError((v.issues || ["Move not allowed"]).join("; "));
          setBusy(false);
          return;
        }
        await timetableService.movePublishedEntry(first.uuid, {
          publishedTimetableId,
          toDayOfWeek: d.dayOfWeek,
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
      <DialogTitle>{creating ? "Add period" : "Edit period"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* --- Cell contents (create or single-offering edit) --- */}
        {single ? (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Period contents
            </Typography>
            <TextField
              fullWidth
              label="Label (free text)"
              placeholder="e.g. Hindi Book, Circle time"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" sx={{ color: "#8f9bb3", display: "block", mb: 2 }}>
              A label is enough for a teacher-less period (e.g. pre-primary). Add a subject
              and teacher below only if this is a regular taught period.
            </Typography>
            <Autocomplete
              sx={{ mb: 2 }}
              options={subjects}
              getOptionLabel={subjectLabel}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              value={subjects.find((s) => s.uuid === subjectId) || null}
              onChange={(e, v) => setSubjectId(v?.uuid || "")}
              renderInput={(p) => <TextField {...p} label="Subject (optional)" />}
            />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body2">Teacher:</Typography>
              <Chip
                label={teacher?.uuid ? <TeacherName id={teacher.uuid} /> : "none"}
                onDelete={teacher?.uuid ? () => setTeacher(null) : undefined}
              />
              <Button size="small" variant="outlined" onClick={() => setPicker(true)}>
                {teacher?.uuid ? "Change" : "Pick"}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" disabled={busy} onClick={saveCell}>
                {creating ? "Add" : "Save"}
              </Button>
              {!creating && (
                <Button color="error" size="small" disabled={busy} onClick={clearCell}>
                  Clear period
                </Button>
              )}
            </Stack>
          </>
        ) : (
          <Alert severity="info">
            This is a band cell (parallel options); edit its offerings from the class
            group's band setup. You can still move or swap the whole cell below.
          </Alert>
        )}

        {/* --- Move / swap the whole cell (existing cells only) --- */}
        {!creating && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Move or swap this period
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
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        {!creating && (
          <Button variant="contained" onClick={relocate} disabled={busy || !toSlot}>
            {busy ? "Working…" : "Move / Swap"}
          </Button>
        )}
      </DialogActions>
      <EmployeeSearchDialog
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(emp) => setTeacher(emp)}
      />
    </Dialog>
  );
}
