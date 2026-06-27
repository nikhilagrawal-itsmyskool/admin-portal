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
  InputAdornment,
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
} from '@mui/icons-material';
import { sportsService } from '../../../services/sportsService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function SportItemList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.SPORTS_MANAGE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [selectedSportType, setSelectedSportType] = useState(null);
  const [category, setCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [categories, setCategories] = useState([]);

  const sportTypeLabel = (v) => sportTypes.find((t) => t.value === v)?.label || v;

  useEffect(() => {
    loadSportTypes();
  }, []);

  useEffect(() => {
    const sportType = searchParams.get('sportType');
    if (sportType && sportTypes.length > 0) {
      const type = sportTypes.find((t) => t.value === sportType);
      if (type) {
        setSelectedSportType(type);
        loadCategories(type.value);
        loadItemsWithFilters({ sportType: type.value });
        return;
      }
    }
    if (sportTypes.length === 0 || !searchParams.get('sportType')) {
      loadItems();
    }
  }, [sportTypes]);

  const loadSportTypes = async () => {
    try {
      const data = await sportsService.getSportTypes();
      setSportTypes(data.sportTypes || []);
    } catch (err) {
      console.error('Failed to load sport types:', err);
    }
  };

  const loadCategories = async (sportType) => {
    try {
      const data = await sportsService.getCategories(sportType);
      if (sportType && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else if (sportType && data.categories?.[sportType]) {
        setCategories(data.categories[sportType]);
      } else {
        const allCategories = Object.values(data.categories || {}).flat();
        setCategories([...new Set(allCategories)]);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadItemsWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.sportType && selectedSportType) filters.sportType = selectedSportType.value;
      if (category) filters.category = category;
      if (itemType) filters.itemType = itemType;
      if (searchTerm) filters.search = searchTerm;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await sportsService.getItems(filters);
      setItems(data);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = () => loadItemsWithFilters();

  const handleSportChange = (event, newValue) => {
    setSelectedSportType(newValue);
    setCategory('');
    if (newValue) {
      loadCategories(newValue.value);
    } else {
      loadCategories();
    }
  };

  const handleSearch = () => {
    loadItems();
  };

  const handleClear = () => {
    setSelectedSportType(null);
    setCategory('');
    setItemType('');
    setSearchTerm('');
    setIncludeDeleted(false);
    setCategories([]);
    setSearchParams({});
    loadItemsWithFilters({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await sportsService.deleteItem(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadItems();
    } catch (err) {
      setError('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return parseFloat(value).toFixed(2);
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'sportType',
      headerName: 'Sport',
      width: 140,
      renderCell: (params) => sportTypeLabel(params.value),
    },
    { field: 'category', headerName: 'Category', width: 120 },
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
        const isLow = params.row.currentStock <= params.row.reorderLevel;
        return (
          <Chip
            label={params.value}
            size="small"
            color={isLow ? 'error' : 'default'}
            variant={isLow ? 'filled' : 'outlined'}
          />
        );
      },
    },
    {
      field: 'itemCondition',
      headerName: 'Condition',
      width: 110,
      renderCell: (params) => {
        if (!params.value) return '-';
        const conditionColors = {
          new: 'success',
          good: 'primary',
          fair: 'warning',
          needs_repair: 'error',
          condemned: 'default',
        };
        const label = params.value.replace('_', ' ');
        return (
          <Chip
            label={label.charAt(0).toUpperCase() + label.slice(1)}
            size="small"
            color={conditionColors[params.value] || 'default'}
            variant="outlined"
          />
        );
      },
    },
    { field: 'reorderLevel', headerName: 'Reorder', width: 80 },
    {
      field: 'costPerUnit',
      headerName: 'Ref. Cost',
      width: 100,
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            {canManage && (
              <IconButton
                size="small"
                onClick={() => navigate(`/sports/items/${params.row.uuid}/edit`)}
                title="Edit Item"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/sports/purchases?item=${params.row.uuid}&sportType=${params.row.sportType}`)}
              title="View Purchases"
            >
              <PurchaseIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="secondary"
              onClick={() => navigate(`/sports/issues?item=${params.row.uuid}&sportType=${params.row.sportType}`)}
              title="View Issues"
            >
              <IssueIcon fontSize="small" />
            </IconButton>
            {!isDeleted && canManage && (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteDialog({ open: true, item: params.row })}
                title="Delete Item"
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
        <Typography variant="h4">Sport Inventory Items</Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/sports/items/add')}
          >
            Add Item
          </Button>
        )}
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
                options={sportTypes}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(o, v) => o.value === v.value}
                value={selectedSportType}
                onChange={handleSportChange}
                renderInput={(params) => (
                  <TextField {...params} label="Sport" size="small" placeholder="All Sports" />
                )}
              />
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
                <MenuItem value="">All</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                select
                label="Type"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
                <MenuItem value="consumable">Consumable</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
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
            <Grid item xs={12} md={2.5}>
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
          primaryChipField="currentStock"
          rows={items}
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
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.item?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
