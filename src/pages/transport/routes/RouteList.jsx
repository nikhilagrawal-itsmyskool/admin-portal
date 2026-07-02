import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, IconButton, Alert, Chip, TextField, Grid, MenuItem,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { transportService } from '../../../services/transportService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCan } from '../../../permissions/can';

export default function RouteList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('transport.manage');

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const load = async (dir) => {
    setLoading(true); setError('');
    try {
      const d = dir !== undefined ? dir : direction;
      const data = await transportService.getRoutes(d ? { direction: d } : {});
      setRoutes(data || []);
    } catch {
      setError('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transportService.deleteRoute(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete route');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Route', flex: 1, minWidth: 160 },
    {
      field: 'direction', headerName: 'Direction', width: 130,
      renderCell: (params) => <Chip size="small" label={params.value === 'morning' ? 'Morning' : 'Evening'}
        color={params.value === 'morning' ? 'warning' : 'info'} variant="outlined" />,
    },
    { field: 'vehicleRegistrationNumber', headerName: 'Vehicle', width: 150, valueFormatter: (v) => v || '-' },
    { field: 'stopCount', headerName: 'Stops', width: 90, valueFormatter: (v) => v ?? 0 },
    { field: 'driverName', headerName: 'Driver', width: 130, valueFormatter: (v) => v || '-' },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" title="Open / manage" onClick={() => navigate(`/transport/routes/${params.row.uuid}`)}><EditIcon fontSize="small" /></IconButton>
          {canManage && (
            <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Routes</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/transport/routes/new')}>Add Route</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Direction" value={direction}
                onChange={(e) => { setDirection(e.target.value); load(e.target.value); }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="morning">Morning</MenuItem>
                <MenuItem value="evening">Evening</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={routes}
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
        title="Delete Route"
        message={`Delete route "${deleteDialog.item?.name || ''}"? Routes with active student assignments cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
