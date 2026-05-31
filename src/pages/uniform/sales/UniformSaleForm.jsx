import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert,
  MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  Divider, Chip, InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Clear as ClearIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';
const PAYMENT_COLORS = { paid: 'success', partial: 'warning', due: 'error' };

export default function UniformSaleForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [allSets, setAllSets] = useState([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  const [student, setStudent] = useState(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState('student');
  const [selectedSetId, setSelectedSetId] = useState('');
  const [notes, setNotes] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [lines, setLines] = useState([{ itemId: '', sizeId: '', quantity: 1, mrp: null, unitPrice: null, lineTotal: null }]);

  useEffect(() => {
    loadMeta();
  }, []);

  const loadMeta = async () => {
    try {
      const [items, sets] = await Promise.all([uniformService.getItems(), uniformService.getSets()]);
      setAllItems(items);
      setAllSets(sets);
    } catch {}
  };

  const getSizesForItem = (itemId) => {
    const item = allItems.find(i => i.uuid === itemId);
    return item?.sizes || [];
  };

  const getSizeData = (itemId, sizeId) => {
    const sizes = getSizesForItem(itemId);
    return sizes.find(s => s.uuid === sizeId) || null;
  };

  const computeLinePrice = (line, type = saleType) => {
    const size = getSizeData(line.itemId, line.sizeId);
    if (!size || !size.mrp) return { mrp: null, discountPct: null, unitPrice: null, lineTotal: null };
    const mrp = size.mrp;
    const discountPct = type === 'bulk' ? (size.bulkDiscountPct || 0) : (size.studentDiscountPct || 0);
    const unitPrice = parseFloat((mrp * (1 - discountPct / 100)).toFixed(2));
    const lineTotal = parseFloat((unitPrice * line.quantity).toFixed(2));
    return { mrp, discountPct, unitPrice, lineTotal };
  };

  const addLine = () => setLines(prev => [...prev, { itemId: '', sizeId: '', quantity: 1, mrp: null, unitPrice: null, lineTotal: null }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      if (field === 'itemId') { updated.sizeId = ''; updated.mrp = null; updated.unitPrice = null; updated.lineTotal = null; }
      if (field === 'sizeId' || field === 'quantity') {
        const computed = computeLinePrice(updated);
        Object.assign(updated, computed);
      }
      return updated;
    }));
  };

  const handleSetSelect = async (e) => {
    const setId = e.target.value;
    setSelectedSetId(setId);
    if (!setId) return;
    try {
      const expanded = await uniformService.expandSet(setId);
      const newLines = expanded.map(item => ({
        itemId: item.itemId, sizeId: '', quantity: item.quantity,
        mrp: null, unitPrice: null, lineTotal: null,
      }));
      setLines(newLines.length > 0 ? newLines : [{ itemId: '', sizeId: '', quantity: 1 }]);
    } catch {}
  };

  const totals = lines.reduce((acc, line) => {
    const { mrp, discountPct, lineTotal } = computeLinePrice(line);
    if (lineTotal != null) {
      acc.totalMrp += (mrp || 0) * line.quantity;
      acc.totalDiscount += ((mrp || 0) - (mrp || 0) * (1 - (discountPct || 0) / 100)) * line.quantity;
      acc.totalAmount += lineTotal;
    }
    return acc;
  }, { totalMrp: 0, totalDiscount: 0, totalAmount: 0 });

  const paid = parseFloat(amountPaid) || 0;
  const balance = totals.totalAmount - paid;
  const paymentStatus = paid >= totals.totalAmount ? 'paid' : paid > 0 ? 'partial' : 'due';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student) { setError('Select a student'); return; }
    const validLines = lines.filter(l => l.itemId && l.sizeId && l.quantity > 0);
    if (validLines.length === 0) { setError('Add at least one item with a size'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        studentId: student.uuid,
        saleDate,
        saleType,
        setId: selectedSetId || undefined,
        amountPaid: paid,
        notes: notes || undefined,
        items: validLines.map(l => ({
          itemId: l.itemId,
          sizeId: l.sizeId,
          quantity: parseInt(l.quantity),
        })),
      };
      const result = await uniformService.createSale(payload);
      navigate(`/uniform/sales/${result.uuid}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to create sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>New Sale</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth label="Student" value={student?.name || ''}
                  placeholder="Click to search student..."
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        {student && <IconButton size="small" onClick={() => setStudent(null)}><ClearIcon fontSize="small" /></IconButton>}
                        <Button size="small" onClick={() => setStudentDialogOpen(true)}>Search</Button>
                      </InputAdornment>
                    ),
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Sale Date" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth select label="Sale Type" value={saleType} onChange={e => setSaleType(e.target.value)}>
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="bulk">Bulk / Institutional</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth select label="Load from Set (optional)" value={selectedSetId} onChange={handleSetSelect}>
                  <MenuItem value="">— No set —</MenuItem>
                  {allSets.map(s => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Items</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add Row</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <TableCell sx={{ fontWeight: 600, width: '28%' }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '18%' }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '8%' }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '12%' }} align="right">MRP</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '10%' }} align="right">Disc%</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '12%' }} align="right">Unit Price</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '12%' }} align="right">Line Total</TableCell>
                  <TableCell width={40} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => {
                  const { mrp, discountPct: computedDisc, unitPrice, lineTotal } = computeLinePrice(line);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <TextField select fullWidth size="small" value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)}>
                          <MenuItem value="">Select item...</MenuItem>
                          {allItems.map(item => <MenuItem key={item.uuid} value={item.uuid}>{item.name}</MenuItem>)}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField select fullWidth size="small" value={line.sizeId} onChange={e => updateLine(idx, 'sizeId', e.target.value)} disabled={!line.itemId}>
                          <MenuItem value="">Size...</MenuItem>
                          {getSizesForItem(line.itemId).map(s => (
                            <MenuItem key={s.uuid} value={s.uuid}>{s.sizeLabel} {s.currentStock != null ? `(${s.currentStock})` : ''}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField type="number" fullWidth size="small" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} inputProps={{ min: 1 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#8f9bb3' }}>{mrp != null ? `₹${mrp}` : '—'}</TableCell>
                      <TableCell align="right" sx={{ color: '#8f9bb3' }}>{computedDisc != null ? `${computedDisc}%` : '—'}</TableCell>
                      <TableCell align="right">{unitPrice != null ? `₹${unitPrice}` : '—'}</TableCell>
                      <TableCell align="right">{lineTotal != null ? `₹${lineTotal}` : '—'}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals + Payment */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ bgcolor: '#f7f9fc', borderRadius: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography color="text.secondary">Total MRP</Typography>
                    <Typography>{formatCurrency(totals.totalMrp)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography color="text.secondary">Total Discount</Typography>
                    <Typography color="success.main">- {formatCurrency(totals.totalDiscount)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontWeight={600}>Total Amount</Typography>
                    <Typography fontWeight={600} variant="h6">{formatCurrency(totals.totalAmount)}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ bgcolor: '#f7f9fc', borderRadius: 1, p: 2 }}>
                  <TextField
                    fullWidth label="Amount Paid (₹)" type="number" value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    inputProps={{ step: '0.01', min: 0 }}
                    sx={{ mb: 1.5 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography color="text.secondary">Balance Due</Typography>
                    <Typography color={balance > 0 ? 'error.main' : 'success.main'} fontWeight={600}>
                      {balance > 0 ? `₹${balance.toFixed(2)}` : '₹0.00'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography color="text.secondary">Payment Status</Typography>
                    <Chip label={paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partial' : 'Due'} size="small" color={PAYMENT_COLORS[paymentStatus]} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Create Sale'}</Button>
          <Button variant="outlined" onClick={() => navigate('/uniform/sales')}>Cancel</Button>
        </Box>
      </form>

      <StudentSearchDialog
        open={studentDialogOpen}
        onClose={() => setStudentDialogOpen(false)}
        onSelect={(s) => { setStudent(s); setStudentDialogOpen(false); }}
      />
    </Box>
  );
}
