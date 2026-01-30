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
  Autocomplete,
  Grid,
  MenuItem,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  PersonSearch as PersonSearchIcon,
} from '@mui/icons-material';
import { medicalService } from '../../../services/medicalService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function IssueList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [selectedItem, setSelectedItem] = useState(null);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  const entityTypes = [
    { value: '', label: 'All' },
    { value: 'student', label: 'Student' },
    { value: 'employee', label: 'Employee' },
  ];

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    // Initialize filters from URL params and trigger search
    const itemId = searchParams.get('item');
    if (itemId && items.length > 0) {
      const item = items.find((i) => i.uuid === itemId);
      if (item) {
        setSelectedItem(item);
        // Trigger search with the item filter
        loadIssuesWithFilters({ itemId: item.uuid });
        return;
      }
    }
    // Only load on initial mount when no URL params or items not loaded yet
    if (items.length === 0 || !searchParams.get('item')) {
      loadIssues();
    }
  }, [items]);

  const loadItems = async () => {
    try {
      const data = await medicalService.getItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const loadIssuesWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (entityType) filters.entityType = entityType;
      if (entityId) filters.entityId = entityId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await medicalService.getIssues(filters);
      setIssues(data);
    } catch (err) {
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = () => loadIssuesWithFilters();

  const handleSearch = () => {
    loadIssues();
  };

  const handleClear = () => {
    setSelectedItem(null);
    setEntityType('');
    setEntityId('');
    setSelectedStudent(null);
    setSelectedEmployee(null);
    setStartDate('');
    setEndDate('');
    setIncludeDeleted(false);
    setSearchParams({});
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setEntityId(student.uuid);
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setEntityId(employee.uuid);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await medicalService.deleteIssue(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadIssues();
    } catch (err) {
      setError('Failed to delete issue');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const columns = [
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 200 },
    {
      field: 'issueDate',
      headerName: 'Issue Date',
      width: 130,
      valueFormatter: (value) => formatDate(value),
    },
    { field: 'quantity', headerName: 'Quantity', width: 100 },
    {
      field: 'entityType',
      headerName: 'Issued To',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'student' ? 'primary' : 'secondary'}
          variant="outlined"
        />
      ),
    },
    { field: 'entityName', headerName: 'Name', width: 150 },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 150 },
    {
      field: 'parentConsent',
      headerName: 'Consent',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Yes' : 'No'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => navigate(`/medical/issues/${params.row.uuid}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            {!isDeleted && (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteDialog({ open: true, item: params.row })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Issue Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/medical/issues/add')}
        >
          Add Issue
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
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={items}
                getOptionLabel={(option) => option.name}
                value={selectedItem}
                onChange={(e, newValue) => setSelectedItem(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Item" size="small" placeholder="All Items" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                label="Issue To"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setEntityId('');
                  setSelectedStudent(null);
                  setSelectedEmployee(null);
                }}
                size="small"
              >
                {entityTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Entity ID"
                value={
                  selectedStudent
                    ? `${selectedStudent.name} (${selectedStudent.admissionNo || selectedStudent.uuid})`
                    : selectedEmployee
                    ? `${selectedEmployee.name} (${selectedEmployee.employeeId || selectedEmployee.uuid})`
                    : entityId
                }
                onChange={(e) => {
                  setEntityId(e.target.value);
                  setSelectedStudent(null);
                  setSelectedEmployee(null);
                }}
                size="small"
                disabled={(entityType === 'student' && selectedStudent) || (entityType === 'employee' && selectedEmployee)}
                InputProps={{
                  endAdornment: (entityType === 'student' || entityType === 'employee') && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => entityType === 'student' ? setStudentSearchOpen(true) : setEmployeeSearchOpen(true)}
                        edge="end"
                      >
                        <PersonSearchIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
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
            <Grid item xs={12} md={1.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                    size="small"
                  />
                }
                label="Include deleted"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
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

      <Card>
        <DataGrid
          rows={issues}
          columns={columns}
          getRowId={(row) => row.uuid}
          getRowClassName={(params) => params.row.status === 'deleted' ? 'deleted-row' : ''}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e4e9f2',
            },
            '& .deleted-row': {
              opacity: 0.6,
              backgroundColor: 'rgba(244, 67, 54, 0.04)',
              '& .MuiDataGrid-cell:not(:last-of-type)': {
                textDecoration: 'line-through',
              },
            },
          }}
        />
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Issue"
        message="Are you sure you want to delete this issue record? This will also restore the inventory stock."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <StudentSearchDialog
        open={studentSearchOpen}
        onClose={() => setStudentSearchOpen(false)}
        onSelect={handleStudentSelect}
      />

      <EmployeeSearchDialog
        open={employeeSearchOpen}
        onClose={() => setEmployeeSearchOpen(false)}
        onSelect={handleEmployeeSelect}
      />
    </Box>
  );
}
