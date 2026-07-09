import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Checkbox,
  Grid,
  useMediaQuery,
  useTheme,
  Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as PurchaseIcon,
  Assignment as IssueIcon,
} from '@mui/icons-material';
import { medicalService } from '../../../services/medicalService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function ItemList() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async (search = '', includeDeletedParam = false) => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (search) filters.search = search;
      if (includeDeletedParam) filters.includeDeleted = true;
      const data = await medicalService.getItems(filters);
      setItems(data);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadItems(searchTerm, includeDeleted);
  };

  const handleClear = () => {
    setSearchTerm('');
    setIncludeDeleted(false);
    loadItems('', false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await medicalService.deleteItem(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadItems(searchTerm);
    } catch (err) {
      setError('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'unit', headerName: 'Unit', width: 100 },
    {
      field: 'currentStock',
      headerName: 'Stock',
      width: 100,
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
    { field: 'reorderLevel', headerName: 'Reorder Level', width: 120 },
    { field: 'comments', headerName: 'Comments', flex: 1, minWidth: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => navigate(`/medical/items/${params.row.uuid}/edit`)}
              title="Edit Item"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/medical/purchases?item=${params.row.uuid}`)}
              title="View Purchase Log"
            >
              <PurchaseIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="secondary"
              onClick={() => navigate(`/medical/issues?item=${params.row.uuid}`)}
              title="View Issue Log"
            >
              <IssueIcon fontSize="small" />
            </IconButton>
            {!isDeleted && (
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
        <Typography variant="h5">Inventory Items</Typography>
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/medical/items/add')}
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
            <Grid item xs={12} sm={6} md={5}>
              <TextField
                fullWidth
                placeholder="Search items by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={3}>
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
            <Grid item xs={12} sm="auto">
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleSearch} fullWidth={isMobile}>
                  Search
                </Button>
                <Button variant="outlined" onClick={handleClear} fullWidth={isMobile}>
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isMobile ? (
        <Stack spacing={2}>
          {loading && (
            <Typography color="text.secondary" textAlign="center">
              Loading...
            </Typography>
          )}
          {!loading && items.length === 0 && (
            <Typography color="text.secondary" textAlign="center">
              No items found.
            </Typography>
          )}
          {items.map((item) => {
            const isLow = item.currentStock <= item.reorderLevel;
            const isDeleted = item.status === 'deleted';
            return (
              <Card
                key={item.uuid}
                sx={isDeleted ? { opacity: 0.6, bgcolor: 'rgba(244, 67, 54, 0.04)' } : {}}
              >
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={isDeleted ? { textDecoration: 'line-through' } : {}}
                    >
                      {item.name}
                    </Typography>
                    <Chip
                      label={`${item.currentStock} ${item.unit}`}
                      size="small"
                      color={isLow ? 'error' : 'default'}
                      variant={isLow ? 'filled' : 'outlined'}
                    />
                  </Box>
                  {item.comments && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.comments}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Reorder at: {item.reorderLevel}
                  </Typography>
                  {/* Mobile is view-only for inventory items — no row actions. */}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <Card>
          <DataGrid
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
        </Card>
      )}

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
