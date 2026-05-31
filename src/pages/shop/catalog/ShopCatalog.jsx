import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const TYPE_LABELS = { book: 'Book', notebook: 'Notebook', stationery: 'Stationery' };
const TYPE_COLORS = { book: 'primary', notebook: 'success', stationery: 'default' };

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

function ItemDialog({ open, onClose, onSave, item, lookups }) {
  const [form, setForm] = useState({ name: '', type: 'book', subject: '', publisher: '', classNo: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(item ? {
        name: item.name, type: item.type,
        subject: item.subject || '', publisher: item.publisher || '',
        classNo: item.classNo || '', description: item.description || '',
      } : { name: '', type: 'book', subject: '', publisher: '', classNo: '', description: '' });
      setError('');
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.type === 'book') {
      if (!form.subject.trim()) { setError('Subject is required for books'); return; }
      if (!form.publisher.trim()) { setError('Publisher is required for books'); return; }
      if (!form.classNo || form.classNo < 1 || form.classNo > 12) { setError('Class No (1-12) is required for books'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description || undefined,
        ...(form.type === 'book' && {
          subject: form.subject.trim(),
          publisher: form.publisher.trim(),
          classNo: parseInt(form.classNo, 10),
        }),
      };
      if (item) {
        await shopService.updateItem(item.uuid, payload);
      } else {
        await shopService.createItem(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Type" value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value, subject: '', publisher: '', classNo: '' }))}
              size="small" disabled={!!item}>
              {(lookups?.itemTypes || []).map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Name" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="small" />
          </Grid>
          {form.type === 'book' && <>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Subject" value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Publisher" value={form.publisher}
                onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Class No" value={form.classNo}
                onChange={e => setForm(p => ({ ...p, classNo: e.target.value }))} size="small">
                {(lookups?.classNos || []).map(n => <MenuItem key={n} value={n}>Class {n}</MenuItem>)}
              </TextField>
            </Grid>
          </>}
          <Grid item xs={12}>
            <TextField fullWidth label="Description (optional)" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ShopCatalog() {
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClassNo, setFilterClassNo] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    shopService.getLookups().then(setLookups).catch(() => {});
    loadItems();
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (filterType) filters.type = filterType;
      if (filterClassNo) filters.classNo = filterClassNo;
      if (filterSession) filters.academicSession = filterSession;
      const data = await shopService.getItems(filters);
      setItems(data);
    } catch {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterClassNo, filterSession]);

  const handleDelete = async (item) => {
    try {
      await shopService.deleteItem(item.uuid);
      setDeleteConfirm(null);
      loadItems();
    } catch {
      setError('Failed to delete item');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shop Catalog</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, item: null })}>
          Add Item
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3}>
              <TextField fullWidth select label="Type" value={filterType}
                onChange={e => setFilterType(e.target.value)} size="small">
                <MenuItem value="">All Types</MenuItem>
                {(lookups?.itemTypes || []).map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth select label="Class No" value={filterClassNo}
                onChange={e => setFilterClassNo(e.target.value)} size="small"
                disabled={filterType === 'stationery' || filterType === 'notebook'}>
                <MenuItem value="">All Classes</MenuItem>
                {(lookups?.classNos || []).map(n => <MenuItem key={n} value={n}>Class {n}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Academic Session" value={filterSession}
                onChange={e => setFilterSession(e.target.value)} size="small"
                placeholder="e.g. 2025-26" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button variant="contained" onClick={loadItems} size="small" fullWidth>Search</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No items found. Add your first item to get started.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subject / Publisher</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Student Disc.</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Stock</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Stock Value</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Session</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.uuid} hover>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[item.type] || item.type} color={TYPE_COLORS[item.type] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    {item.subject ? <>{item.subject}<br /><Typography variant="caption" color="text.secondary">{item.publisher}</Typography></> : '—'}
                  </TableCell>
                  <TableCell align="center">{item.classNo || '—'}</TableCell>
                  <TableCell align="right">{formatCurrency(item.lastMrp)}</TableCell>
                  <TableCell align="right">{item.lastStudentDiscountPct != null ? `${item.lastStudentDiscountPct}%` : '—'}</TableCell>
                  <TableCell align="center">{item.currentStock ?? 0}</TableCell>
                  <TableCell align="right">{formatCurrency(item.discountedStockValue)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">{item.lastAcademicSession || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setDialog({ open: true, item })}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteConfirm(item)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ItemDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, item: null })}
        onSave={() => { setDialog({ open: false, item: null }); loadItems(); }}
        item={dialog.item}
        lookups={lookups}
      />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
