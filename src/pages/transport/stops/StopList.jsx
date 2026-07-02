import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton, Alert, TextField, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, GridOn as GridIcon,
  Search as SearchIcon, Clear as ClearIcon, DeleteOutline as RemoveRowIcon,
} from '@mui/icons-material';
import { transportService } from '../../../services/transportService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCan } from '../../../permissions/can';

const emptyRow = () => ({ name: '', km: '', landmark: '' });

export default function StopList() {
  const can = useCan();
  const canManage = can('transport.manage');

  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Single add/edit
  const [editDialog, setEditDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(emptyRow());
  const [saving, setSaving] = useState(false);

  // Bulk grid
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([emptyRow(), emptyRow(), emptyRow()]);

  const load = async (overrideSearch) => {
    setLoading(true); setError('');
    try {
      const s = overrideSearch !== undefined ? overrideSearch : search;
      const data = await transportService.getStops(s ? { search: s } : {});
      setStops(data || []);
    } catch {
      setError('Failed to load stops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── single add / edit ──
  const openAdd = () => { setForm(emptyRow()); setEditDialog({ open: true, item: null }); };
  const openEdit = (item) => {
    setForm({ name: item.name, km: item.km ?? '', landmark: item.landmark ?? '' });
    setEditDialog({ open: true, item });
  };
  const saveSingle = async () => {
    if (!form.name.trim()) { setError('Stop name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), km: form.km === '' ? null : Number(form.km), landmark: form.landmark || null };
      if (editDialog.item) await transportService.updateStop(editDialog.item.uuid, payload);
      else await transportService.createStop(payload);
      setEditDialog({ open: false, item: null });
      setSuccess('Stop saved');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save stop');
    } finally {
      setSaving(false);
    }
  };

  // ── delete ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transportService.deleteStop(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete stop');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  // ── bulk grid ──
  const setBulkCell = (i, field, value) =>
    setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const addBulkRow = () => setBulkRows((prev) => [...prev, emptyRow()]);
  const removeBulkRow = (i) => setBulkRows((prev) => prev.filter((_, idx) => idx !== i));

  // Paste from Excel/Sheets: tab or comma columns (name, km, landmark), newline rows.
  const handlePaste = (e, i) => {
    const text = e.clipboardData.getData('text');
    if (!text || !/[\t\n,]/.test(text)) return; // single value → let default paste happen
    e.preventDefault();
    const parsed = text.trim().split(/\r?\n/).map((line) => {
      const [name = '', km = '', landmark = ''] = line.split(/\t|,/);
      return { name: name.trim(), km: km.trim(), landmark: landmark.trim() };
    });
    setBulkRows((prev) => {
      const next = [...prev];
      next.splice(i, parsed.length, ...parsed);
      return next.filter((r, idx) => r.name || idx < 1);
    });
  };

  const saveBulk = async () => {
    const rows = bulkRows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), km: r.km === '' ? undefined : Number(r.km), landmark: r.landmark || undefined }));
    if (rows.length === 0) { setError('Enter at least one stop name'); return; }
    setSaving(true); setError('');
    try {
      const res = await transportService.bulkUpsertStops(rows);
      setBulkOpen(false);
      setBulkRows([emptyRow(), emptyRow(), emptyRow()]);
      setSuccess(`Saved: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped`);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save stops');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Stop Name', flex: 1, minWidth: 180 },
    { field: 'km', headerName: 'Km', width: 90, valueFormatter: (v) => (v == null ? '-' : v) },
    { field: 'landmark', headerName: 'Landmark', flex: 1, minWidth: 160, valueFormatter: (v) => v || '-' },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => canManage && (
        <Box>
          <IconButton size="small" title="Edit" onClick={() => openEdit(params.row)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Stops</Typography>
        {canManage && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<GridIcon />} onClick={() => setBulkOpen(true)}>Bulk add (grid)</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Stop</Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField fullWidth size="small" label="Search stop name" value={search}
                onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" startIcon={<SearchIcon />} onClick={() => load()}>Search</Button>
                <Button variant="outlined" size="small" startIcon={<ClearIcon />} onClick={() => { setSearch(''); load(''); }}>Clear</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={stops}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />

      {/* Single add / edit dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, item: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{editDialog.item ? 'Edit Stop' : 'Add Stop'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={7}>
              <TextField fullWidth label="Stop Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} size="small" autoFocus />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth type="number" label="Km from school" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Landmark (optional)" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, item: null })} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveSingle} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk grid dialog */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk add stops</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 2 }}>
            Enter stops row by row, or paste from Excel/Sheets (columns: Name, Km, Landmark). Existing stops (matched by name) get their km/landmark updated.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>Stop Name</TableCell>
                <TableCell sx={{ width: 120 }}>Km</TableCell>
                <TableCell>Landmark</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {bulkRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <TextField fullWidth variant="standard" placeholder="Name" value={r.name}
                      onChange={(e) => setBulkCell(i, 'name', e.target.value)} onPaste={(e) => handlePaste(e, i)} />
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth variant="standard" type="number" placeholder="Km" value={r.km}
                      onChange={(e) => setBulkCell(i, 'km', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth variant="standard" placeholder="Landmark" value={r.landmark}
                      onChange={(e) => setBulkCell(i, 'landmark', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Remove row">
                      <span>
                        <IconButton size="small" onClick={() => removeBulkRow(i)} disabled={bulkRows.length === 1}>
                          <RemoveRowIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button startIcon={<AddIcon />} onClick={addBulkRow} sx={{ mt: 1 }}>Add row</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveBulk} disabled={saving}>{saving ? 'Saving...' : 'Save all'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Stop"
        message={`Delete "${deleteDialog.item?.name || ''}"? Stops used by a route or assignment cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
