import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, IconButton, Alert, Chip, TextField, Grid,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Clear as ClearIcon,
} from '@mui/icons-material';
import { transportService } from '../../../services/transportService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCan } from '../../../permissions/can';

const TYPE_LABELS = { bus: 'Bus', van: 'Van', other: 'Other' };
const OWNERSHIP_LABELS = { owned: 'School Owned', contract: 'On Contract' };

export default function VehicleList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('transport.manage');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const load = async (overrideSearch) => {
    setLoading(true); setError('');
    try {
      const s = overrideSearch !== undefined ? overrideSearch : search;
      const data = await transportService.getVehicles(s ? { search: s } : {});
      setVehicles(data || []);
    } catch {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transportService.deleteVehicle(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete vehicle');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'registrationNumber', headerName: 'Registration', width: 150 },
    { field: 'vehicleType', headerName: 'Type', width: 90, valueFormatter: (v) => TYPE_LABELS[v] || v },
    { field: 'makeModel', headerName: 'Make / Model', flex: 1, minWidth: 160, valueFormatter: (v) => v || '-' },
    {
      field: 'ownership', headerName: 'Ownership', width: 130,
      renderCell: (params) => <Chip size="small" variant="outlined" label={OWNERSHIP_LABELS[params.value] || params.value}
        color={params.value === 'owned' ? 'success' : 'default'} />,
    },
    { field: 'driverName', headerName: 'Driver', width: 130, valueFormatter: (v) => v || '-' },
    { field: 'driverPhone', headerName: 'Driver Phone', width: 130, valueFormatter: (v) => v || '-' },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (params) => canManage && (
        <Box>
          <IconButton size="small" title="Edit" onClick={() => navigate(`/transport/vehicles/${params.row.uuid}/edit`)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Vehicles</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/transport/vehicles/add')}>Add Vehicle</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField fullWidth size="small" label="Search registration / make" value={search}
                onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" startIcon={<SearchIcon />} onClick={() => load()}>Search</Button>
                <Button variant="outlined" size="small" startIcon={<ClearIcon />} onClick={() => { setSearch(''); load(''); }}>Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={vehicles}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Vehicle"
        message={`Delete vehicle "${deleteDialog.item?.registrationNumber || ''}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
