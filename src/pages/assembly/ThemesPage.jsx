import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, IconButton,
  Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { assemblyService } from '../../services/assemblyService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

const blank = { title: '', description: '', planId: '', startDate: '', endDate: '' };

export default function ThemesPage() {
  const can = useCan();
  const canManage = can('assembly.manage');

  const [years, setYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [plans, setPlans] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // create/edit form (with optional uuid)
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  useEffect(() => {
    (async () => {
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        const list = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(list);
        const cur = list.find((y) => y.isCurrent) || list[0];
        if (cur?.uuid) setAcademicYearId(cur.uuid);
      } catch { setError('Failed to load academic years'); }
    })();
  }, []);

  const load = async (yearId = academicYearId) => {
    if (!yearId) return;
    setLoading(true); setError('');
    try {
      const [th, pl] = await Promise.all([
        assemblyService.getThemes({ academicYearId: yearId }),
        assemblyService.getPlans({ academicYearId: yearId }),
      ]);
      setThemes(th || []);
      setPlans(pl || []);
    } catch { setError('Failed to load themes'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (academicYearId) load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const planName = (planId) => plans.find((p) => p.uuid === planId)?.name || 'Unknown plan';

  const save = async () => {
    if (!dialog.title.trim() || !dialog.startDate || !dialog.endDate) { setError('Title and dates are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title: dialog.title.trim(),
        description: dialog.description.trim() || undefined,
        startDate: dialog.startDate,
        endDate: dialog.endDate,
      };
      if (dialog.uuid) {
        await assemblyService.updateTheme(dialog.uuid, payload);
      } else {
        await assemblyService.createTheme({ ...payload, academicYearId, planId: dialog.planId || undefined });
      }
      setDialog(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save theme');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await assemblyService.deleteTheme(deleteDialog.item.uuid); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete'); }
    finally { setDeleteDialog({ open: false, item: null }); load(); }
  };

  const columns = [
    { field: 'title', headerName: 'Theme', flex: 1, minWidth: 160 },
    {
      field: 'planId', headerName: 'Scope', width: 180,
      renderCell: (p) => p.value
        ? <Chip size="small" variant="outlined" label={planName(p.value)} />
        : <Chip size="small" color="primary" variant="outlined" label="School-wide" />,
    },
    { field: 'startDate', headerName: 'From', width: 120 },
    { field: 'endDate', headerName: 'To', width: 120 },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => canManage && (
        <Box>
          <IconButton size="small" title="Edit" onClick={() => setDialog({ ...params.row, description: params.row.description || '', planId: params.row.planId || '' })}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Assembly Themes</Typography>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ ...blank })}>Add Theme</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth select size="small" label="Academic Year" value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={themes}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.uuid ? 'Edit Theme' : 'Add Theme'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label="Title" placeholder="e.g. Honesty" value={dialog?.title || ''}
              onChange={(e) => setDialog({ ...dialog, title: e.target.value })} autoFocus />
            <TextField size="small" label="Description (optional)" multiline minRows={2} value={dialog?.description || ''}
              onChange={(e) => setDialog({ ...dialog, description: e.target.value })} />
            {!dialog?.uuid && (
              <TextField select size="small" label="Scope" value={dialog?.planId || ''}
                onChange={(e) => setDialog({ ...dialog, planId: e.target.value })}>
                <MenuItem value="">School-wide (all plans)</MenuItem>
                {plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>)}
              </TextField>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField type="date" fullWidth size="small" label="From" InputLabelProps={{ shrink: true }}
                  value={dialog?.startDate || ''} onChange={(e) => setDialog({ ...dialog, startDate: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField type="date" fullWidth size="small" label="To" InputLabelProps={{ shrink: true }}
                  value={dialog?.endDate || ''} onChange={(e) => setDialog({ ...dialog, endDate: e.target.value })} />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Theme"
        message={`Delete the theme "${deleteDialog.item?.title || ''}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
      />
    </Box>
  );
}
