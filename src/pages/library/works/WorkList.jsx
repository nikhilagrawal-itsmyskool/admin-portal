import React, { useState, useEffect } from 'react';
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

export default function WorkList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.LIBRARY_MANAGE);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async (q) => {
    setLoading(true);
    setError('');
    try {
      const data = await libraryService.searchWorks(q ? { q } : {});
      setWorks(data.works || []);
    } catch (err) {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => loadWorks(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    loadWorks();
  };

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
        <Typography variant="h4">Library Catalog</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/library/catalog/new')}>
            Catalog a Book
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch} size="small">Search</Button>
                <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear} size="small">Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={works}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/library/catalog/${params.row.uuid}`)}
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
