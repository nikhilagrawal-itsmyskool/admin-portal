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
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { sportsService } from '../../../services/sportsService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function SportBreakageList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.SPORTS_MANAGE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [breakages, setBreakages] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [imageDialog, setImageDialog] = useState({ open: false, url: null, mimeType: null, fileName: null });

  // Filter state
  const [selectedSportType, setSelectedSportType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    loadSportsAndItems();
  }, []);

  useEffect(() => {
    if (sportTypes.length === 0 && items.length === 0) return;

    const sportType = searchParams.get('sportType');
    const itemId = searchParams.get('item');
    const overrides = {};

    if (sportType) {
      const type = sportTypes.find((t) => t.value === sportType);
      if (type) {
        setSelectedSportType(type);
        setFilteredItems(items.filter((i) => i.sportType === sportType));
        overrides.sportType = sportType;
      }
    }
    if (itemId) {
      const item = items.find((i) => i.uuid === itemId);
      if (item) {
        setSelectedItem(item);
        overrides.itemId = itemId;
      }
    }

    loadBreakagesWithFilters(overrides);
  }, [sportTypes, items]);

  const loadSportsAndItems = async () => {
    try {
      const [typesData, itemsData] = await Promise.all([
        sportsService.getSportTypes(),
        sportsService.getItems(),
      ]);
      setSportTypes(typesData.sportTypes || []);
      setItems(itemsData);
      setFilteredItems(itemsData);
    } catch (err) {
      console.error('Failed to load sport types/items:', err);
    }
  };

  const loadBreakagesWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const filters = { ...overrideFilters };
      if (!filters.sportType && selectedSportType) filters.sportType = selectedSportType.value;
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await sportsService.getBreakages(filters);
      setBreakages(data);
    } catch (err) {
      setError('Failed to load breakages');
    } finally {
      setLoading(false);
    }
  };

  const loadBreakages = () => loadBreakagesWithFilters();

  const handleSportChange = (event, newValue) => {
    setSelectedSportType(newValue);
    setSelectedItem(null);
    if (newValue) {
      setFilteredItems(items.filter((i) => i.sportType === newValue.value));
    } else {
      setFilteredItems(items);
    }
  };

  const handleSearch = () => {
    loadBreakages();
  };

  const handleClear = () => {
    setSelectedSportType(null);
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
      await sportsService.deleteBreakage(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadBreakages();
    } catch (err) {
      setError('Failed to delete breakage');
    } finally {
      setDeleting(false);
    }
  };

  const openImage = async (breakageId) => {
    try {
      const file = await sportsService.getBreakageImage(breakageId);
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      setImageDialog({ open: true, url, mimeType: file.mimeType, fileName: file.fileName });
    } catch {
      setError('Failed to load image');
    }
  };

  const closeImage = () => {
    if (imageDialog.url) URL.revokeObjectURL(imageDialog.url);
    setImageDialog({ open: false, url: null, mimeType: null, fileName: null });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return parseFloat(value).toFixed(2);
  };

  const responsibleTypeLabels = {
    student: 'Student',
    teacher: 'Teacher',
    wear_and_tear: 'Wear & Tear',
    unknown: 'Unknown',
  };

  const columns = [
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 160 },
    {
      field: 'breakageDate',
      headerName: 'Date',
      width: 110,
      valueFormatter: (value) => formatDate(value),
    },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    {
      field: 'responsibleType',
      headerName: 'Responsible',
      width: 120,
      renderCell: (params) => {
        if (!params.value) return '-';
        return (
          <Chip
            label={responsibleTypeLabels[params.value] || params.value}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    { field: 'responsibleName', headerName: 'Name', width: 130 },
    { field: 'cause', headerName: 'Cause', width: 130,
      valueFormatter: (value) => {
        if (!value) return '-';
        return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      },
    },
    {
      field: 'estimatedCost',
      headerName: 'Est. Cost',
      width: 100,
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'actionTaken',
      headerName: 'Action',
      width: 120,
      valueFormatter: (value) => {
        if (!value) return '-';
        return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      },
    },
    {
      field: 'breakageStatus',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          size="small"
          color={params.value === 'resolved' ? 'success' : 'warning'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            {params.row.fileId && (
              <IconButton
                size="small"
                color="primary"
                title="View image"
                onClick={() => openImage(params.row.uuid)}
              >
                <ImageIcon fontSize="small" />
              </IconButton>
            )}
            {canManage && (
              <IconButton
                size="small"
                onClick={() => navigate(`/sports/breakages/${params.row.uuid}/edit`)}
                title="Edit Breakage"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {!isDeleted && canManage && (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteDialog({ open: true, item: params.row })}
                title="Delete Breakage"
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
        <Typography variant="h4">Sport Breakage Log</Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/sports/breakages/add')}
          >
            Add Breakage
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

      <ResponsiveDataGrid
          rows={breakages}
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
        title="Delete Breakage"
        message="Are you sure you want to delete this breakage record? This will also restore the inventory stock."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <Dialog open={imageDialog.open} onClose={closeImage} maxWidth="md" fullWidth>
        <DialogTitle>Image — {imageDialog.fileName || '...'}</DialogTitle>
        <DialogContent
          dividers
          sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {imageDialog.url && (
            imageDialog.mimeType === 'application/pdf' ? (
              <Box
                component="iframe"
                src={imageDialog.url}
                title="image"
                sx={{ width: '100%', height: 560, border: 'none' }}
              />
            ) : (
              <Box
                component="img"
                src={imageDialog.url}
                alt="breakage"
                sx={{ maxWidth: '100%', maxHeight: 560, objectFit: 'contain' }}
              />
            )
          )}
        </DialogContent>
        <DialogActions>
          {imageDialog.url && (
            <Button
              component="a"
              href={imageDialog.url}
              download={imageDialog.fileName}
              size="small"
            >
              Download
            </Button>
          )}
          <Button onClick={closeImage}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
