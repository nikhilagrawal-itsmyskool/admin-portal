import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Alert, CircularProgress, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const SECTION_LABELS = { main: 'Books', other: 'Stationery', additional: 'Additional' };
const emptyItem = () => ({ itemId: '', itemName: '', section: 'main', quantity: 1, mrp: '', discountPct: '' });
const formatCurrency = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const lineTotal = (it) => {
  const mrp = parseFloat(it.mrp) || 0;
  const disc = parseFloat(it.discountPct) || 0;
  const qty = parseInt(it.quantity, 10) || 0;
  return Math.round(qty * mrp * (1 - disc / 100) * 100) / 100;
};

export default function ShopSetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [allItems, setAllItems] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [form, setForm] = useState({ name: '', grade: '', academicSession: '', description: '' });
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    shopService.getLookups().then(setLookups).catch(() => {});
    shopService.getItems().then(setAllItems).catch(() => {});
    if (isEdit) {
      shopService.getSetById(id).then(set => {
        setForm({ name: set.name, grade: set.grade, academicSession: set.academicSession, description: set.description || '' });
        setItems(set.items.map(i => ({
          itemId: i.itemId, itemName: i.itemName, section: i.section,
          quantity: i.quantity, mrp: i.mrp ?? '', discountPct: i.discountPct ?? '',
        })));
        setLoading(false);
      }).catch(() => { setError('Failed to load set'); setLoading(false); });
    }
  }, [id, isEdit]);

  const setItem = (i, field, value) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  const setItemRef = (i, item) => setItems(prev => prev.map((it, idx) => idx === i
    ? { ...it, itemId: item?.uuid || '', itemName: item?.name || '', section: item?.type === 'stationery' ? 'other' : it.section }
    : it));

  const setPrice = items.reduce((s, it) => s + lineTotal(it), 0);

  const handleSubmit = async () => {
    if (!form.grade) { setError('Grade is required'); return; }
    if (!form.academicSession.trim()) { setError('Academic Session is required'); return; }
    if (items.some(it => !it.itemId)) { setError('Each line requires an item'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || undefined,
        grade: form.grade,
        academicSession: form.academicSession.trim(),
        description: form.description || undefined,
        items: items.map((it, idx) => ({
          itemId: it.itemId, section: it.section,
          quantity: parseInt(it.quantity, 10),
          mrp: it.mrp === '' ? undefined : parseFloat(it.mrp),
          discountPct: it.discountPct === '' ? undefined : parseFloat(it.discountPct),
          sortOrder: idx,
        })),
      };
      if (isEdit) await shopService.updateSet(id, payload);
      else await shopService.createSet(payload);
      navigate(isEdit ? `/shop/sets/${id}` : '/shop/sets');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save set');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/shop/sets')}><BackIcon /></IconButton>
        <Typography variant="h4">{isEdit ? 'Edit Grade Set' : 'New Grade Set'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Set Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select label="Grade" value={form.grade}
                onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} size="small" disabled={isEdit}>
                {(lookups?.grades || []).map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Academic Session" value={form.academicSession}
                onChange={e => setForm(p => ({ ...p, academicSession: e.target.value }))} size="small"
                placeholder="e.g. 2026-27" disabled={isEdit} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Set Name (optional)" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description (optional)" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Items</Typography>
            <Button startIcon={<AddIcon />} onClick={() => setItems(p => [...p, emptyItem()])}>Add Item</Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 130 }}>Group</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 70 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 90 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Disc %</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Total</TableCell>
                <TableCell width={40} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={allItems}
                      getOptionLabel={opt => opt.name || ''}
                      value={allItems.find(it => it.uuid === item.itemId) || null}
                      onChange={(_, val) => setItemRef(i, val)}
                      renderInput={(params) => <TextField {...params} placeholder="Search item..." />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField select size="small" fullWidth value={item.section} onChange={e => setItem(i, 'section', e.target.value)}>
                      {Object.entries(SECTION_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><TextField size="small" type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} inputProps={{ min: 1 }} sx={{ width: 64 }} /></TableCell>
                  <TableCell><TextField size="small" type="number" value={item.mrp} onChange={e => setItem(i, 'mrp', e.target.value)} inputProps={{ min: 0, step: '0.01' }} sx={{ width: 80 }} /></TableCell>
                  <TableCell><TextField size="small" type="number" value={item.discountPct} onChange={e => setItem(i, 'discountPct', e.target.value)} inputProps={{ min: 0, max: 100 }} sx={{ width: 70 }} /></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{formatCurrency(lineTotal(item))}</Typography></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} align="right"><Typography variant="subtitle1" fontWeight={600}>Set price</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle1" fontWeight={700}>{formatCurrency(setPrice)}</Typography></TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={() => navigate('/shop/sets')}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Update Set' : 'Create Set'}
        </Button>
      </Box>
    </Box>
  );
}
