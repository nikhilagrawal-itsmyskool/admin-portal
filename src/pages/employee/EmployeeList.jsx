import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ResponsiveDataGrid from "../../components/common/ResponsiveDataGrid";
import usePersistedPaginationModel from "../../hooks/usePersistedPaginationModel";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as VpnKeyIcon,
  Restore as RestoreIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { employeeService } from "../../services/employeeService";
import { useAuth } from "../../context/AuthContext";
import { useCan } from "../../permissions/can";
import { ACTIONS } from "../../permissions/actions";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import CredentialsDialog from "./dialogs/CredentialsDialog";
import EmployeeDetailDialog from "./dialogs/EmployeeDetailDialog";

export default function EmployeeList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const can = useCan();
  const isAdmin = can(ACTIONS.EMPLOYEE_MANAGE);
  const isGod = can(ACTIONS.EMPLOYEE_RESTORE);

  // Managers can open anyone's detail; view-only staff (teachers) may open
  // only their own row. user.employeeId is the logged-in employee's uuid.
  const canViewEmployee = (row) => isAdmin || row?.uuid === user?.employeeId;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({
    open: false,
    item: null,
  });
  const [restoring, setRestoring] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState({
    open: false,
    item: null,
  });
  const [detailDialog, setDetailDialog] = useState({ open: false, item: null });
  const [paginationModel, setPaginationModel] = usePersistedPaginationModel(
    "employeeList",
    { page: 0, pageSize: 25 },
  );

  useEffect(() => {
    loadEmployees();
  }, [showDeleted]);

  const loadEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await employeeService.searchEmployees(
        showDeleted ? { includeDeleted: true } : {},
      );
      setEmployees(data);
    } catch (err) {
      setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await employeeService.deleteEmployee(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadEmployees();
    } catch (err) {
      setError("Failed to delete employee");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await employeeService.restoreEmployee(restoreDialog.item.uuid);
      setRestoreDialog({ open: false, item: null });
      loadEmployees();
    } catch (err) {
      setError("Failed to restore employee");
    } finally {
      setRestoring(false);
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredEmployees = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(term) ||
      e.familyUniqueNumber?.toLowerCase().includes(term) ||
      e.employeeNumber?.toLowerCase().includes(term),
  );

  // Never leave the user stranded past the last page (deletes, filter, search).
  useEffect(() => {
    const lastPage = Math.max(
      0,
      Math.ceil(filteredEmployees.length / paginationModel.pageSize) - 1,
    );
    if (paginationModel.page > lastPage) {
      setPaginationModel({ ...paginationModel, page: lastPage });
    }
  }, [filteredEmployees.length, paginationModel.pageSize]);

  const columns = [
    { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
    { field: "familyUniqueNumber", headerName: "Login ID", width: 150 },
    { field: "employeeNumber", headerName: "Employee No.", width: 140 },
    { field: "code", headerName: "Code", width: 90 },
    { field: "mobile", headerName: "Mobile", width: 140 },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value === "deleted" ? "Deleted" : "Active"}
          size="small"
          color={params.value === "deleted" ? "default" : "success"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === "deleted";
        return (
          <Box>
            {/* View: managers see all; view-only staff only their own row. */}
            {canViewEmployee(params.row) && (
              <IconButton
                size="small"
                onClick={() => setDetailDialog({ open: true, item: params.row })}
                title="View Details"
              >
                <ViewIcon fontSize="small" />
              </IconButton>
            )}
            {isAdmin && isDeleted && isGod && (
              <IconButton
                size="small"
                color="success"
                onClick={() => setRestoreDialog({ open: true, item: params.row })}
                title="Restore Employee"
              >
                <RestoreIcon fontSize="small" />
              </IconButton>
            )}
            {isAdmin && !isDeleted && (
              <>
                <IconButton
                  size="small"
                  onClick={() => navigate(`/employees/${params.row.uuid}/edit`)}
                  title="Edit Employee"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() =>
                    setCredentialsDialog({ open: true, item: params.row })
                  }
                  title="View Credentials"
                >
                  <VpnKeyIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteDialog({ open: true, item: params.row })}
                  title="Delete Employee"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        );
      },
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
        <Typography variant="h4">Employees</Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/employees/add")}
          >
            Add Employee
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: "16px !important" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              fullWidth
              placeholder="Search by name, login ID or employee number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPaginationModel({ ...paginationModel, page: 0 });
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            {isAdmin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                  />
                }
                label="Show deleted"
                sx={{ whiteSpace: "nowrap" }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={filteredEmployees}
          columns={columns}
          getRowId={(row) => row.uuid}
          getRowClassName={(params) =>
            [
              params.row.status === "deleted" ? "deleted-row" : "",
              canViewEmployee(params.row) ? "" : "no-click-row",
            ]
              .filter(Boolean)
              .join(" ")
          }
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableRowSelectionOnClick
          onRowClick={(params) => {
            if (canViewEmployee(params.row)) {
              setDetailDialog({ open: true, item: params.row });
            }
          }}
          sx={{
            border: "none",
            cursor: "pointer",
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600 },
            "& .MuiDataGrid-cell": { borderBottom: "1px solid #e4e9f2" },
            "& .no-click-row": { cursor: "default" },
            "& .deleted-row": {
              opacity: 0.6,
              backgroundColor: "rgba(244, 67, 54, 0.04)",
            },
          }}
        />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Employee"
        message={`Are you sure you want to delete "${deleteDialog.item?.name}"? Their login will also be removed.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <ConfirmDialog
        open={restoreDialog.open}
        title="Restore Employee"
        message={`Restore "${restoreDialog.item?.name}"? A login will be re-created with the default password (Itsmyskool@123).`}
        confirmLabel="Restore"
        loadingLabel="Restoring..."
        confirmColor="success"
        onConfirm={handleRestore}
        onCancel={() => setRestoreDialog({ open: false, item: null })}
        loading={restoring}
      />

      <CredentialsDialog
        open={credentialsDialog.open}
        employee={credentialsDialog.item}
        onClose={() => setCredentialsDialog({ open: false, item: null })}
      />

      <EmployeeDetailDialog
        open={detailDialog.open}
        employee={detailDialog.item}
        onClose={() => setDetailDialog({ open: false, item: null })}
      />
    </Box>
  );
}
