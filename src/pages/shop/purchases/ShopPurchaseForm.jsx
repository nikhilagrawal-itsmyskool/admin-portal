import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Alert, CircularProgress, Divider, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const emptyLine = () => ({ itemId: '', itemName: '', quantity: 1, mrp: '', studentDiscountPct: '', bulkDiscountPct: '', costPerUnit: '' });

export default function ShopPurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isView = !!id;

  const [batch, setBatch] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [form, setForm] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    academicSession: '',
    supplier: '',
    invoiceNumber: '',
    notes: '',
    studentDiscountPct: '',
    bulkDiscountPct: '',
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isView);
  const [error, setError] = useState('');

  useEffect(() => {
    shopService.getItems().then(setAllItems).catch(() => {});
    if (isView) {
      shopService.getPurchaseById(id)
        .then(data => { setBatch(data); setLoading(false); })
        .catch(() => { setError('Failed to load purchase'); setLoading(false); });
    }
  }, [id, isView]);

  const setLine = (i, field, value) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const setLineItem = (i, item) => {
    setLines(prev => prev.map((l, idx) => idx === i
      ? { ...l, itemId: item?.uuid || '', itemName: item?.name || '' }
      : l
    ));
  };

  const handleSubmit = async () => {
    if (!form.purchaseDate) { setError('Purchase date is required'); return; }
    if (lines.some(l => !l.itemId)) { setError('Each line requires an item'); return; }
    if (lines.some(l => !l.quantity || l.quantity < 1)) { setError('Each line requires quantity >= 1'); return; }
    if (lines.some(l => !l.mrp || parseFloat(l.mrp) <= 0)) { setError('Each line requires MRP > 0'); return; }

    setSaving(true);
    try {
      await shopService.createPurchase({
        purchaseDate: form.purchaseDate,
        academicSession: form.academicSession || undefined,
        supplier: form.supplier || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        notes: form.notes || undefined,
        studentDiscountPct: form.studentDiscountPct ? parseFloat(form.studentDiscountPct) : undefined,
        bulkDiscountPct: form.bulkDiscountPct ? parseFloat(form.bulkDiscountPct) : undefined,
        items: lines.map(l => ({
          itemId: l.itemId,
          quantity: parseInt(l.quantity, 10),
          mrp: parseFloat(l.mrp),
          studentDiscountPct: l.studentDiscountPct ? parseFloat(l.studentDiscountPct) : undefined,
          bulkDiscountPct: l.bulkDiscountPct ? parseFloat(l.bulkDiscountPct) : undefined,
          costPerUnit: l.costPerUnit ? parseFloat(l.costPerUnit) : undefined,
        })),
      });
      navigate('/shop/purchases');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  if (isView && batch) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton onClick={() => navigate('/shop/purchases')}><BackIcon /></IconButton>
          <Typography variant="h4">Purchase Detail</Typography>
        </Box>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Date</Typography><Typography>{batch.purchaseDate}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Session</Typography><Typography>{batch.academicSession || '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{batch.supplier || '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Invoice</Typography><Typography>{batch.invoiceNumber || '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Student Discount</Typography><Typography>{batch.studentDiscountPct != null ? `${batch.studentDiscountPct}%` : '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Bulk Discount</Typography><Typography>{batch.bulkDiscountPct != null ? `${batch.bulkDiscountPct}%` : '—'}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Total Amount</Typography><Typography>₹{batch.totalAmount?.toLocaleString('en-IN') || '—'}</Typography></Grid>
            </Grid>
          </CardContent>
        </Card>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f7f9fc' }}>
              <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">MRP</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Student Disc.</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Cost/Unit</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Remaining</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(batch.items || []).map(item => (
              <TableRow key={item.uuid}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{item.itemType}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">₹{item.mrp?.toLocaleString('en-IN') || '—'}</TableCell>
                <TableCell align="right">{item.studentDiscountPct != null ? `${item.studentDiscountPct}%` : '—'}</TableCell>
                <TableCell align="right">₹{item.costPerUnit?.toLocaleString('en-IN') || '—'}</TableCell>
                <TableCell align="right">{item.remainingQuantity ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/shop/purchases')}><BackIcon /></IconButton>
        <Typography variant="h4">New Purchase</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Batch Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Purchase Date" type="date" value={form.purchaseDate}
                onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} size="small"
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Academic Session" value={form.academicSession}
                onChange={e => setForm(p => ({ ...p, academicSession: e.target.value }))} size="small"
                placeholder="e.g. 2025-26" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Supplier" value={form.supplier}
                onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Invoice Number" value={form.invoiceNumber}
                onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Default Student Discount %" value={form.studentDiscountPct}
                onChange={e => setForm(p => ({ ...p, studentDiscountPct: e.target.value }))} size="small" type="number" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Default Bulk Discount %" value={form.bulkDiscountPct}
                onChange={e => setForm(p => ({ ...p, bulkDiscountPct: e.target.value }))} size="small" type="number" />
            </Grid>
            <Grid item xs={12}>
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
                <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">MRP (₹)</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Student Disc %</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Bulk Disc %</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Cost/Unit (₹)</TableCell>
                <TableCell width={40} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={allItems}
                      getOptionLabel={opt => opt.name || ''}
                      value={allItems.find(it => it.uuid === line.itemId) || null}
                      onChange={(_, val) => setLineItem(i, val)}
                      renderInput={(params) => <TextField {...params} placeholder="Search item..." />}
                    />
                  </TableCell>
                  <TableCell><TextField size="small" type="number" value={line.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} inputProps={{ min: 1 }} sx={{ width: 70 }} /></TableCell>
                  <TableCell><TextField size="small" type="number" value={line.mrp} onChange={e => setLine(i, 'mrp', e.target.value)} sx={{ width: 90 }} /></TableCell>
                  <TableCell><TextField size="small" type="number" value={line.studentDiscountPct} onChange={e => setLine(i, 'studentDiscountPct', e.target.value)} placeholder="batch" sx={{ width: 90 }} /></TableCell>
                  <TableCell><TextField size="small" type="number" value={line.bulkDiscountPct} onChange={e => setLine(i, 'bulkDiscountPct', e.target.value)} placeholder="batch" sx={{ width: 90 }} /></TableCell>
                  <TableCell><TextField size="small" type="number" value={line.costPerUnit} onChange={e => setLine(i, 'costPerUnit', e.target.value)} placeholder="auto" sx={{ width: 90 }} /></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} disabled={lines.length === 1}>
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
        <Button onClick={() => navigate('/shop/purchases')}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save Purchase'}
        </Button>
      </Box>
    </Box>
  );
}
