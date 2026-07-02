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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  OutlinedInput,
} from '@mui/material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { hiringService } from '../../services/hiringService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCan } from '../../permissions/can';

const STATUS_COLORS = {
  applied: 'default',
  screening: 'info',
  interview: 'info',
  demo: 'info',
  final_round: 'warning',
  selected: 'success',
  rejected: 'error',
  on_hold: 'warning',
  withdrawn: 'default',
};

const toLabelMap = (arr) =>
  (arr || []).reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});

export default function HiringCandidateList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('hiring.manage');

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const [lookups, setLookups] = useState({
    positionTypes: [],
    subjects: [],
    statuses: [],
  });

  // Filters
  const [status, setStatus] = useState([]);
  const [positionType, setPositionType] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');

  const positionLabels = toLabelMap(lookups.positionTypes);
  const subjectLabels = toLabelMap(lookups.subjects);
  const statusLabels = toLabelMap(lookups.statuses);

  useEffect(() => {
    (async () => {
      try {
        const data = await hiringService.getLookups();
        setLookups(data);
      } catch {
        // dropdowns fall back to raw values
      }
    })();
    loadCandidates();
  }, []);

  const buildFilters = () => {
    const filters = {};
    if (status.length > 0) filters.status = status.join(',');
    if (positionType) filters.positionType = positionType;
    if (subject) filters.subject = subject;
    if (search) filters.search = search;
    return filters;
  };

  const loadCandidates = async (overrideFilters) => {
    setLoading(true);
    setError('');
    try {
      const filters = overrideFilters !== undefined ? overrideFilters : buildFilters();
      const data = await hiringService.getCandidates(filters);
      setCandidates(data);
    } catch {
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setStatus([]);
    setPositionType('');
    setSubject('');
    setSearch('');
    loadCandidates({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await hiringService.deleteCandidate(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadCandidates();
    } catch {
      setError('Failed to withdraw candidate');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'positionType',
      headerName: 'Position',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={positionLabels[params.value] || params.value}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'subject',
      headerName: 'Subject',
      width: 140,
      valueFormatter: (value) => subjectLabels[value] || value || '-',
    },
    {
      field: 'mobile',
      headerName: 'Mobile',
      width: 130,
      valueFormatter: (value) => value || '-',
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
      valueFormatter: (value) => value || '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={statusLabels[params.value] || params.value}
          size="small"
          color={STATUS_COLORS[params.value] || 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            title="View candidate"
            onClick={() => navigate(`/hiring/${params.row.uuid}`)}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
          {canManage && (
            <IconButton
              size="small"
              title="Edit candidate"
              onClick={() => navigate(`/hiring/${params.row.uuid}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {canManage && (
            <IconButton
              size="small"
              color="error"
              title="Withdraw candidate"
              onClick={() => setDeleteDialog({ open: true, item: params.row })}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Hiring</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/hiring/new')}>
            Add Candidate
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
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  multiple
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  input={<OutlinedInput label="Status" />}
                  renderValue={(selected) => selected.map((s) => statusLabels[s] || s).join(', ')}
                >
                  {lookups.statuses.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                label="Position"
                value={positionType}
                onChange={(e) => setPositionType(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Positions</MenuItem>
                {lookups.positionTypes.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Subjects</MenuItem>
                {lookups.subjects.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3.5}>
              <TextField
                fullWidth
                label="Search name / mobile / email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && loadCandidates()}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={() => loadCandidates()} size="small">
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
        rows={candidates}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
        }}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Withdraw Candidate"
        message={`Withdraw "${deleteDialog.item?.name || ''}" from the hiring pipeline? Their record is kept but marked withdrawn.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
