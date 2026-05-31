import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Alert, CircularProgress, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const SECTION_LABELS = { main: 'Main', additional: 'Additional Reading', other: 'Other' };
const emptyItem = () => ({ itemId: '', itemName: '', section: 'main', quantity: 1, sortOrder: 0 });

export default function ShopSetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [allItems, setAllItems] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [form, setForm] = useState({ name: '', classNo: '', academicSession: '', description: '' });
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    shopService.getLookups().then(setLookups).catch(() => {});
    shopService.getItems().then(setAllItems).catch(() => {});
    if (isEdit) {
      shopService.getSetById(id).then(set => {
        setForm({ name: set.name, classNo: set.classNo, academicSession: set.academicSession, description: set.description || '' });
        setItems(set.items.map(i => ({
          itemId: i.itemId, itemName: i.itemName, section: i.section,
          quantity: i.quantity, sortOrder: i.sortOrder,
        })));
        setLoading(false);
      }).catch(() => { setError('Failed to load set'); setLoading(false); });
    }
  }, [id, isEdit]);

  const setItem = (i, field, value) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  const setItemRef = (i, item) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, itemId: item?.uuid || '', itemName: item?.name || '' } : it));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.classNo) { setError('Class No is required'); return; }
    if (!form.academicSession.trim()) { setError('Academic Session is required'); return; }
    if (items.some(it => !it.itemId)) { setError('Each item line requires an item'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        classNo: parseInt(form.classNo, 10),
        academicSession: form.academicSession.trim(),
        description: form.description || undefined,
        items: items.map((it, idx) => ({
          itemId: it.itemId, section: it.section,
          quantity: parseInt(it.quantity, 10), sortOrder: idx,
        })),
      };
      if (isEdit) {
        await shopService.updateSet(id, payload);
      } else {
        await shopService.createSet(payload);
      }
      navigate('/shop/sets');
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
        <Typography variant="h4">{isEdit ? 'Edit Class Set' : 'New Class Set'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Set Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select label="Class No" value={form.classNo}
                onChange={e => setForm(p => ({ ...p, classNo: e.target.value }))} size="small" disabled={isEdit}>
                {(lookups?.classNos || []).map(n => <MenuItem key={n} value={n}>Class {n}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Academic Session" value={form.academicSession}
                onChange={e => setForm(p => ({ ...p, academicSession: e.target.value }))} size="small"
                placeholder="e.g. 2025-26" disabled={isEdit} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Set Name" value={form.name}
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
                <TableCell sx={{ fontWeight: 600, minWidth: 240 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 160 }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Qty</TableCell>
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
                      getOptionLabel={opt => opt.name ? `${opt.name}${opt.classNo ? ` (Class ${opt.classNo})` : ''}` : ''}
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
                  <TableCell>
                    <TextField size="small" type="number" value={item.quantity}
                      onChange={e => setItem(i, 'quantity', e.target.value)} inputProps={{ min: 1 }} sx={{ width: 70 }} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
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
