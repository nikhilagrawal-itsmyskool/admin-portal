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
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { medicalService } from '../../../services/medicalService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function PurchaseList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [selectedItem, setSelectedItem] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

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
        loadPurchasesWithFilters({ itemId: item.uuid });
        return;
      }
    }
    // Only load on initial mount when no URL params or items not loaded yet
    if (items.length === 0 || !searchParams.get('item')) {
      loadPurchases();
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

  const loadPurchasesWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await medicalService.getPurchases(filters);
      setPurchases(data);
    } catch (err) {
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = () => loadPurchasesWithFilters();

  const handleSearch = () => {
    loadPurchases();
  };

  const handleClear = () => {
    setSelectedItem(null);
    setStartDate('');
    setEndDate('');
    setIncludeDeleted(false);
    setSearchParams({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await medicalService.deletePurchase(deleteDialog.item.uuid);
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
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 200 },
    {
      field: 'purchaseDate',
      headerName: 'Purchase Date',
      width: 130,
      valueFormatter: (value) => formatDate(value),
    },
    { field: 'quantity', headerName: 'Quantity', width: 100 },
    { field: 'batchNo', headerName: 'Batch No.', width: 120 },
    {
      field: 'expiryDate',
      headerName: 'Expiry Date',
      width: 130,
      valueFormatter: (value) => formatDate(value),
    },
    { field: 'supplier', headerName: 'Supplier', width: 150 },
    {
      field: 'costPerUnit',
      headerName: 'Cost/Unit',
      width: 100,
      valueFormatter: (value) => formatCurrency(value),
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
              onClick={() => navigate(`/medical/purchases/${params.row.uuid}/edit`)}
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
        <Typography variant="h4">Purchase Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/medical/purchases/add')}
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
            <Grid item xs={12} md={4}>
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
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                  />
                }
                label="Include deleted"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
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
