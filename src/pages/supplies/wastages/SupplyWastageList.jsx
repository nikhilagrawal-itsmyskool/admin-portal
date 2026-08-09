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
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { suppliesService } from '../../../services/suppliesService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { fmtDate } from '../../../utils/date';

const reasonLabels = { spoiled: 'Spoiled', expired: 'Expired', damaged: 'Damaged', lost: 'Lost', used_up: 'Used Up', other: 'Other' };
const reasonColors = { spoiled: 'warning', expired: 'warning', damaged: 'error', lost: 'error', used_up: 'default', other: 'default' };

export default function SupplyWastageList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.SUPPLIES_MANAGE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [wastages, setWastages] = useState([]);
  const [items, setItems] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const itemId = searchParams.get('item');
    const overrides = {};
    if (itemId) {
      const item = items.find((i) => i.uuid === itemId);
      if (item) { setSelectedItem(item); overrides.itemId = itemId; }
    }
    loadWastagesWithFilters(overrides);
  }, [items]);

  const loadData = async () => {
    try {
      const [itemsData, conditionsData] = await Promise.all([
        suppliesService.getItems(),
        suppliesService.getConditions(),
      ]);
      setItems(itemsData);
      setReasons(conditionsData.wastageReasons || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setItems([]);
      loadWastagesWithFilters({});
    }
  };

  const loadWastagesWithFilters = async (overrideFilters = {}) => {
    setLoading(true); setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (reason) filters.reason = reason;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;
      const data = await suppliesService.getWastages(filters);
      setWastages(data);
    } catch (err) {
      setError('Failed to load wastages');
    } finally {
      setLoading(false);
    }
  };

  const loadWastages = () => loadWastagesWithFilters();

  const handleClear = () => {
    setSelectedItem(null); setReason(''); setStartDate(''); setEndDate(''); setIncludeDeleted(false);
    setSearchParams({});
    loadWastagesWithFilters({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await suppliesService.deleteWastage(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadWastages();
    } catch {
      setError('Failed to delete wastage');
    } finally {
      setDeleting(false);
    }
  };


  const columns = [
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 160 },
    { field: 'wastageDate', headerName: 'Date', width: 120, valueFormatter: (value) => fmtDate(value) },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    {
      field: 'reason', headerName: 'Reason', width: 120,
      renderCell: (params) => <Chip label={reasonLabels[params.value] || params.value} size="small" color={reasonColors[params.value] || 'default'} variant="outlined" />,
    },
    {
      field: 'resolvedResponsibleName', headerName: 'Responsible', width: 180,
      renderCell: (params) => params.row.resolvedResponsibleName || params.row.responsibleName || '-',
    },
    {
      field: 'estimatedCost', headerName: 'Est. Cost', width: 100,
      valueFormatter: (value) => (value ? parseFloat(value).toFixed(2) : '-'),
    },
    {
      field: 'wastageStatus', headerName: 'Status', width: 110,
      renderCell: (params) => <Chip label={params.value === 'resolved' ? 'Resolved' : 'Reported'} size="small" color={params.value === 'resolved' ? 'success' : 'default'} variant="outlined" />,
    },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            {!isDeleted && canManage && <IconButton size="small" onClick={() => navigate(`/supplies/wastages/${params.row.uuid}/edit`)} title="Edit"><EditIcon fontSize="small" /></IconButton>}
            {!isDeleted && canManage && <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: params.row })} title="Delete"><DeleteIcon fontSize="small" /></IconButton>}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Supply Wastage Log</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/supplies/wastages/add')}>Record Wastage</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={items}
                getOptionLabel={(o) => o.name}
                value={selectedItem}
                onChange={(_, val) => setSelectedItem(val)}
                renderInput={(params) => <TextField {...params} label="Item" size="small" placeholder="All Items" />}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} size="small">
                <MenuItem value="">All</MenuItem>
                {reasons.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} md={1}>
              <FormControlLabel
                control={<Checkbox checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} size="small" />}
                label="Deleted"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={loadWastages} size="small">Search</Button>
                <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear} size="small">Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={wastages}
          columns={columns}
          getRowId={(row) => row.uuid}
          getRowClassName={(params) => (params.row.status === 'deleted' ? 'deleted-row' : '')}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
            '& .deleted-row': {
              opacity: 0.6,
              backgroundColor: 'rgba(244, 67, 54, 0.04)',
              '& .MuiDataGrid-cell:not(:last-of-type)': { textDecoration: 'line-through' },
            },
          }}
        />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Wastage"
        message="Delete this wastage record? This will restore the inventory stock."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
