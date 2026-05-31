import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, MenuItem, TextField,
  Alert, CircularProgress, Chip, IconButton, Collapse, Table, TableBody,
  TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import uniformService from '../../../services/uniformService';

const CATEGORY_LABELS = { summer: 'Summer Dress', winter: 'Winter Dress', sports: 'Sports / PT', general: 'General' };
const GENDER_LABELS = { male: 'Boys', female: 'Girls', unisex: 'Unisex' };
const GENDER_COLORS = { male: 'primary', female: 'secondary', unisex: 'default' };
const CATEGORIES = Object.keys(CATEGORY_LABELS);

const SizeDialog = ({ open, onClose, onSave, itemId, size }) => {
  const [form, setForm] = useState({ sizeLabel: '', mrp: '', studentDiscountPct: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        sizeLabel: size?.sizeLabel || '',
        mrp: size?.mrp != null ? String(size.mrp) : '',
        studentDiscountPct: size?.studentDiscountPct != null ? String(size.studentDiscountPct) : '',
      });
      setError('');
    }
  }, [open, size]);

  const handleSave = async () => {
    if (!form.sizeLabel.trim()) { setError('Size label is required'); return; }
    setSaving(true);
    try {
      const payload = {
        sizeLabel: form.sizeLabel.trim(),
        mrp: form.mrp !== '' ? parseFloat(form.mrp) : undefined,
        studentDiscountPct: form.studentDiscountPct !== '' ? parseFloat(form.studentDiscountPct) : undefined,
      };
      if (size) {
        await uniformService.updateSize(itemId, size.uuid, payload);
      } else {
        await uniformService.createSize(itemId, payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save size');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{size ? 'Edit Size' : 'Add Size'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField fullWidth label="Size Label" value={form.sizeLabel} onChange={e => setForm(p => ({ ...p, sizeLabel: e.target.value }))} size="small" placeholder="e.g. 26, 28, S, M, UK7" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="MRP (₹)" type="number" value={form.mrp} onChange={e => setForm(p => ({ ...p, mrp: e.target.value }))} size="small" inputProps={{ step: '0.01', min: 0 }} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Student Disc %" type="number" value={form.studentDiscountPct} onChange={e => setForm(p => ({ ...p, studentDiscountPct: e.target.value }))} size="small" inputProps={{ step: '0.01', min: 0, max: 100 }} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const ItemDialog = ({ open, onClose, onSave, item, allItems, itemNameHints = [] }) => {
  const [form, setForm] = useState({ name: '', category: 'summer', gender: 'unisex', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(item
        ? { name: item.name, category: item.category, gender: item.gender, description: item.description || '' }
        : { name: '', category: 'summer', gender: 'unisex', description: '' }
      );
      setError('');
    }
  }, [open, item]);

  const existingNames = [...new Set([...itemNameHints, ...(allItems || []).map(i => i.name)])];

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (item) {
        await uniformService.updateItem(item.uuid, form);
      } else {
        await uniformService.createItem(form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <Autocomplete
              freeSolo
              options={existingNames}
              value={form.name}
              onInputChange={(_, value) => setForm(p => ({ ...p, name: value }))}
              renderInput={(params) => <TextField {...params} fullWidth label="Item Name" size="small" />}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} size="small">
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth select label="Gender" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} size="small">
              {Object.entries(GENDER_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
};

function ItemRow({ item, onRefresh, allItems }) {
  const [expanded, setExpanded] = useState(false);
  const [sizeDialog, setSizeDialog] = useState({ open: false, size: null });
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const totalStock = item.sizes.reduce((sum, s) => sum + (s.currentStock || 0), 0);
  const itemStockValue = item.sizes.some(s => s.mrp != null)
    ? item.sizes.reduce((sum, s) => sum + (s.mrp ?? 0) * (s.currentStock ?? 0), 0)
    : null;

  const handleDeleteItem = async () => {
    try {
      await uniformService.deleteItem(item.uuid);
      onRefresh();
    } catch {
      // silently fail — parent refresh will show updated state
    }
  };

  const handleDeleteSize = async (size) => {
    try {
      await uniformService.deleteSize(item.uuid, size.uuid);
      onRefresh();
    } catch {}
  };

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& td': { borderBottom: expanded ? 'none' : undefined } }}
        onClick={() => setExpanded(e => !e)}
      >
        <TableCell sx={{ pl: 2 }}>
          {expanded ? <CollapseIcon fontSize="small" sx={{ color: '#8f9bb3' }} /> : <ExpandIcon fontSize="small" sx={{ color: '#8f9bb3' }} />}
        </TableCell>
        <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
        <TableCell><Chip label={CATEGORY_LABELS[item.category] || item.category} size="small" variant="outlined" /></TableCell>
        <TableCell><Chip label={GENDER_LABELS[item.gender] || item.gender} size="small" color={GENDER_COLORS[item.gender] || 'default'} /></TableCell>
        <TableCell align="right">{item.sizes.length} sizes</TableCell>
        <TableCell align="right">{totalStock} units</TableCell>
        <TableCell align="right">{itemStockValue != null ? `₹${itemStockValue.toFixed(2)}` : '—'}</TableCell>
        <TableCell align="right">
          <IconButton size="small" title="Edit item" onClick={e => { e.stopPropagation(); setEditItemDialog(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" title="Delete item" onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, border: 'none' }}>
          <Collapse in={expanded}>
            <Box sx={{ m: 2, ml: 6 }}>
              {item.sizes.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Last MRP</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Student Disc%</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Stock Value</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Discounted Value</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Stock</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {item.sizes.map(size => {
                      const stockValue = size.mrp != null && size.currentStock != null
                        ? (size.mrp * size.currentStock).toFixed(2)
                        : null;
                      const discountedValue = size.mrp != null && size.currentStock != null
                        ? (size.mrp * (1 - (size.studentDiscountPct || 0) / 100) * size.currentStock).toFixed(2)
                        : null;
                      return (
                        <TableRow key={size.uuid} hover>
                          <TableCell>{size.sizeLabel}</TableCell>
                          <TableCell align="right" sx={{ color: '#8f9bb3' }}>{size.mrp != null ? `₹${size.mrp}` : '—'}</TableCell>
                          <TableCell align="right" sx={{ color: '#8f9bb3' }}>{size.studentDiscountPct != null ? `${size.studentDiscountPct}%` : '—'}</TableCell>
                          <TableCell align="right" sx={{ color: '#8f9bb3' }}>{stockValue != null ? `₹${stockValue}` : '—'}</TableCell>
                          <TableCell align="right" sx={{ color: '#8f9bb3' }}>{discountedValue != null ? `₹${discountedValue}` : '—'}</TableCell>
                          <TableCell align="right">{size.currentStock}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => setSizeDialog({ open: true, size })}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSize(size)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setSizeDialog({ open: true, size: null })}
                sx={{ mt: item.sizes.length > 0 ? 1 : 0 }}
              >
                Add Size
              </Button>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <SizeDialog
        open={sizeDialog.open}
        onClose={() => setSizeDialog({ open: false, size: null })}
        onSave={() => { setSizeDialog({ open: false, size: null }); onRefresh(); }}
        itemId={item.uuid}
        size={sizeDialog.size}
      />

      <ItemDialog
        open={editItemDialog}
        onClose={() => setEditItemDialog(false)}
        onSave={() => { setEditItemDialog(false); onRefresh(); }}
        item={item}
        allItems={allItems}
      />

      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} maxWidth="xs">
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{item.name}</strong> and all its sizes? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setDeleteConfirm(false); handleDeleteItem(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function UniformCatalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [itemNameHints, setItemNameHints] = useState([]);

  useEffect(() => {
    loadItems();
    uniformService.getLookups().then(data => setItemNameHints(data.itemNameHints || [])).catch(() => {});
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (filterCategory) filters.category = filterCategory;
      if (filterGender) filters.gender = filterGender;
      const data = await uniformService.getItems(filters);
      setItems(data);
    } catch {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  // Group items by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Uniform Catalog</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddItemDialog(true)}>Add Item</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} md={2}>
              <TextField fullWidth select label="Category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} size="small">
                <MenuItem value="">All Categories</MenuItem>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth select label="Gender" value={filterGender} onChange={e => setFilterGender(e.target.value)} size="small">
                <MenuItem value="">All</MenuItem>
                {Object.entries(GENDER_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" onClick={loadItems} size="small">Search</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No items found. Add your first item or seed the standard catalog.</Typography>
          </CardContent>
        </Card>
      ) : (
        CATEGORIES.filter(cat => grouped[cat].length > 0 || !filterCategory).map(cat => {
          const catItems = grouped[cat];
          if (catItems.length === 0) return null;
          return (
            <Card key={cat} sx={{ mb: 2 }}>
              <CardContent sx={{ pb: '0 !important' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{CATEGORY_LABELS[cat]}</Typography>
              </CardContent>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                    <TableCell width={40} />
                    <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Sizes</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Stock</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Stock Value</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catItems.map(item => (
                    <ItemRow key={item.uuid} item={item} onRefresh={loadItems} allItems={items} />
                  ))}
                </TableBody>
              </Table>
            </Card>
          );
        })
      )}

      <ItemDialog
        open={addItemDialog}
        onClose={() => setAddItemDialog(false)}
        onSave={() => { setAddItemDialog(false); loadItems(); }}
        item={null}
        allItems={items}
        itemNameHints={itemNameHints}
      />
    </Box>
  );
}
