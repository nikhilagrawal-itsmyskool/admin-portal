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
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  KeyboardReturn as ReturnIcon,
} from '@mui/icons-material';
import { labService } from '../../../services/labService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { fmtDate } from '../../../utils/date';

function ReturnDialog({ open, issue, onClose, onSuccess }) {
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    returnCondition: 'good',
    returnRemarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReturnData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await labService.returnIssue(issue.uuid, returnData);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to process return';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Return Item - {issue?.itemName}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Return Date"
              name="returnDate"
              type="date"
              value={returnData.returnDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Return Condition"
              name="returnCondition"
              value={returnData.returnCondition}
              onChange={handleChange}
              required
            >
              <MenuItem value="good">Good</MenuItem>
              <MenuItem value="damaged">Damaged</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Return Remarks"
              name="returnRemarks"
              value={returnData.returnRemarks}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
        >
          {saving ? 'Processing...' : 'Process Return'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function LabIssueList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [labs, setLabs] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [returnDialog, setReturnDialog] = useState({ open: false, issue: null });

  // Filter state
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [issueType, setIssueType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const issueTypes = [
    { value: '', label: 'All' },
    { value: 'class_use', label: 'Class Use' },
    { value: 'individual', label: 'Individual' },
    { value: 'disposed', label: 'Disposed' },
    { value: 'transferred', label: 'Transferred' },
  ];

  useEffect(() => {
    loadLabsAndItems();
  }, []);

  useEffect(() => {
    if (labs.length === 0 && items.length === 0) return;

    const labId = searchParams.get('lab');
    const itemId = searchParams.get('item');
    const overrides = {};

    if (labId) {
      const lab = labs.find((l) => l.uuid === labId);
      if (lab) {
        setSelectedLab(lab);
        setFilteredItems(items.filter((i) => i.labId === labId));
        overrides.labId = labId;
      }
    }
    if (itemId) {
      const item = items.find((i) => i.uuid === itemId);
      if (item) {
        setSelectedItem(item);
        overrides.itemId = itemId;
      }
    }

    loadIssuesWithFilters(overrides);
  }, [labs, items]);

  const loadLabsAndItems = async () => {
    try {
      const [labsData, itemsData] = await Promise.all([
        labService.getLabs(),
        labService.getItems(),
      ]);
      setLabs(labsData);
      setItems(itemsData);
      setFilteredItems(itemsData);
    } catch (err) {
      console.error('Failed to load labs/items:', err);
    }
  };

  const loadIssuesWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.labId && selectedLab) filters.labId = selectedLab.uuid;
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (issueType) filters.issueType = issueType;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await labService.getIssues(filters);
      setIssues(data);
    } catch (err) {
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = () => loadIssuesWithFilters();

  const handleLabChange = (event, newValue) => {
    setSelectedLab(newValue);
    setSelectedItem(null);
    if (newValue) {
      setFilteredItems(items.filter((i) => i.labId === newValue.uuid));
    } else {
      setFilteredItems(items);
    }
  };

  const handleSearch = () => {
    loadIssues();
  };

  const handleClear = () => {
    setSelectedLab(null);
    setSelectedItem(null);
    setIssueType('');
    setStartDate('');
    setEndDate('');
    setIncludeDeleted(false);
    setFilteredItems(items);
    setSearchParams({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await labService.deleteIssue(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadIssues();
    } catch (err) {
      setError('Failed to delete issue');
    } finally {
      setDeleting(false);
    }
  };

  const issueTypeLabels = {
    class_use: 'Class Use',
    individual: 'Individual',
    disposed: 'Disposed',
    transferred: 'Transferred',
  };

  const issueTypeColors = {
    class_use: 'primary',
    individual: 'secondary',
    disposed: 'warning',
    transferred: 'info',
  };

  const columns = [
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 160 },
    {
      field: 'issueDate',
      headerName: 'Issue Date',
      width: 120,
      valueFormatter: (value) => fmtDate(value),
    },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    {
      field: 'issueType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={issueTypeLabels[params.value] || params.value}
          size="small"
          color={issueTypeColors[params.value] || 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'issuedToName',
      headerName: 'Issued To',
      width: 180,
      renderCell: (params) => {
        const name = params.row.issuedToName || params.row.issuedTo || '-';
        const type = params.row.issuedToType;
        const className = params.row.issuedToClassName;
        if (!type) return name;
        const typeLabels = { student: 'Student', employee: 'Employee', class: 'Class' };
        const typeColors = { student: 'primary', employee: 'secondary', class: 'info' };
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label={typeLabels[type] || type} size="small" color={typeColors[type] || 'default'} variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
            <span>{name}{className ? ` (${className})` : ''}</span>
          </Box>
        );
      },
    },
    { field: 'purpose', headerName: 'Purpose', width: 140 },
    {
      field: 'returned',
      headerName: 'Returned',
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
      field: 'returnCondition',
      headerName: 'Return Cond.',
      width: 110,
      valueFormatter: (value) => {
        if (!value) return '-';
        return value.charAt(0).toUpperCase() + value.slice(1);
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        const canReturn =
          !isDeleted &&
          !params.row.returned &&
          (params.row.issueType === 'individual' || params.row.issueType === 'class_use');
        return (
          <Box>
            {canReturn && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => setReturnDialog({ open: true, issue: params.row })}
                title="Process Return"
              >
                <ReturnIcon fontSize="small" />
              </IconButton>
            )}
            {!isDeleted && (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteDialog({ open: true, item: params.row })}
                title="Delete Issue"
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
        <Typography variant="h4">Lab Issue Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lab/issues/add')}
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
            <Grid item xs={12} md={2}>
              <Autocomplete
                options={labs}
                getOptionLabel={(option) => option.name}
                value={selectedLab}
                onChange={handleLabChange}
                renderInput={(params) => (
                  <TextField {...params} label="Lab" size="small" placeholder="All Labs" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Autocomplete
                options={filteredItems}
                getOptionLabel={(option) => option.name}
                value={selectedItem}
                onChange={(e, newValue) => setSelectedItem(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Item" size="small" placeholder="All Items" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                select
                label="Issue Type"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                size="small"
              >
                {issueTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
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
            <Grid item xs={12} md={1.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                    size="small"
                  />
                }
                label="Deleted"
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

      <ResponsiveDataGrid
          rows={issues}
          columns={columns}
          hideActionsOnMobile
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
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
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

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Issue"
        message="Are you sure you want to delete this issue record? This will also restore the inventory stock."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <ReturnDialog
        open={returnDialog.open}
        issue={returnDialog.issue}
        onClose={() => setReturnDialog({ open: false, issue: null })}
        onSuccess={loadIssues}
      />
    </Box>
  );
}
