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
import { useIsMobile } from '../../../hooks/useIsMobile';

const CATEGORY_LABELS = { summer: 'Summer Dress', winter: 'Winter Dress', sports: 'Sports / PT', general: 'General' };
const GENDER_LABELS = { male: 'Boys', female: 'Girls', unisex: 'Unisex' };
const GENDER_COLORS = { male: 'primary', female: 'secondary', unisex: 'default' };
const CATEGORIES = Object.keys(CATEGORY_LABELS);

const SizeDialog = ({ open, onClose, onSave, itemId, size }) => {
  const [form, setForm] = useState({ sizeLabel: '', mrp: '', studentDiscountPct: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
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
  const [form, setForm] = useState({ name: '', category: 'summer', gender: 'unisex', sizingMode: 'sized', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setForm(item
        ? { name: item.name, category: item.category, gender: item.gender, sizingMode: item.sizingMode || 'sized', description: item.description || '' }
        : { name: '', category: 'summer', gender: 'unisex', sizingMode: 'sized', description: '' }
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
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
            {item ? (
              <TextField
                fullWidth label="Sizing" size="small"
                value={form.sizingMode === 'unsized' ? 'Unsized (judge number at sale)' : 'Sized (number-wise stock)'}
                InputProps={{ readOnly: true }}
                helperText="Sizing mode is fixed at creation. Break an unsized item into numbers to convert it."
              />
            ) : (
              <TextField
                fullWidth select label="Sizing Mode" size="small"
                value={form.sizingMode}
                onChange={e => setForm(p => ({ ...p, sizingMode: e.target.value }))}
                helperText={form.sizingMode === 'unsized'
                  ? 'One bulk pool; the number is judged at the counter and priced from bands.'
                  : 'Separate number-wise stock rows (blazer, sweater, shirt).'}
              >
                <MenuItem value="sized">Sized — number-wise stock</MenuItem>
                <MenuItem value="unsized">Unsized — judge number at sale</MenuItem>
              </TextField>
            )}
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

// Covering band for a number (client-side mirror of the server's lookup).
const bandForNumber = (bands, num) => {
  const n = parseInt(num, 10);
  if (isNaN(n)) return null;
  return (bands || []).find(b => n >= b.numberFrom && n <= b.numberTo) || null;
};

const BandDialog = ({ open, onClose, onSave, itemId, band }) => {
  const [form, setForm] = useState({ numberFrom: '', numberTo: '', mrp: '', studentDiscountPct: '', bulkDiscountPct: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setForm({
        numberFrom: band?.numberFrom != null ? String(band.numberFrom) : '',
        numberTo: band?.numberTo != null ? String(band.numberTo) : '',
        mrp: band?.mrp != null ? String(band.mrp) : '',
        studentDiscountPct: band?.studentDiscountPct != null ? String(band.studentDiscountPct) : '',
        bulkDiscountPct: band?.bulkDiscountPct != null ? String(band.bulkDiscountPct) : '',
      });
      setError('');
    }
  }, [open, band]);

  const handleSave = async () => {
    const from = parseInt(form.numberFrom, 10);
    const to = parseInt(form.numberTo, 10);
    if (isNaN(from) || isNaN(to)) { setError('From and To numbers are required'); return; }
    if (from > to) { setError('From must be ≤ To'); return; }
    setSaving(true);
    try {
      const payload = {
        numberFrom: from, numberTo: to,
        mrp: form.mrp !== '' ? parseFloat(form.mrp) : undefined,
        studentDiscountPct: form.studentDiscountPct !== '' ? parseFloat(form.studentDiscountPct) : undefined,
        bulkDiscountPct: form.bulkDiscountPct !== '' ? parseFloat(form.bulkDiscountPct) : undefined,
      };
      if (band) await uniformService.updateBand(itemId, band.uuid, payload);
      else await uniformService.createBand(itemId, payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save band');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <DialogTitle>{band ? 'Edit Price Band' : 'Add Price Band'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={6}>
            <TextField fullWidth label="Number From" type="number" value={form.numberFrom} onChange={e => setForm(p => ({ ...p, numberFrom: e.target.value }))} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Number To" type="number" value={form.numberTo} onChange={e => setForm(p => ({ ...p, numberTo: e.target.value }))} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="MRP (₹)" type="number" value={form.mrp} onChange={e => setForm(p => ({ ...p, mrp: e.target.value }))} size="small" inputProps={{ step: '0.01', min: 0 }} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Student Disc %" type="number" value={form.studentDiscountPct} onChange={e => setForm(p => ({ ...p, studentDiscountPct: e.target.value }))} size="small" inputProps={{ step: '0.01', min: 0, max: 100 }} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Bulk Disc %" type="number" value={form.bulkDiscountPct} onChange={e => setForm(p => ({ ...p, bulkDiscountPct: e.target.value }))} size="small" inputProps={{ step: '0.01', min: 0, max: 100 }} />
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

// Break an unsized pool into number-wise rows. Sum must equal the pool stock. Each
// row's suggested price comes from the covering band (shown as a hint; the server fills it).
const BreakDialog = ({ open, onClose, onSave, item, poolStock }) => {
  const [rows, setRows] = useState([{ sizeLabel: '', quantity: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) { setRows([{ sizeLabel: '', quantity: '' }]); setError(''); }
  }, [open]);

  const sum = rows.reduce((acc, r) => acc + (parseInt(r.quantity, 10) || 0), 0);
  const addRow = () => setRows(prev => [...prev, { sizeLabel: '', quantity: '' }]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleSave = async () => {
    const breakdown = rows
      .filter(r => r.sizeLabel.trim() && parseInt(r.quantity, 10) > 0)
      .map(r => ({ sizeLabel: r.sizeLabel.trim(), quantity: parseInt(r.quantity, 10) }));
    if (breakdown.length === 0) { setError('Add at least one number with a quantity'); return; }
    if (sum !== poolStock) { setError(`Total (${sum}) must equal pool stock (${poolStock})`); return; }
    setSaving(true);
    try {
      await uniformService.breakSizes(item.uuid, { breakdown });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to break into numbers');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Break “{item.name}” into numbers</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Alert severity="info" sx={{ mb: 2 }}>
          Pool stock: <strong>{poolStock}</strong> units. Distribute all of them across numbers — the
          totals must match. This permanently converts the item to number-wise stock.
        </Alert>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Number</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Quantity</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Price (from band)</TableCell>
              <TableCell width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => {
              const band = bandForNumber(item.bands, r.sizeLabel);
              return (
                <TableRow key={idx}>
                  <TableCell>
                    <TextField size="small" fullWidth value={r.sizeLabel} onChange={e => updateRow(idx, 'sizeLabel', e.target.value)} placeholder="e.g. 28" />
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={r.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)} inputProps={{ min: 1, style: { textAlign: 'right' } }} sx={{ width: 90 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#8f9bb3' }}>{band?.mrp != null ? `₹${band.mrp}` : '—'}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={addRow}>Add Number</Button>
          <Typography variant="body2" color={sum === poolStock ? 'success.main' : 'error.main'} fontWeight={600}>
            {sum} / {poolStock} allocated
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || sum !== poolStock}>
          {saving ? 'Converting...' : 'Break into numbers'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Bulk opening-stock entry for a sized item: one grid, many (size, qty, price-optional)
// rows, one save. Prefilled with existing sizes so you can edit counts in place.
const BulkStockDialog = ({ open, onClose, onSave, item }) => {
  const [rows, setRows] = useState([{ sizeLabel: '', quantity: '', mrp: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      const existing = (item.sizes || []).filter(s => !s.isPool);
      setRows(existing.length > 0
        ? existing.map(s => ({ sizeLabel: s.sizeLabel, quantity: s.currentStock != null ? String(s.currentStock) : '', mrp: s.mrp != null ? String(s.mrp) : '' }))
        : [{ sizeLabel: '', quantity: '', mrp: '' }]);
      setError('');
    }
  }, [open, item]);

  const addRow = () => setRows(prev => [...prev, { sizeLabel: '', quantity: '', mrp: '' }]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  const totalUnits = rows.reduce((acc, r) => acc + (parseInt(r.quantity, 10) || 0), 0);

  const handleSave = async () => {
    const payloadRows = rows
      .filter(r => r.sizeLabel.trim() !== '' && r.quantity !== '')
      .map(r => ({
        sizeLabel: r.sizeLabel.trim(),
        quantity: parseInt(r.quantity, 10),
        ...(r.mrp !== '' ? { mrp: parseFloat(r.mrp) } : {}),
      }));
    if (payloadRows.length === 0) { setError('Enter at least one size with a quantity'); return; }
    if (payloadRows.some(r => isNaN(r.quantity) || r.quantity < 0)) { setError('Quantities must be whole numbers ≥ 0'); return; }
    setSaving(true);
    try {
      await uniformService.setStock(item.uuid, { rows: payloadRows });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Bulk stock entry — {item.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 1.5 }}>
          Enter every size and its count in one go. Price is optional — add it later. Saving
          sets the counts (overwrites existing stock for the sizes listed).
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Quantity</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">MRP (optional)</TableCell>
              <TableCell width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <TextField size="small" fullWidth value={r.sizeLabel} onChange={e => updateRow(idx, 'sizeLabel', e.target.value)} placeholder="e.g. 28" />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={r.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)} inputProps={{ min: 0, style: { textAlign: 'right' } }} sx={{ width: 90 }} />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={r.mrp} onChange={e => updateRow(idx, 'mrp', e.target.value)} inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }} sx={{ width: 100 }} placeholder="—" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={addRow}>Add Size</Button>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>{totalUnits} units total</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save stock'}</Button>
      </DialogActions>
    </Dialog>
  );
};

function ItemRow({ item, onRefresh, allItems, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const [sizeDialog, setSizeDialog] = useState({ open: false, size: null });
  const [bulkStockDialog, setBulkStockDialog] = useState(false);
  const [bandDialog, setBandDialog] = useState({ open: false, band: null });
  const [breakDialog, setBreakDialog] = useState(false);
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isUnsized = item.sizingMode === 'unsized';
  const poolSize = item.sizes.find(s => s.isPool) || null;
  const poolStock = poolSize?.currentStock || 0;
  // Real (non-pool) sizes shown in the number-wise table.
  const realSizes = item.sizes.filter(s => !s.isPool);

  const totalStock = item.sizes.reduce((sum, s) => sum + (s.currentStock || 0), 0);
  const itemStockValue = realSizes.some(s => s.mrp != null)
    ? realSizes.reduce((sum, s) => sum + (s.mrp ?? 0) * (s.currentStock ?? 0), 0)
    : null;

  const handleDeleteBand = async (band) => {
    try { await uniformService.deleteBand(item.uuid, band.uuid); onRefresh(); } catch {}
  };

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

  // ── Sizes: wide table on desktop, compact list on mobile ──────────────────────
  const sizesTable = (
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
        {realSizes.map(size => {
          const stockValue = size.mrp != null && size.currentStock != null ? (size.mrp * size.currentStock).toFixed(2) : null;
          const discountedValue = size.mrp != null && size.currentStock != null ? (size.mrp * (1 - (size.studentDiscountPct || 0) / 100) * size.currentStock).toFixed(2) : null;
          return (
            <TableRow key={size.uuid} hover>
              <TableCell>{size.sizeLabel}</TableCell>
              <TableCell align="right" sx={{ color: '#8f9bb3' }}>{size.mrp != null ? `₹${size.mrp}` : '—'}</TableCell>
              <TableCell align="right" sx={{ color: '#8f9bb3' }}>{size.studentDiscountPct != null ? `${size.studentDiscountPct}%` : '—'}</TableCell>
              <TableCell align="right" sx={{ color: '#8f9bb3' }}>{stockValue != null ? `₹${stockValue}` : '—'}</TableCell>
              <TableCell align="right" sx={{ color: '#8f9bb3' }}>{discountedValue != null ? `₹${discountedValue}` : '—'}</TableCell>
              <TableCell align="right">{size.currentStock}</TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => setSizeDialog({ open: true, size })}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleDeleteSize(size)}><DeleteIcon fontSize="small" /></IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const sizesList = (
    <Box>
      {realSizes.map(size => (
        <Box key={size.uuid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #eef1f6' }}>
          <Box>
            <Typography component="span" fontWeight={600}>{size.sizeLabel}</Typography>
            <Typography component="span" variant="body2" sx={{ color: '#8f9bb3', ml: 1 }}>
              {size.currentStock ?? 0} units{size.mrp != null ? ` · ₹${size.mrp}` : ''}
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <IconButton size="small" onClick={() => setSizeDialog({ open: true, size })}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => handleDeleteSize(size)}><DeleteIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const bandsTable = (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>Number Range</TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="right">MRP</TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="right">Student Disc%</TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="right">Bulk Disc%</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {(item.bands || []).map(band => (
          <TableRow key={band.uuid} hover>
            <TableCell>{band.numberFrom} – {band.numberTo}</TableCell>
            <TableCell align="right" sx={{ color: '#8f9bb3' }}>{band.mrp != null ? `₹${band.mrp}` : '—'}</TableCell>
            <TableCell align="right" sx={{ color: '#8f9bb3' }}>{band.studentDiscountPct != null ? `${band.studentDiscountPct}%` : '—'}</TableCell>
            <TableCell align="right" sx={{ color: '#8f9bb3' }}>{band.bulkDiscountPct != null ? `${band.bulkDiscountPct}%` : '—'}</TableCell>
            <TableCell align="right">
              <IconButton size="small" onClick={() => setBandDialog({ open: true, band })}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => handleDeleteBand(band)}><DeleteIcon fontSize="small" /></IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const bandsList = (
    <Box>
      {(item.bands || []).map(band => (
        <Box key={band.uuid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #eef1f6' }}>
          <Box>
            <Typography component="span" fontWeight={600}>{band.numberFrom}–{band.numberTo}</Typography>
            <Typography component="span" variant="body2" sx={{ color: '#8f9bb3', ml: 1 }}>
              {band.mrp != null ? `₹${band.mrp}` : '—'}
              {(band.studentDiscountPct != null || band.bulkDiscountPct != null) ? ` · ${band.studentDiscountPct ?? 0}%/${band.bulkDiscountPct ?? 0}%` : ''}
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <IconButton size="small" onClick={() => setBandDialog({ open: true, band })}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => handleDeleteBand(band)}><DeleteIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const detailContent = isUnsized ? (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip label={`Pool stock: ${poolStock} units`} color="warning" variant="outlined" />
        <Button size="small" variant="outlined" disabled={poolStock <= 0} onClick={() => setBreakDialog(true)}>Break into numbers</Button>
      </Box>
      <Typography variant="subtitle2" sx={{ color: '#8f9bb3', mb: 0.5 }}>Price bands (number → price)</Typography>
      {(item.bands || []).length > 0 && (isMobile ? bandsList : bandsTable)}
      <Button size="small" startIcon={<AddIcon />} onClick={() => setBandDialog({ open: true, band: null })} sx={{ mt: (item.bands || []).length > 0 ? 1 : 0 }}>Add Band</Button>
    </>
  ) : (
    <>
      {realSizes.length > 0 && (isMobile ? sizesList : sizesTable)}
      <Box sx={{ display: 'flex', gap: 1, mt: realSizes.length > 0 ? 1 : 0, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setSizeDialog({ open: true, size: null })}>Add Size</Button>
        <Button size="small" variant="outlined" onClick={() => setBulkStockDialog(true)}>Bulk stock entry</Button>
      </Box>
    </>
  );

  const dialogs = (
    <>
      <SizeDialog
        open={sizeDialog.open}
        onClose={() => setSizeDialog({ open: false, size: null })}
        onSave={() => { setSizeDialog({ open: false, size: null }); onRefresh(); }}
        itemId={item.uuid}
        size={sizeDialog.size}
      />
      <BandDialog
        open={bandDialog.open}
        onClose={() => setBandDialog({ open: false, band: null })}
        onSave={() => { setBandDialog({ open: false, band: null }); onRefresh(); }}
        itemId={item.uuid}
        band={bandDialog.band}
      />
      <BreakDialog
        open={breakDialog}
        onClose={() => setBreakDialog(false)}
        onSave={() => { setBreakDialog(false); onRefresh(); }}
        item={item}
        poolStock={poolStock}
      />
      <BulkStockDialog
        open={bulkStockDialog}
        onClose={() => setBulkStockDialog(false)}
        onSave={() => { setBulkStockDialog(false); onRefresh(); }}
        item={item}
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

  // ── Mobile: a card per item (no wide table) ───────────────────────────────────
  if (isMobile) {
    return (
      <>
        <Card variant="outlined" sx={{ mb: 1.5 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setExpanded(e => !e)}>
                <Typography fontWeight={600}>
                  {item.name}
                  {isUnsized && <Chip label="Unsized" size="small" color="warning" variant="outlined" sx={{ ml: 1 }} />}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                  <Chip label={GENDER_LABELS[item.gender] || item.gender} size="small" color={GENDER_COLORS[item.gender] || 'default'} />
                  <Chip label={isUnsized ? `${(item.bands || []).length} bands` : `${realSizes.length} sizes`} size="small" variant="outlined" />
                  <Chip label={`${totalStock} units`} size="small" variant="outlined" />
                  {itemStockValue != null && <Chip label={`₹${itemStockValue.toFixed(2)}`} size="small" variant="outlined" />}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <IconButton size="small" onClick={() => setEditItemDialog(true)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => setDeleteConfirm(true)}><DeleteIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => setExpanded(e => !e)}>{expanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}</IconButton>
              </Box>
            </Box>
            <Collapse in={expanded}><Box sx={{ mt: 1.5 }}>{detailContent}</Box></Collapse>
          </CardContent>
        </Card>
        {dialogs}
      </>
    );
  }

  // ── Desktop: expandable table row ─────────────────────────────────────────────
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
        <TableCell sx={{ fontWeight: 500 }}>
          {item.name}
          {isUnsized && <Chip label="Unsized" size="small" color="warning" variant="outlined" sx={{ ml: 1 }} />}
        </TableCell>
        <TableCell><Chip label={CATEGORY_LABELS[item.category] || item.category} size="small" variant="outlined" /></TableCell>
        <TableCell><Chip label={GENDER_LABELS[item.gender] || item.gender} size="small" color={GENDER_COLORS[item.gender] || 'default'} /></TableCell>
        <TableCell align="right">{isUnsized ? `${(item.bands || []).length} bands` : `${realSizes.length} sizes`}</TableCell>
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
            <Box sx={{ m: 2, ml: 6 }}>{detailContent}</Box>
          </Collapse>
        </TableCell>
      </TableRow>
      {dialogs}
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
  const isMobile = useIsMobile();

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
          // Mobile: category heading + a card per item (no wide table).
          if (isMobile) {
            return (
              <Box key={cat} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{CATEGORY_LABELS[cat]}</Typography>
                {catItems.map(item => (
                  <ItemRow key={item.uuid} item={item} onRefresh={loadItems} allItems={items} isMobile />
                ))}
              </Box>
            );
          }
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
                    <ItemRow key={item.uuid} item={item} onRefresh={loadItems} allItems={items} isMobile={false} />
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
