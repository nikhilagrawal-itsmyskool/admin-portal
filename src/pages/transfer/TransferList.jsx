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
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Person as PersonIcon, Add as AddIcon, Print as PrintIcon, Edit as EditIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import usePersistedPaginationModel from '../../hooks/usePersistedPaginationModel';
import { transferService, openTc } from '../../services/transferService';
import { studentService } from '../../services/studentService';
import TcDialog from './TcDialog';
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

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const canManage = can(ACTIONS.TRANSFER_MANAGE) && isDesktop; // apply/issue is desktop-only
  const [newOpen, setNewOpen] = useState(false);
  const [stuInput, setStuInput] = useState('');
  const [stuOptions, setStuOptions] = useState([]);
  const [stuLoading, setStuLoading] = useState(false);
  const [tcDialog, setTcDialog] = useState({ open: false, studentId: null, initial: null });

  // Page guard: only transfer.view (admin/god) reaches here via direct URL.
  useEffect(() => {
    if (!can(ACTIONS.TRANSFER_VIEW)) navigate('/', { replace: true });
  }, [can, navigate]);

  // Student type-ahead for the "New TC" picker (name / admission / parent / phone).
  useEffect(() => {
    if (!newOpen) return;
    const q = stuInput.trim();
    if (q.length < 2) { setStuOptions([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStuLoading(true);
      try {
        const data = await studentService.omniSearch(q, ctrl.signal, { academicYearId: 'all' });
        setStuOptions(data?.results || []);
      } catch { /* aborted or failed — leave prior options */ }
      finally { setStuLoading(false); }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [stuInput, newOpen]);

  // Pick a student → open the Apply form in-place (stay on the Transfer Certs page).
  const pickStudent = (stu) => {
    if (!stu?.uuid) return;
    setNewOpen(false);
    setTcDialog({ open: true, studentId: stu.uuid, initial: null });
  };

  // View / edit an existing TC without leaving the page (fetch the full row first).
  const openEdit = async (row) => {
    try {
      const full = await transferService.getTc(row.uuid);
      setTcDialog({ open: true, studentId: row.studentId, initial: full });
    } catch {
      setError('Failed to open transfer certificate');
    }
  };

  const saveTc = async (data) => {
    try {
      if (data.uuid) await transferService.updateTc(tcDialog.studentId, data.uuid, data);
      else await transferService.createTc(tcDialog.studentId, data);
      setTcDialog({ open: false, studentId: null, initial: null });
      load();
    } catch (err) {
      setError(err?.response?.data?.error?.description || 'Failed to save transfer certificate');
    }
  };

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
      width: 100,
      renderCell: (params) => <Chip label={params.value} size="small" color={TC_STATUS_COLORS[params.value] || 'default'} />,
    },
    {
      field: 'dues',
      headerName: 'Dues',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const due = Number(params.row.outstandingDues || 0);
        return due > 0
          ? <Chip size="small" color="error" label={`₹${due.toLocaleString('en-IN')}`} title="Outstanding across all years — issuing is blocked until cleared (god can override)" />
          : <Chip size="small" color="success" variant="outlined" label="Cleared" />;
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          <IconButton size="small" title={params.row.status === 'issued' ? 'Print' : 'Preview (draft watermark)'} onClick={() => openTc(params.row.studentId, params.row.uuid)}><PrintIcon fontSize="small" /></IconButton>
          {canManage && (
            <IconButton size="small" title="View / edit" onClick={() => openEdit(params.row)}><EditIcon fontSize="small" /></IconButton>
          )}
          <IconButton size="small" title="Open student profile" onClick={() => navigate(`/students/${params.row.studentId}`)}><PersonIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transfer Certificates</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setStuInput(''); setStuOptions([]); setNewOpen(true); }}>
            New TC
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
        onCardClick={(row) => openEdit(row)}
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

      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Transfer Certificate</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search for the student. You'll be taken to their profile with the Apply form open.
          </Typography>
          <Autocomplete
            options={stuOptions}
            loading={stuLoading}
            filterOptions={(x) => x}
            getOptionLabel={(o) => (o?.name ? `${o.name}${o.admissionNumber ? ` (#${o.admissionNumber})` : ''}${o.className ? ` · ${o.className}` : ''}` : '')}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            onInputChange={(_, val) => setStuInput(val)}
            onChange={(_, val) => pickStudent(val)}
            noOptionsText={stuInput.trim().length < 2 ? 'Type a name or admission number' : 'No matching students'}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                label="Student"
                placeholder="Name / admission # / parent"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {stuLoading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <TcDialog
        open={tcDialog.open}
        initial={tcDialog.initial}
        studentId={tcDialog.studentId}
        onClose={() => setTcDialog({ open: false, studentId: null, initial: null })}
        onSave={saveTc}
      />
    </Box>
  );
}
