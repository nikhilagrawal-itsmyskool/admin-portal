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
} from "@mui/material";
import ResponsiveDataGrid from "../../../components/common/ResponsiveDataGrid";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import { AcademicYearSelect } from "../components/Selectors";
import TeacherName from "../components/TeacherName";
import EmployeeSearchDialog from "../../../components/common/EmployeeSearchDialog";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

const NEEDS_DAY = ["day_off", "unavailable_slot", "preferred_slot"];
const NEEDS_SLOT = ["unavailable_slot", "preferred_slot"];
const NEEDS_MAX = ["max_per_day", "max_consecutive", "weekly_max"];

function describeValue(type, value) {
  if (!value) return "";
  if (type === "day_off") return `day ${value.day}`;
  if (NEEDS_SLOT.includes(type))
    return `day ${value.day}, period ${value.slot}`;
  if (NEEDS_MAX.includes(type)) return `max ${value.max}`;
  return JSON.stringify(value);
}

function ConstraintDialog({
  teacher,
  academicYearId,
  types,
  days,
  onClose,
  onSaved,
}) {
  const [constraintType, setConstraintType] = useState("day_off");
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState(1);
  const [max, setMax] = useState(1);
  const [hardness, setHardness] = useState("hard");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const buildValue = () => {
    if (constraintType === "day_off") return { day: Number(day) };
    if (NEEDS_SLOT.includes(constraintType))
      return { day: Number(day), slot: Number(slot) };
    if (NEEDS_MAX.includes(constraintType)) return { max: Number(max) };
    return {};
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await timetableService.createTeacherConstraint({
        academicYearId,
        teacherId: teacher.uuid,
        constraintType,
        value: buildValue(),
        hardness,
        weight: weight === "" ? undefined : Number(weight),
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
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Constraint</DialogTitle>
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
          <TextField
            select
            fullWidth
            label="Day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            sx={{ mb: 2 }}
          >
            {days.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {NEEDS_SLOT.includes(constraintType) && (
          <TextField
            fullWidth
            type="number"
            label="Period (sequence)"
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
        {hardness === "soft" && (
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
  const [dialog, setDialog] = useState(false);
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
            width: 70,
            sortable: false,
            renderCell: (p) => (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDel({ open: true, row: p.row })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
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
                onClick={() => setDialog(true)}
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
      {dialog && (
        <ConstraintDialog
          teacher={teacher}
          academicYearId={academicYearId}
          types={types}
          days={days}
          onClose={() => setDialog(false)}
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
