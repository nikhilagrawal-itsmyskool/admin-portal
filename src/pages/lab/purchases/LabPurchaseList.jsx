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
  TextField,
  Autocomplete,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { labService } from '../../../services/labService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function LabPurchaseList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState([]);
  const [labs, setLabs] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

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

    loadPurchasesWithFilters(overrides);
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

  const loadPurchasesWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.labId && selectedLab) filters.labId = selectedLab.uuid;
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await labService.getPurchases(filters);
      setPurchases(data);
    } catch (err) {
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = () => loadPurchasesWithFilters();

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
    loadPurchases();
  };

  const handleClear = () => {
    setSelectedLab(null);
    setSelectedItem(null);
    setStartDate('');
    setEndDate('');
    setIncludeDeleted(false);
    setFilteredItems(items);
    setSearchParams({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await labService.deletePurchase(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadPurchases();
    } catch (err) {
      setError('Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return parseFloat(value).toFixed(2);
  };

  const columns = [
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 180 },
    {
      field: 'purchaseDate',
      headerName: 'Purchase Date',
      width: 130,
      valueFormatter: (value) => formatDate(value),
    },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    {
      field: 'costPerUnit',
      headerName: 'Cost/Unit',
      width: 100,
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'totalCost',
      headerName: 'Total Cost',
      width: 110,
      valueGetter: (value, row) => row.quantity * parseFloat(row.costPerUnit || 0),
      valueFormatter: (value) => formatCurrency(value),
    },
    { field: 'supplier', headerName: 'Supplier', width: 140 },
    { field: 'batchNo', headerName: 'Batch No.', width: 110 },
    {
      field: 'expiryDate',
      headerName: 'Expiry',
      width: 110,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'warrantyEndDate',
      headerName: 'Warranty End',
      width: 120,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
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
        <Typography variant="h4">Lab Purchase Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lab/purchases/add')}
        >
          Add Purchase
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
            <Grid item xs={12} md={2.5}>
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
            <Grid item xs={12} md={2.5}>
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

      <Card>
        <DataGrid
          rows={purchases}
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
        title="Delete Purchase"
        message="Are you sure you want to delete this purchase record? This will also adjust the inventory stock."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
