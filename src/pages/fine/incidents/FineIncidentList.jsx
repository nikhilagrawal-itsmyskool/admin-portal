import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Alert,
  Chip,
  TextField,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  OutlinedInput,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { fineService } from '../../../services/fineService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import { fmtDate } from '../../../utils/date';

const CATEGORY_LABELS = {
  library: 'Library',
  infrastructure_movable: 'Infrastructure (Movable)',
  infrastructure_immovable: 'Infrastructure (Immovable)',
  library_books: 'Library Books',
  medical: 'Medical',
  labs: 'Labs',
};

const STATUS_COLORS = {
  open: 'error',
  under_review: 'warning',
  decision_made: 'info',
  closed: 'success',
};

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  decision_made: 'Decision Made',
  closed: 'Closed',
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

export default function FineIncidentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Assign dialog state
  const [assignDialog, setAssignDialog] = useState({ open: false, incidentId: null });
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Filter state — status is an array for multi-select
  const [status, setStatus] = useState(() => {
    const s = searchParams.get('status');
    return s ? s.split(',').map((v) => v.trim()).filter(Boolean) : [];
  });
  const [category, setCategory] = useState('');
  const [personType, setPersonType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadIncidents();
  }, []);

  const buildFilters = () => {
    const filters = {};
    if (status.length > 0) filters.status = status.join(',');
    if (category) filters.category = category;
    if (personType) filters.personType = personType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (search) filters.search = search;
    return filters;
  };

  const loadIncidents = async (overrideFilters) => {
    setLoading(true);
    setError('');
    try {
      const filters = overrideFilters !== undefined ? overrideFilters : buildFilters();
      const data = await fineService.getIncidents(filters);
      setIncidents(data);
    } catch {
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadIncidents();
  };

  const handleClear = () => {
    setStatus([]);
    setCategory('');
    setPersonType('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSearchParams({});
    loadIncidents({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fineService.deleteIncident(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadIncidents();
    } catch {
      setError('Failed to delete incident');
    } finally {
      setDeleting(false);
    }
  };

  const openAssignDialog = (incidentId) => {
    setAssignDialog({ open: true, incidentId });
    setSelectedAssignee(null);
  };

  const handleAssigneeSelect = (employee) => {
    setSelectedAssignee(employee);
    setEmployeeSearchOpen(false);
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    setAssigning(true);
    try {
      await fineService.updateIncident(assignDialog.incidentId, {
        assignedToId: selectedAssignee.uuid,
      });
      setAssignDialog({ open: false, incidentId: null });
      setSelectedAssignee(null);
      loadIncidents();
    } catch {
      setError('Failed to assign incident');
    } finally {
      setAssigning(false);
    }
  };

  const columns = [
    {
      field: 'incidentDate',
      headerName: 'Date',
      width: 100,
      valueFormatter: (value) => fmtDate(value),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 180,
      renderCell: (params) => (
        <Chip
          label={CATEGORY_LABELS[params.value] || params.value}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'personName',
      headerName: 'Person',
      width: 150,
      valueFormatter: (value) => value || '-',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box
          title={params.value}
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}
        >
          {params.value || '-'}
        </Box>
      ),
    },
    {
      field: 'suggestedFineAmount',
      headerName: 'Suggested Fine',
      width: 130,
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'decidedFineAmount',
      headerName: 'Decided Fine',
      width: 120,
      valueFormatter: (value) => (value != null ? formatCurrency(value) : '-'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={STATUS_LABELS[params.value] || params.value}
          size="small"
          color={STATUS_COLORS[params.value] || 'default'}
        />
      ),
    },
    {
      field: 'assigneeName',
      headerName: 'Assigned To',
      width: 130,
      valueFormatter: (value) => value || '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            title="View incident"
            onClick={() => navigate(`/fine/incidents/${params.row.uuid}`)}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.status !== 'closed' && (
            <IconButton
              size="small"
              title="Edit incident"
              onClick={() => navigate(`/fine/incidents/${params.row.uuid}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.status !== 'closed' && (
            <IconButton
              size="small"
              title="Assign incident"
              onClick={() => openAssignDialog(params.row.uuid)}
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            color="error"
            title="Delete incident"
            onClick={() => setDeleteDialog({ open: true, item: params.row })}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Fine Incidents</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/fine/incidents/new')}
        >
          Report Incident
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  multiple
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  input={<OutlinedInput label="Status" />}
                  renderValue={(selected) =>
                    selected.map((s) => STATUS_LABELS[s] || s).join(', ')
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Categories</MenuItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                select
                label="Person Type"
                value={personType}
                onChange={(e) => setPersonType(e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="employee">Employee</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Search description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  size="small"
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  size="small"
                >
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={incidents}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
          }}
        />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Incident"
        message="Are you sure you want to delete this fine incident? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      {/* Assign Dialog */}
      <Dialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, incidentId: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Assign Incident</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedAssignee ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={selectedAssignee.name}
                  onDelete={() => setSelectedAssignee(null)}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 1 }}>
                No assignee selected
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchIcon />}
              onClick={() => setEmployeeSearchOpen(true)}
              sx={{ mt: 1 }}
            >
              Search Employee
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, incidentId: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={!selectedAssignee || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeSearchDialog
        open={employeeSearchOpen}
        onClose={() => setEmployeeSearchOpen(false)}
        onSelect={handleAssigneeSelect}
      />
    </Box>
  );
}
