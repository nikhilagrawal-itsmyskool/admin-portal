import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
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
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import { classService } from "../../../services/classService";
import { AcademicYearSelect } from "../components/Selectors";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

export default function WingList() {
  const { canMutate } = useTimetablePerms();
  const [academicYearId, setAcademicYearId] = useState("");
  const [wings, setWings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, wing: null });
  const [del, setDel] = useState({ open: false, wing: null });

  useEffect(() => {
    classService
      .getClasses({ includeCohort: true })
      .then((d) => setClasses(Array.isArray(d) ? d : d.classes || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    try {
      const data = await timetableService.getWings({ academicYearId });
      setWings(data.wings || []);
    } catch {
      setError("Failed to load wings");
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);
  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    try {
      await timetableService.deleteWing(del.wing.uuid);
      setDel({ open: false, wing: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || "Failed to delete");
      setDel({ open: false, wing: null });
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Wings
      </Typography>
      <Typography variant="body2" sx={{ color: "#8f9bb3", mb: 3 }}>
        A wing is a named set of classes (e.g. Primary, Middle, Senior). You can
        generate and publish a timetable for the whole school or for a single
        wing.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
        />
        {canMutate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!academicYearId}
            onClick={() => setDialog({ open: true, wing: null })}
          >
            Add Wing
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
          {wings.length === 0 && (
            <Typography sx={{ color: "#8f9bb3" }}>
              No wings yet for this year.
            </Typography>
          )}
          {wings.map((wing) => (
            <Card key={wing.uuid}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6">{wing.name}</Typography>
                  {canMutate && (
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() => setDialog({ open: true, wing })}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => setDel({ open: true, wing })}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(wing.classes || []).length === 0 && (
                    <Typography variant="body2" sx={{ color: "#8f9bb3" }}>
                      No classes.
                    </Typography>
                  )}
                  {(wing.classes || []).map((c) => (
                    <Chip
                      key={c.classId}
                      label={c.className || c.classId}
                      size="small"
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {dialog.open && (
        <WingDialog
          academicYearId={academicYearId}
          classes={classes}
          wing={dialog.wing}
          onClose={() => setDialog({ open: false, wing: null })}
          onSaved={load}
        />
      )}
      <ConfirmDialog
        open={del.open}
        title="Delete Wing"
        message={`Delete wing "${del.wing?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDel({ open: false, wing: null })}
      />
    </Box>
  );
}

function WingDialog({ academicYearId, classes, wing, onClose, onSaved }) {
  const isEdit = Boolean(wing?.uuid);
  const [name, setName] = useState(wing?.name || "");
  const [selected, setSelected] = useState(
    (wing?.classIds || [])
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
    setSaving(true);
    setError("");
    try {
      if (isEdit)
        await timetableService.updateWing(wing.uuid, {
          name: name.trim(),
          classIds,
        });
      else
        await timetableService.createWing({
          academicYearId,
          name: name.trim(),
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
      <DialogTitle>{isEdit ? "Edit Wing" : "Add Wing"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label="Wing name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <Autocomplete
          multiple
          options={classes}
          value={selected}
          onChange={(e, v) => setSelected(v)}
          getOptionLabel={(o) => o.name || ""}
          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
          renderInput={(params) => (
            <TextField {...params} label="Classes" placeholder="Add classes" />
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
