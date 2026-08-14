import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Alert, CircularProgress, Autocomplete, Divider, Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';
import api from '../../../config/api';
import { todayIso } from '../../../utils/date';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0';
const emptyLine = () => ({ itemId: '', itemName: '', quantity: 1 });

export default function ShopSaleForm() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [sets, setSets] = useState([]);
  const [form, setForm] = useState({
    studentId: '', saleDate: todayIso(),
    academicSession: '', setId: '', amountPaid: '', notes: '',
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    shopService.getItems().then(setAllItems).catch(() => {});
    shopService.getSets().then(setSets).catch(() => {});
    api.get('/student/search').then(r => setStudents(r.data || [])).catch(() => {});
  }, []);

  const setLine = (i, field, value) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const setLineItem = (i, item) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, itemId: item?.uuid || '', itemName: item?.name || '' } : l));

  const loadFromSet = async (setId) => {
    if (!setId) return;
    try {
      const set = await shopService.getSetById(setId);
      setLines(set.items.map(i => ({ itemId: i.itemId, itemName: i.itemName, quantity: i.quantity })));
    } catch {
      setError('Failed to load set items');
    }
  };

  // Derive totals from items' lastMrp
  const lineItems = lines.map(l => {
    const item = allItems.find(it => it.uuid === l.itemId);
    const mrp = item?.lastMrp || 0;
    const discountPct = item?.lastStudentDiscountPct || 0;
    const unitPrice = parseFloat((mrp * (1 - discountPct / 100)).toFixed(2));
    return { ...l, mrp, discountPct, unitPrice, lineTotal: parseFloat((unitPrice * (parseInt(l.quantity, 10) || 1)).toFixed(2)) };
  });

  const totalAmount = lineItems.reduce((s, l) => s + l.lineTotal, 0);

  const handleSubmit = async () => {
    if (!form.studentId) { setError('Student is required'); return; }
    if (!form.saleDate) { setError('Sale date is required'); return; }
    if (lines.some(l => !l.itemId)) { setError('Each line requires an item'); return; }
    if (form.amountPaid === '' || parseFloat(form.amountPaid) < 0) { setError('Amount paid is required'); return; }

    setSaving(true);
    try {
      await shopService.createSale({
        studentId: form.studentId,
        saleDate: form.saleDate,
        academicSession: form.academicSession || undefined,
        setId: form.setId || undefined,
        amountPaid: parseFloat(form.amountPaid),
        notes: form.notes || undefined,
        items: lines.map(l => ({ itemId: l.itemId, quantity: parseInt(l.quantity, 10) })),
      });
      navigate('/shop/sales');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to create sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/shop/sales')}><BackIcon /></IconButton>
        <Typography variant="h4">New Sale</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Sale Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={students}
                getOptionLabel={opt => opt.name ? `${opt.name}${opt.admissionNo ? ` (#${opt.admissionNo})` : ''}` : ''}
                onChange={(_, val) => setForm(p => ({ ...p, studentId: val?.uuid || '' }))}
                renderInput={(params) => <TextField {...params} label="Student" />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Sale Date" type="date" value={form.saleDate}
                onChange={e => setForm(p => ({ ...p, saleDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Academic Session" value={form.academicSession}
                onChange={e => setForm(p => ({ ...p, academicSession: e.target.value }))} size="small" placeholder="e.g. 2025-26" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Load from Class Set (optional)" value={form.setId}
                onChange={e => { setForm(p => ({ ...p, setId: e.target.value })); loadFromSet(e.target.value); }} size="small">
                <MenuItem value="">— No Set —</MenuItem>
                {sets.map(s => <MenuItem key={s.uuid} value={s.uuid}>{s.name} (Class {s.classNo}, {s.academicSession})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Notes" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Items</Typography>
            <Button startIcon={<AddIcon />} onClick={() => setLines(p => [...p, emptyLine()])}>Add Line</Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 240 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Disc.</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Unit Price</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Total</TableCell>
                <TableCell width={40} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={allItems}
                      getOptionLabel={opt => opt.name ? `${opt.name}${opt.classNo ? ` (Class ${opt.classNo})` : ''}` : ''}
                      value={allItems.find(it => it.uuid === line.itemId) || null}
                      onChange={(_, val) => setLineItem(i, val)}
                      renderInput={(params) => <TextField {...params} placeholder="Search item..." />}
                    />
                  </TableCell>
                  <TableCell><TextField size="small" type="number" value={line.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} inputProps={{ min: 1 }} sx={{ width: 70 }} /></TableCell>
                  <TableCell align="right"><Typography variant="body2">{formatCurrency(line.mrp)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2">{line.discountPct ? `${line.discountPct}%` : '—'}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2">{formatCurrency(line.unitPrice)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{formatCurrency(line.lineTotal)}</Typography></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} disabled={lines.length === 1}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} align="right"><Typography variant="subtitle1" fontWeight={600}>Total</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle1" fontWeight={700}>{formatCurrency(totalAmount)}</Typography></TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Payment</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Amount Paid (₹)" type="number" value={form.amountPaid}
                onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} size="small" inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Total: <strong>{formatCurrency(totalAmount)}</strong>
              </Typography>
              {form.amountPaid !== '' && (
                <Typography variant="body2" color="text.secondary">
                  Balance: <strong style={{ color: totalAmount - parseFloat(form.amountPaid || 0) > 0 ? '#ff3d71' : '#00d68f' }}>
                    {formatCurrency(totalAmount - parseFloat(form.amountPaid || 0))}
                  </strong>
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={() => navigate('/shop/sales')}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Create Sale'}
        </Button>
      </Box>
    </Box>
  );
}
