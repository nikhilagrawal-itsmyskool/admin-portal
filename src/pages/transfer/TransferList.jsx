import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Alert,
  Chip,
  TextField,
  Grid,
  MenuItem,
  Button,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Visibility as ViewIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import usePersistedPaginationModel from '../../hooks/usePersistedPaginationModel';
import { transferService } from '../../services/transferService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const TC_STATUS_COLORS = { applied: 'warning', issued: 'success', cancelled: 'default' };
const d = (v) => (v ? String(v).slice(0, 10) : '—');

export default function TransferList() {
  const navigate = useNavigate();
  const can = useCan();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [paginationModel, setPaginationModel] = usePersistedPaginationModel('transferList', { page: 0, pageSize: 25 });

  // Page guard: only transfer.view (admin/god) reaches here via direct URL.
  useEffect(() => {
    if (!can(ACTIONS.TRANSFER_VIEW)) navigate('/', { replace: true });
  }, [can, navigate]);

  useEffect(() => {
    load({});
  }, []);

  const load = async (override) => {
    setLoading(true);
    setError('');
    try {
      const params = override !== undefined ? override : { ...(query ? { query } : {}), ...(status ? { status } : {}) };
      const data = await transferService.listTcs(params);
      setRows(data.tcs || []);
    } catch {
      setError('Failed to load transfer certificates');
    } finally {
      setLoading(false);
    }
  };

  const runSearch = () => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
    load();
  };
  const handleClear = () => {
    setQuery('');
    setStatus('');
    setPaginationModel((p) => ({ ...p, page: 0 }));
    load({});
  };

  const columns = [
    { field: 'studentName', headerName: 'Student', flex: 1, minWidth: 150, valueGetter: (v, row) => row.studentName || '—' },
    { field: 'admissionNumber', headerName: 'Adm #', width: 120, valueGetter: (v, row) => row.admissionNumber || '—' },
    { field: 'className', headerName: 'Class', width: 100, valueGetter: (v, row) => row.className || '—' },
    { field: 'srnNumber', headerName: 'SRN', width: 120, valueGetter: (v, row) => row.srnNumber || '—' },
    { field: 'applicationDate', headerName: 'Applied', width: 120, valueGetter: (v, row) => d(row.applicationDate) },
    { field: 'issueDate', headerName: 'Issued', width: 120, valueGetter: (v, row) => d(row.issueDate) },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => <Chip label={params.value} size="small" color={TC_STATUS_COLORS[params.value] || 'default'} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" title="Open student" onClick={() => navigate(`/students/${params.row.studentId}`)}>
          <ViewIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Transfer Certificates
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="Student name or admission #"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} size="small">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="applied">Applied</MenuItem>
                <MenuItem value="issued">Issued</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={runSearch} size="small">
                  Search
                </Button>
                <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear} size="small">
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        primaryChipField="status"
        mobilePageSize={25}
        emptyMessage="No transfer certificate records."
        rows={rows}
        columns={columns}
        getRowId={(row) => row.uuid}
        onCardClick={(row) => navigate(`/students/${row.studentId}`)}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50, 100]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
        }}
      />
    </Box>
  );
}
