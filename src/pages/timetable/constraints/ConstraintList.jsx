import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Stack,
  Alert,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import ResponsiveDataGrid from "../../../components/common/ResponsiveDataGrid";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import { AcademicYearSelect } from "../components/Selectors";
import TeacherName from "../components/TeacherName";
import EmployeeSearchDialog from "../../../components/common/EmployeeSearchDialog";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

const NEEDS_DAY = ["day_off", "unavailable_slot", "preferred_slot", "available_slot"];
const NEEDS_SLOT = ["unavailable_slot", "preferred_slot", "available_slot"];
const NEEDS_MAX = ["max_per_day", "max_consecutive", "weekly_max"];

const DAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
// Back-compat: a constraint may store a single `day` or a `days` list. Read either.
const daysOf = (value) =>
  Array.isArray(value?.days) ? value.days : value?.day != null ? [value.day] : [];

function describeValue(type, value) {
  if (!value) return "";
  if (NEEDS_MAX.includes(type)) return `max ${value.max}`;
  const days = daysOf(value).map((d) => DAY_LABELS[d] || d).join(", ");
  if (type === "day_off") return days;
  if (NEEDS_SLOT.includes(type)) return `period ${value.slot} · ${days}`;
  return JSON.stringify(value);
}

function ConstraintDialog({
  teacher,
  academicYearId,
  types,
  days,
  constraint,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(constraint?.uuid);
  const [constraintType, setConstraintType] = useState(
    constraint?.constraintType || "available_slot",
  );
  const [selectedDays, setSelectedDays] = useState(daysOf(constraint?.value));
  const [slot, setSlot] = useState(constraint?.value?.slot ?? 1);
  const [max, setMax] = useState(constraint?.value?.max ?? 1);
  const [hardness, setHardness] = useState(constraint?.hardness || "hard");
  const [weight, setWeight] = useState(
    constraint?.weight != null ? String(constraint.weight) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // preferred is a soft nudge only; available is a hard whitelist.
  const effectiveHardness =
    constraintType === "preferred_slot"
      ? "soft"
      : constraintType === "available_slot"
        ? "hard"
        : hardness;

  const buildValue = () => {
    if (NEEDS_MAX.includes(constraintType)) return { max: Number(max) };
    if (constraintType === "day_off") return { days: selectedDays.map(Number) };
    if (NEEDS_SLOT.includes(constraintType))
      return { days: selectedDays.map(Number), slot: Number(slot) };
    return {};
  };

  const save = async () => {
    if (NEEDS_DAY.includes(constraintType) && selectedDays.length === 0) {
      setError("Pick at least one day");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        value: buildValue(),
        hardness: effectiveHardness,
        weight: weight === "" ? undefined : Number(weight),
      };
      if (isEdit) {
        await timetableService.updateTeacherConstraint(constraint.uuid, payload);
      } else {
        await timetableService.createTeacherConstraint({
          academicYearId,
          teacherId: teacher.uuid,
          constraintType,
          ...payload,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Edit Constraint" : "Add Constraint"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          select
          fullWidth
          label="Type"
          value={constraintType}
          disabled={isEdit}
          onChange={(e) => setConstraintType(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        >
          {types.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
        {NEEDS_DAY.includes(constraintType) && (
          <Autocomplete
            multiple
            options={days}
            value={days.filter((d) => selectedDays.includes(d.value))}
            onChange={(e, v) => setSelectedDays(v.map((o) => o.value))}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.value === v.value}
            renderInput={(params) => (
              <TextField {...params} label="Days" placeholder="Pick days" />
            )}
            sx={{ mb: 2 }}
          />
        )}
        {NEEDS_SLOT.includes(constraintType) && (
          <TextField
            fullWidth
            type="number"
            label="Teaching period"
            helperText="1 = the first teaching period of the day (assembly/break/lunch are not counted)"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}
        {NEEDS_MAX.includes(constraintType) && (
          <TextField
            fullWidth
            type="number"
            label="Maximum"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}
        {constraintType === "preferred_slot" ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            Preferred is a soft nudge — the solver tries it but may override it.
          </Alert>
        ) : constraintType === "available_slot" ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            Available is a hard rule — the teacher is scheduled ONLY in these
            periods (everything else is blocked).
          </Alert>
        ) : (
          <TextField
            select
            fullWidth
            label="Hardness"
            value={hardness}
            onChange={(e) => setHardness(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="hard">Hard (must satisfy)</MenuItem>
            <MenuItem value="soft">Soft (prefer)</MenuItem>
          </TextField>
        )}
        {effectiveHardness === "soft" && constraintType !== "preferred_slot" && (
          <TextField
            fullWidth
            type="number"
            label="Weight (optional)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        )}
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

export default function ConstraintList() {
  const { canMutate } = useTimetablePerms();
  const [academicYearId, setAcademicYearId] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [picker, setPicker] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [types, setTypes] = useState([]);
  const [days, setDays] = useState([]);
  const [dialog, setDialog] = useState({ open: false, constraint: null });
  const [del, setDel] = useState({ open: false, row: null });

  useEffect(() => {
    timetableService
      .getLookups()
      .then((l) => {
        setTypes(l.constraintTypes || []);
        setDays(l.daysOfWeek || []);
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!teacher?.uuid || !academicYearId) return;
    setLoading(true);
    try {
      const data = await timetableService.getTeacherConstraints({
        teacherId: teacher.uuid,
        academicYearId,
      });
      setRows(data.constraints || []);
    } catch {
      setError("Failed to load constraints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [teacher, academicYearId]);

  const handleDelete = async () => {
    try {
      await timetableService.deleteTeacherConstraint(del.row.uuid);
      setDel({ open: false, row: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to delete");
      setDel({ open: false, row: null });
    }
  };

  const columns = [
    { field: "constraintType", headerName: "Type", width: 170 },
    {
      field: "value",
      headerName: "Detail",
      flex: 1,
      minWidth: 160,
      sortable: false,
      valueGetter: (value, row) => describeValue(row.constraintType, row.value),
    },
    {
      field: "hardness",
      headerName: "Hardness",
      width: 120,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          color={p.value === "hard" ? "error" : "default"}
          variant="outlined"
        />
      ),
    },
    ...(canMutate
      ? [
          {
            field: "actions",
            headerName: "",
            width: 110,
            sortable: false,
            renderCell: (p) => (
              <>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setDialog({ open: true, constraint: p.row })}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDel({ open: true, row: p.row })}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Teacher Constraints
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
        />
        <Chip
          icon={<PersonIcon />}
          label={
            teacher ? <TeacherName id={teacher.uuid} /> : "No teacher selected"
          }
        />
        <Button variant="outlined" onClick={() => setPicker(true)}>
          {teacher ? "Change Teacher" : "Pick Teacher"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {!teacher || !academicYearId ? (
        <Alert severity="info">
          Select an academic year and teacher to manage constraints.
        </Alert>
      ) : (
        <>
          {canMutate && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialog({ open: true, constraint: null })}
              >
                Add Constraint
              </Button>
            </Box>
          )}
          <ResponsiveDataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.uuid}
              loading={loading}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              disableRowSelectionOnClick
              sx={{ border: "none" }}
            />
        </>
      )}

      <EmployeeSearchDialog
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(emp) => setTeacher(emp)}
      />
      {dialog.open && (
        <ConstraintDialog
          teacher={teacher}
          academicYearId={academicYearId}
          types={types}
          days={days}
          constraint={dialog.constraint}
          onClose={() => setDialog({ open: false, constraint: null })}
          onSaved={load}
        />
      )}
      <ConfirmDialog
        open={del.open}
        title="Delete Constraint"
        message="Delete this constraint?"
        onConfirm={handleDelete}
        onCancel={() => setDel({ open: false, row: null })}
      />
    </Box>
  );
}
