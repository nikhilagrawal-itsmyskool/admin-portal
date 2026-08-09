import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, Alert,
  IconButton, Chip,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import { Add as AddIcon, Visibility as ViewIcon, Delete as DeleteIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { fmtDate } from '../../../utils/date';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

export default function UniformPurchaseList() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (overrides) => {
    setLoading(true);
    setError('');
    try {
      const filters = overrides ?? {};
      if (!overrides) {
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (supplier) filters.supplier = supplier;
      }
      const data = await uniformService.getPurchases(filters);
      setPurchases(data);
    } catch {
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await uniformService.deletePurchase(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch {
      setError('Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'purchaseDate', headerName: 'Date', width: 110, valueFormatter: (v) => fmtDate(v) },
    { field: 'supplier', headerName: 'Supplier', flex: 1, minWidth: 140, valueFormatter: (v) => v || '—' },
    { field: 'invoiceNumber', headerName: 'Invoice #', width: 130, valueFormatter: (v) => v || '—' },
    { field: 'totalAmount', headerName: 'Total', width: 120, valueFormatter: (v) => formatCurrency(v) },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => navigate(`/uniform/purchases/${params.row.uuid}`)}>
            <ViewIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: params.row })}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Purchases</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/uniform/purchases/new')}>
          Record Purchase
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} md={2}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Supplier" value={supplier} onChange={e => setSupplier(e.target.value)} size="small" onKeyDown={e => e.key === 'Enter' && load()} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" onClick={() => load()}>Search</Button>
                <Button variant="outlined" size="small" onClick={() => { setStartDate(''); setEndDate(''); setSupplier(''); load({}); }}>Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={purchases}
          columns={columns}
          getRowId={r => r.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 }, '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' } }}
        />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Purchase"
        message="This will delete the purchase and reverse the stock. Are you sure?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
