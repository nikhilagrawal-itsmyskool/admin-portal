import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  TextField,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { assetService } from '../../services/assetService';

// One row in the drill-down grid -> "Building 1 › Floor 1 › Room 1".
function breadcrumb(ancestors) {
  if (!ancestors || ancestors.length === 0) return '—';
  // API returns immediate parent first; show root → leaf for readability.
  return [...ancestors].reverse().map((a) => a.name).join(' › ');
}

export default function AssetCounts() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [detail, setDetail] = useState(null); // { typeLabel, total, rows }
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await assetService.getSummary();
      setSummary(Array.isArray(data) ? data : []);
      // Default selection: the type with the most units.
      if (Array.isArray(data) && data.length > 0) {
        const top = [...data].sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0))[0];
        setSelectedType(top.typeId);
      }
    } catch (err) {
      setError('Failed to load asset summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (!selectedType) return;
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const data = await assetService.getCounts(selectedType);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError('Failed to load asset counts');
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedType]);

  const chartData = useMemo(
    () =>
      [...summary]
        .sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
        .slice(0, 12)
        .map((s) => ({ name: s.typeLabel || s.typeCode, qty: s.totalQuantity || 0 })),
    [summary]
  );

  const columns = [
    {
      field: 'assetCode',
      headerName: 'Tag',
      width: 220,
      renderCell: (p) =>
        p.value ? <code>{p.value}</code> : <Chip label="bucket" size="small" variant="outlined" />,
    },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 140 },
    { field: 'quantity', headerName: 'Qty', width: 90, type: 'number' },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      valueGetter: (value, row) => breadcrumb(row.ancestors),
    },
  ];

  if (loadingSummary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/asset')}><BackIcon /></IconButton>
        <Typography variant="h4">Asset Counts</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Overview: every type's total at a glance */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summary.map((s) => (
          <Grid item xs={6} sm={4} md={2} key={s.typeId}>
            <Card sx={{ outline: s.typeId === selectedType ? '2px solid #3366ff' : 'none' }}>
              <CardActionArea onClick={() => setSelectedType(s.typeId)}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#8f9bb3' }} noWrap>
                    {s.typeLabel || s.typeCode}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>{s.totalQuantity ?? 0}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
        {summary.length === 0 && (
          <Grid item xs={12}><Alert severity="info">No assets recorded yet.</Alert></Grid>
        )}
      </Grid>

      {chartData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#8f9bb3' }}>
              Totals by type (top {chartData.length})
            </Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#3366ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Drill-down */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Asset type"
          size="small"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {summary.map((s) => (
            <MenuItem key={s.typeId} value={s.typeId}>{s.typeLabel || s.typeCode}</MenuItem>
          ))}
        </TextField>
        {detail && (
          <Typography variant="h6">
            Total: <strong>{detail.total}</strong>
            <Typography component="span" variant="body2" sx={{ color: '#8f9bb3', ml: 1 }}>
              ({detail.rows?.length || 0} record{(detail.rows?.length || 0) === 1 ? '' : 's'})
            </Typography>
          </Typography>
        )}
      </Box>

      <Card>
        <DataGrid
          rows={detail?.rows || []}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loadingDetail}
          autoHeight
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
        />
      </Card>
    </Box>
  );
}
