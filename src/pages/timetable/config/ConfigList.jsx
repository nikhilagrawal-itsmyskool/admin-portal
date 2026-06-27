import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Tooltip,
  Chip,
} from "@mui/material";
import ResponsiveDataGrid from "../../../components/common/ResponsiveDataGrid";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  ContentCopy as CloneIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from "@mui/icons-material";
import { timetableService } from "../../../services/timetableService";
import { AcademicYearSelect } from "../components/Selectors";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTimetablePerms } from "../components/usePerms";

function ConfigDialog({ open, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName("");
    setError("");
  }, [open]);

  const handleSave = async () => {
    if (!name.trim() || !academicYearId) {
      setError("Name and academic year are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await timetableService.createConfig({
        name: name.trim(),
        academicYearId,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to create config",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New Grid Config</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label="Config Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
          size="medium"
          sx={{ width: "100%" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ConfigList() {
  const navigate = useNavigate();
  const { canMutate } = useTimetablePerms();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState({
    open: false,
    config: null,
  });
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timetableService.getConfigs();
      setConfigs(data.configs || []);
    } catch (err) {
      setError("Failed to load configs");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await timetableService.deleteConfig(archiveDialog.config.uuid);
      setArchiveDialog({ open: false, config: null });
      load();
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to archive config",
      );
      setArchiveDialog({ open: false, config: null });
    } finally {
      setArchiving(false);
    }
  };

  const handleClone = async (config) => {
    setError("");
    try {
      const clone = await timetableService.cloneConfig(config.uuid, {});
      navigate(`/timetable/configs/${clone.uuid}`);
    } catch (err) {
      setError(
        err.response?.data?.error?.description || "Failed to clone config",
      );
    }
  };

  const columns = [
    { field: "name", headerName: "Config", flex: 1, minWidth: 200 },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={params.value === "active" ? "success" : "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "lockedAt",
      headerName: "Lock",
      width: 110,
      sortable: false,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" icon={<LockIcon />} label="Locked" />
        ) : (
          <Chip
            size="small"
            icon={<LockOpenIcon />}
            label="Draft"
            color="success"
            variant="outlined"
          />
        ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title={canMutate ? "Edit grid" : "View grid"}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/timetable/configs/${params.row.uuid}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canMutate && (
            <Tooltip title="Clone into a new draft">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClone(params.row);
                }}
              >
                <CloneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canMutate && params.row.status === "active" && (
            <Tooltip title="Archive">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  setArchiveDialog({ open: true, config: params.row });
                }}
              >
                <ArchiveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
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
        <Typography variant="h4">Grid Configs</Typography>
        {canMutate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Config
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <ResponsiveDataGrid
          rows={configs}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          onRowClick={(params) =>
            navigate(`/timetable/configs/${params.row.uuid}`)
          }
          sx={{
            border: "none",
            cursor: "pointer",
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600 },
            "& .MuiDataGrid-cell": { borderBottom: "1px solid #e4e9f2" },
          }}
        />

      <ConfigDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
      <ConfirmDialog
        open={archiveDialog.open}
        title="Archive Config"
        confirmLabel="Archive"
        loadingLabel="Archiving..."
        message={`Archive "${archiveDialog.config?.name}"? It will no longer be the active grid.`}
        onConfirm={handleArchive}
        onCancel={() => setArchiveDialog({ open: false, config: null })}
        loading={archiving}
      />
    </Box>
  );
}
