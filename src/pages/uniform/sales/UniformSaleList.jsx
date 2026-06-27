import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, Alert,
  IconButton, Chip, MenuItem, Select, InputLabel, FormControl, OutlinedInput,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';

const PAYMENT_COLORS = { paid: 'success', partial: 'warning', due: 'error' };
const PAYMENT_LABELS = { paid: 'Paid', partial: 'Partial', due: 'Due' };
const SALE_TYPE_LABELS = { student: 'Student', bulk: 'Bulk' };

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

export default function UniformSaleList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentStatus, setPaymentStatus] = useState(() => {
    const s = searchParams.get('paymentStatus');
    return s ? s.split(',').filter(Boolean) : [];
  });
  const [saleType, setSaleType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async (overrides) => {
    setLoading(true);
    setError('');
    try {
      const filters = overrides !== undefined ? overrides : {
        ...(paymentStatus.length > 0 ? { paymentStatus: paymentStatus.join(',') } : {}),
        ...(saleType ? { saleType } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(search ? { search } : {}),
      };
      const data = await uniformService.getSales(filters);
      setSales(data);
    } catch {
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPaymentStatus([]); setSaleType(''); setStartDate(''); setEndDate(''); setSearch('');
    setSearchParams({});
    load({});
  };

  const columns = [
    { field: 'saleDate', headerName: 'Date', width: 110, valueFormatter: (v) => formatDate(v) },
    { field: 'studentName', headerName: 'Student', flex: 1, minWidth: 140 },
    { field: 'saleType', headerName: 'Type', width: 90, valueFormatter: (v) => SALE_TYPE_LABELS[v] || v },
    { field: 'totalAmount', headerName: 'Total', width: 110, valueFormatter: (v) => formatCurrency(v) },
    { field: 'amountPaid', headerName: 'Paid', width: 110, valueFormatter: (v) => formatCurrency(v) },
    {
      field: 'pending', headerName: 'Pending', width: 110,
      valueGetter: (_, row) => row.paymentStatus === 'paid' ? null : Math.max(0, (row.totalAmount || 0) - (row.amountPaid || 0)),
      valueFormatter: (v) => v != null && v > 0 ? formatCurrency(v) : '—',
    },
    {
      field: 'paymentStatus', headerName: 'Payment', width: 110,
      renderCell: (params) => (
        <Chip label={PAYMENT_LABELS[params.value] || params.value} size="small" color={PAYMENT_COLORS[params.value] || 'default'} />
      ),
    },
    {
      field: 'actions', headerName: 'Actions', width: 70, sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => navigate(`/uniform/sales/${params.row.uuid}`)}>
          <ViewIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Sales</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/uniform/sales/new')}>New Sale</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select multiple value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} input={<OutlinedInput label="Payment Status" />} renderValue={sel => sel.map(s => PAYMENT_LABELS[s] || s).join(', ')}>
                  {Object.entries(PAYMENT_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField fullWidth select label="Type" value={saleType} onChange={e => setSaleType(e.target.value)} size="small">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="bulk">Bulk</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth label="Search student name" value={search} onChange={e => setSearch(e.target.value)} size="small" onKeyDown={e => e.key === 'Enter' && load()} />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" onClick={() => load()}>Search</Button>
                <Button variant="outlined" size="small" onClick={handleClear}>Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={sales}
          columns={columns}
          getRowId={r => r.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 }, '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' } }}
        />
    </Box>
  );
}
