import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

const KIND_COLORS = {
  academic: "primary",
  games: "success",
  library: "info",
  activity: "warning",
};

function SubjectDialog({ open, subject, kinds, onClose, onSaved }) {
  const isEdit = Boolean(subject?.uuid);
  const [form, setForm] = useState({ name: "", code: "", kind: "academic" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      name: subject?.name || "",
      code: subject?.code || "",
      kind: subject?.kind || "academic",
    });
    setError("");
  }, [subject, open]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit) await timetableService.updateSubject(subject.uuid, form);
      else await timetableService.createSubject(form);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to save subject",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Edit Subject" : "Add Subject"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          fullWidth
          label="Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          select
          fullWidth
          label="Kind"
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          {kinds.map((k) => (
            <MenuItem key={k.value} value={k.value}>
              {k.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SubjectList() {
  const { canMutate } = useTimetablePerms();
  const [subjects, setSubjects] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, subject: null });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    subject: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [subjectsData, lookups] = await Promise.all([
        timetableService.getSubjects(),
        timetableService.getLookups(),
      ]);
      setSubjects(subjectsData.subjects || []);
      setKinds(lookups.subjectKinds || []);
    } catch (err) {
      setError("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await timetableService.deleteSubject(deleteDialog.subject.uuid);
      setDeleteDialog({ open: false, subject: null });
      load();
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to delete subject",
      );
      setDeleteDialog({ open: false, subject: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: "name", headerName: "Subject", flex: 1, minWidth: 200 },
    { field: "code", headerName: "Code", width: 140 },
    {
      field: "kind",
      headerName: "Kind",
      width: 140,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={KIND_COLORS[params.value] || "default"}
          variant="outlined"
        />
      ),
    },
    ...(canMutate
      ? [
          {
            field: "actions",
            headerName: "Actions",
            width: 120,
            sortable: false,
            renderCell: (params) => (
              <Box>
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={() =>
                      setDialog({ open: true, subject: params.row })
                    }
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      setDeleteDialog({ open: true, subject: params.row })
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Subjects</Typography>
        {canMutate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ open: true, subject: null })}
          >
            Add Subject
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card>
        <DataGrid
          rows={subjects}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600 },
            "& .MuiDataGrid-cell": { borderBottom: "1px solid #e4e9f2" },
          }}
        />
      </Card>

      <SubjectDialog
        open={dialog.open}
        subject={dialog.subject}
        kinds={kinds}
        onClose={() => setDialog({ open: false, subject: null })}
        onSaved={load}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Subject"
        message={`Delete "${deleteDialog.subject?.name}"? Subjects used in classes cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, subject: null })}
        loading={deleting}
      />
    </Box>
  );
}
