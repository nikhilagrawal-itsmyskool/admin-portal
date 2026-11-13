import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

// "Needs attention" options — each maps to a `missing` filter the API understands.
const MISSING_OPTIONS = [
  { value: '', label: 'All books' },
  { value: 'any', label: 'Needs attention (author / DDC / price)' },
  { value: 'author', label: 'Missing author' },
  { value: 'ddc', label: 'Missing DDC' },
  { value: 'price', label: 'Missing price' },
  { value: 'acqYear', label: 'Missing acquisition year' },
  { value: 'location', label: 'Missing shelf location' },
];

// A muted em-dash so blank (missing) cells read as "needs filling" at a glance.
const Blank = () => <Typography component="span" variant="body2" color="text.disabled">—</Typography>;

// Price/year come back as a per-work min & max across copies: show one value when
// uniform, a range when copies differ, and the Blank marker when unset.
function fmtMoney(min, max) {
  if (min == null) return <Blank />;
  const lo = Number(min);
  const hi = Number(max);
  return lo === hi ? `₹${lo}` : `₹${lo}–${hi}`;
}
function fmtRange(min, max) {
  if (min == null) return <Blank />;
  return min === max ? String(min) : `${min}–${max}`;
}

export default function WorkList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.LIBRARY_CATALOG_MANAGE);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalCopies, setTotalCopies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Typed vs applied search: the API call only uses `appliedQ` (set on Search).
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [minCopies, setMinCopies] = useState(0); // 0 = off, 2 = >1 copy, 11 = >10 copies
  const [missing, setMissing] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      };
      if (appliedQ) params.q = appliedQ;
      if (minCopies) params.minCopies = minCopies;
      if (missing) params.missing = missing;
      const data = await libraryService.searchWorks(params);
      setRows(data.works || []);
      setTotal(data.total ?? (data.works ? data.works.length : 0));
      setTotalCopies(data.totalCopies ?? 0);
    } catch (err) {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [appliedQ, minCopies, missing, paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const toPageZero = () => setPaginationModel((m) => ({ ...m, page: 0 }));

  const handleSearch = () => {
    toPageZero();
    setAppliedQ(searchTerm.trim());
  };
  const handleClear = () => {
    setSearchTerm('');
    setAppliedQ('');
    setMinCopies(0);
    setMissing('');
    toPageZero();
  };
  const toggleMinCopies = (v) => {
    toPageZero();
    setMinCopies((cur) => (cur === v ? 0 : v));
  };
  const changeMissing = (v) => {
    toPageZero();
    setMissing(v);
  };

  const hasFilters = Boolean(appliedQ || minCopies || missing);

  const columns = [
    { field: 'uniformTitle', headerName: 'Title', flex: 1, minWidth: 220 },
    { field: 'authorDisplay', headerName: 'Author', flex: 1, minWidth: 180, renderCell: (p) => p.value || '—' },
    { field: 'ddcNumber', headerName: 'DDC', width: 90, renderCell: (p) => p.value || '—' },
    {
      field: 'colorCode',
      headerName: 'Color',
      width: 110,
      renderCell: (p) => (p.value ? <Chip label={p.value} size="small" variant="outlined" /> : '—'),
    },
    { field: 'titleCount', headerName: 'Editions', width: 90, type: 'number' },
    { field: 'totalCopies', headerName: 'Copies', width: 90, type: 'number' },
    {
      field: 'availableCopies',
      headerName: 'Available',
      width: 110,
      renderCell: (p) => (
        <Chip
          label={`${p.value} / ${p.row.totalCopies}`}
          size="small"
          color={Number(p.value) > 0 ? 'success' : 'default'}
          variant={Number(p.value) > 0 ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 110,
      sortable: false,
      renderCell: (p) => fmtMoney(p.row.priceMin, p.row.priceMax),
    },
    {
      field: 'acq',
      headerName: 'Acq. Yr',
      width: 100,
      sortable: false,
      renderCell: (p) => fmtRange(p.row.acqMin, p.row.acqMax),
    },
    {
      field: 'locations',
      headerName: 'Location',
      width: 140,
      sortable: false,
      renderCell: (p) => p.row.locations || <Blank />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => navigate(`/library/catalog/${params.row.uuid}`)} title="View">
          <ViewIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Library Catalog
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1.5 }}>
            {total.toLocaleString()} {total === 1 ? 'title' : 'titles'} · {totalCopies.toLocaleString()} {totalCopies === 1 ? 'copy' : 'copies'}
          </Typography>
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/library/catalog/new')} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Catalog a Book
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Search by title or author..."
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
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Needs attention"
                value={missing}
                onChange={(e) => changeMissing(e.target.value)}
              >
                {MISSING_OPTIONS.map((o) => (
                  <MenuItem key={o.value || 'all'} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch} size="small">Search</Button>
                <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear} size="small" disabled={!hasFilters && !searchTerm}>Clear</Button>
              </Box>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Quick filters:</Typography>
            <Chip
              label="More than 1 copy"
              size="small"
              color={minCopies === 2 ? 'primary' : 'default'}
              variant={minCopies === 2 ? 'filled' : 'outlined'}
              onClick={() => toggleMinCopies(2)}
            />
            <Chip
              label="More than 10 copies"
              size="small"
              color={minCopies === 11 ? 'primary' : 'default'}
              variant={minCopies === 11 ? 'filled' : 'outlined'}
              onClick={() => toggleMinCopies(11)}
            />
          </Stack>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        paginationMode="server"
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/library/catalog/${params.row.uuid}`)}
        emptyMessage="No books match these filters."
        sx={{
          border: 'none',
          cursor: 'pointer',
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
        }}
      />
    </Box>
  );
}
