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
  Tooltip,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  LocalShipping as PurchaseIcon,
  Assignment as IssueIcon,
  MergeType as MergeIcon,
} from '@mui/icons-material';
import { suppliesService } from '../../../services/suppliesService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

function MergeDialog({ open, source, allItems, onClose, onSuccess }) {
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTarget(null);
    setError('');
  }, [open]);

  const options = allItems.filter((i) => i.uuid !== source?.uuid && i.status !== 'deleted');

  const handleMerge = async () => {
    if (!target) { setError('Select a target item'); return; }
    setSaving(true);
    setError('');
    try {
      await suppliesService.mergeItem(source.uuid, target.uuid);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to merge item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Merge "{source?.name}" into…</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          All purchases, issues and wastage of "{source?.name}" will be moved to the target item,
          its stock added, and "{source?.name}" deleted. This cannot be undone.
        </Typography>
        <Autocomplete
          options={options}
          getOptionLabel={(o) => `${o.name}${o.categoryName ? ` — ${o.categoryName}` : ''} (Stock: ${o.currentStock})`}
          value={target}
          onChange={(_, v) => setTarget(v)}
          renderInput={(params) => <TextField {...params} label="Target item" placeholder="Search item to keep..." />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleMerge} variant="contained" color="warning" disabled={saving}>
          {saving ? 'Merging...' : 'Merge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SupplyItemList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.SUPPLIES_MANAGE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [mergeDialog, setMergeDialog] = useState({ open: false, item: null });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [itemType, setItemType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    const categoryId = searchParams.get('categoryId');
    const wantLowStock = searchParams.get('lowStock') === 'true';
    const overrides = {};
    if (categoryId) {
      const cat = categories.find((c) => c.uuid === categoryId);
      if (cat) { setSelectedCategory(cat); overrides.categoryId = categoryId; }
    }
    if (wantLowStock) { setLowStock(true); overrides.lowStock = true; }
    loadItemsWithFilters(overrides);
  }, [categories]);

  const loadCategories = async () => {
    try {
      const data = await suppliesService.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([]);
      loadItemsWithFilters({});
    }
  };

  const loadItemsWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.categoryId && selectedCategory) filters.categoryId = selectedCategory.uuid;
      if (itemType) filters.itemType = itemType;
      if (searchTerm) filters.search = searchTerm;
      if (lowStock || filters.lowStock) filters.lowStock = true;
      if (includeDeleted) filters.includeDeleted = true;
      const data = await suppliesService.getItems(filters);
      setItems(data);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = () => loadItemsWithFilters();

  const handleClear = () => {
    setSelectedCategory(null);
    setItemType('');
    setSearchTerm('');
    setLowStock(false);
    setIncludeDeleted(false);
    setSearchParams({});
    loadItemsWithFilters({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await suppliesService.deleteItem(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadItems();
    } catch (err) {
      setError('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value) => (value ? parseFloat(value).toFixed(2) : '-');

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'categoryName', headerName: 'Category', width: 160 },
    {
      field: 'itemType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          size="small"
          color={params.value === 'equipment' ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    { field: 'unit', headerName: 'Unit', width: 80 },
    {
      field: 'currentStock',
      headerName: 'Stock',
      width: 90,
      renderCell: (params) => {
        const isLow = params.row.reorderLevel > 0 && params.row.currentStock <= params.row.reorderLevel;
        return <Chip label={params.value} size="small" color={isLow ? 'error' : 'default'} variant={isLow ? 'filled' : 'outlined'} />;
      },
    },
    { field: 'reorderLevel', headerName: 'Reorder', width: 80 },
    { field: 'costPerUnit', headerName: 'Ref. Cost', width: 100, valueFormatter: (value) => formatCurrency(value) },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 210,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            {canManage && (
              <Tooltip title="Edit Item">
                <IconButton size="small" onClick={() => navigate(`/supplies/items/${params.row.uuid}/edit`)}><EditIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
            <Tooltip title="View Purchases">
              <IconButton size="small" color="primary" onClick={() => navigate(`/supplies/purchases?item=${params.row.uuid}`)}><PurchaseIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="View Issues">
              <IconButton size="small" color="secondary" onClick={() => navigate(`/supplies/issues?item=${params.row.uuid}`)}><IssueIcon fontSize="small" /></IconButton>
            </Tooltip>
            {!isDeleted && canManage && (
              <Tooltip title="Merge into another item">
                <IconButton size="small" color="warning" onClick={() => setMergeDialog({ open: true, item: params.row })}><MergeIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
            {!isDeleted && canManage && (
              <Tooltip title="Delete Item">
                <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Supply Inventory Items</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/supplies/items/add')}>Add Item</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2.5}>
              <Autocomplete
                options={categories}
                getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={selectedCategory}
                onChange={(_, v) => setSelectedCategory(v)}
                renderInput={(params) => <TextField {...params} label="Category" size="small" placeholder="All" />}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField fullWidth select label="Type" value={itemType} onChange={(e) => setItemType(e.target.value)} size="small">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="consumable">Consumable</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadItems()}
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <FormControlLabel
                control={<Checkbox checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} size="small" />}
                label="Low stock"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <FormControlLabel
                control={<Checkbox checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} size="small" />}
                label="Deleted"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={loadItems} size="small">Search</Button>
                <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear} size="small">Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          primaryChipField="currentStock"
          rows={items}
          columns={columns}
          getRowId={(row) => row.uuid}
          getRowClassName={(params) => (params.row.status === 'deleted' ? 'deleted-row' : '')}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
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
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.item?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <MergeDialog
        open={mergeDialog.open}
        source={mergeDialog.item}
        allItems={items}
        onClose={() => setMergeDialog({ open: false, item: null })}
        onSuccess={loadItems}
      />
    </Box>
  );
}
