import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, IconButton,
  Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Publish as PublishIcon,
} from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { assemblyService } from '../../services/assemblyService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';
import ReferenceDocCard from './ReferenceDocCard';

const emptyForm = { name: '', scopeLabel: '', days: [] };

export default function AssemblyList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('assembly.manage');

  const [years, setYears] = useState([]);
  const [weekdays, setWeekdays] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialog, setDialog] = useState(null); // create form or null
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [yrs, lookups] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          assemblyService.getLookups(),
        ]);
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        setWeekdays(lookups?.weekdays || []);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        if (cur?.uuid) setAcademicYearId(cur.uuid);
      } catch {
        setError('Failed to load assembly filters');
      }
    })();
  }, []);

  const load = async (yearId = academicYearId) => {
    if (!yearId) return;
    setLoading(true); setError('');
    try {
      setPlans((await assemblyService.getPlans({ academicYearId: yearId })) || []);
    } catch {
      setError('Failed to load assembly plans');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (academicYearId) load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const create = async () => {
    if (!dialog.name.trim()) { setError('Plan name is required'); return; }
    setSaving(true); setError('');
    try {
      const created = await assemblyService.createPlan({
        academicYearId,
        name: dialog.name.trim(),
        scopeLabel: dialog.scopeLabel.trim() || undefined,
        days: dialog.days.length ? dialog.days : undefined,
      });
      setDialog(null);
      navigate(`/assembly/plans/${created.uuid}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (row) => {
    try { await assemblyService.publishPlan(row.uuid); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to publish'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await assemblyService.deletePlan(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete plan');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  const toggleDay = (value) => setDialog((d) => ({
    ...d, days: d.days.includes(value) ? d.days.filter((x) => x !== value) : [...d.days, value],
  }));

  const columns = [
    { field: 'name', headerName: 'Plan', flex: 1, minWidth: 160 },
    { field: 'scopeLabel', headerName: 'Scope', flex: 1, minWidth: 140, valueFormatter: (v) => v || '-' },
    {
      field: 'publishStatus', headerName: 'Status', width: 130,
      renderCell: (p) => (
        <Chip size="small" label={p.value === 'published' ? 'Published' : p.value === 'archived' ? 'Archived' : 'Draft'}
          color={p.value === 'published' ? 'success' : 'default'}
          variant={p.value === 'published' ? 'filled' : 'outlined'} />
      ),
    },
    {
      field: 'actions', headerName: 'Actions', width: 150, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Open / build"><IconButton size="small" onClick={() => navigate(`/assembly/plans/${params.row.uuid}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          {canManage && params.row.publishStatus !== 'published' &&
            <Tooltip title="Publish"><IconButton size="small" color="primary" onClick={() => publish(params.row)}><PublishIcon fontSize="small" /></IconButton></Tooltip>}
          {canManage &&
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Assembly Plans</Typography>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ ...emptyForm })}>Add Plan</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <ReferenceDocCard
        kind="plan"
        title="Assembly plan document"
        hint="The source document this assembly plan was built from (e.g. the Word file). Kept for reference — download, edit and re-upload anytime."
        canManage={canManage}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
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
        rows={plans}
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
        <DialogTitle>Add Assembly Plan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={7}>
              <TextField fullWidth size="small" label="Plan name" placeholder="e.g. Primary Wing" value={dialog?.name || ''}
                onChange={(e) => setDialog({ ...dialog, name: e.target.value })} autoFocus />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth size="small" label="Scope label (optional)" placeholder="I–V" value={dialog?.scopeLabel || ''}
                onChange={(e) => setDialog({ ...dialog, scopeLabel: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Assembly weekdays (leave all off to default to Mon–Sat)</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {weekdays.map((w) => (
                  <Chip key={w.value} label={w.label} size="small"
                    color={dialog?.days.includes(w.value) ? 'primary' : 'default'}
                    variant={dialog?.days.includes(w.value) ? 'filled' : 'outlined'}
                    onClick={() => toggleDay(w.value)} />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create & Build'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Assembly Plan"
        message={`Delete "${deleteDialog.item?.name || ''}" and its entire tree, special assemblies and themes? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
