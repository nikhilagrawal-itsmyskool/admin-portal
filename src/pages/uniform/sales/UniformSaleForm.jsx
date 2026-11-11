import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert,
  MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  Divider, Chip, InputAdornment, Stack,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Clear as ClearIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import { todayIso } from '../../../utils/date';
import { useIsMobile } from '../../../hooks/useIsMobile';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';
const PAYMENT_COLORS = { paid: 'success', partial: 'warning', due: 'error' };

const emptyLine = () => ({ itemId: '', sizeId: '', judgedSize: '', quantity: 1, unitPriceOverride: '' });

// Covering band for a judged number (client mirror of the server lookup).
const bandForNumber = (bands, num) => {
  const n = parseInt(num, 10);
  if (isNaN(n)) return null;
  return (bands || []).find(b => n >= b.numberFrom && n <= b.numberTo) || null;
};

export default function UniformSaleForm() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [allSets, setAllSets] = useState([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  const [student, setStudent] = useState(null);
  const [saleDate, setSaleDate] = useState(todayIso());
  const [saleType, setSaleType] = useState('student');
  const [selectedSetId, setSelectedSetId] = useState('');
  const [notes, setNotes] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [lines, setLines] = useState([emptyLine()]);

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

  const getItem = (itemId) => allItems.find(i => i.uuid === itemId) || null;
  const poolSizeOf = (item) => item?.sizes?.find(s => s.isPool) || null;
  const isUnsizedItem = (itemId) => getItem(itemId)?.sizingMode === 'unsized';
  const getSizesForItem = (itemId) => (getItem(itemId)?.sizes || []).filter(s => !s.isPool);
  const getSizeData = (itemId, sizeId) => (getItem(itemId)?.sizes || []).find(s => s.uuid === sizeId) || null;

  // Price for a line: unsized → band by judged number; sized → the size row. unitPriceOverride wins.
  const computeLinePrice = (line, type = saleType) => {
    const item = getItem(line.itemId);
    if (!item) return { mrp: null, discountPct: null, unitPrice: null, lineTotal: null, suggested: null };

    let mrp = null, discountPct = null;
    if (item.sizingMode === 'unsized') {
      const band = bandForNumber(item.bands, line.judgedSize);
      if (band && band.mrp != null) {
        mrp = band.mrp;
        discountPct = type === 'bulk' ? (band.bulkDiscountPct || 0) : (band.studentDiscountPct || 0);
      }
    } else {
      const size = getSizeData(line.itemId, line.sizeId);
      if (size && size.mrp != null) {
        mrp = size.mrp;
        discountPct = type === 'bulk' ? (size.bulkDiscountPct || 0) : (size.studentDiscountPct || 0);
      }
    }

    const suggested = mrp != null ? parseFloat((mrp * (1 - (discountPct || 0) / 100)).toFixed(2)) : null;
    const hasOverride = line.unitPriceOverride !== '' && line.unitPriceOverride != null && !isNaN(parseFloat(line.unitPriceOverride));
    const unitPrice = hasOverride ? parseFloat(parseFloat(line.unitPriceOverride).toFixed(2)) : suggested;
    const lineTotal = unitPrice != null ? parseFloat((unitPrice * (parseInt(line.quantity, 10) || 0)).toFixed(2)) : null;
    return { mrp, discountPct, unitPrice, lineTotal, suggested };
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      if (field === 'itemId') {
        const item = getItem(value);
        updated.sizeId = item?.sizingMode === 'unsized' ? (poolSizeOf(item)?.uuid || '') : '';
        updated.judgedSize = '';
        updated.unitPriceOverride = '';
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
      const newLines = expanded.map(entry => {
        const item = getItem(entry.itemId);
        const unsized = item?.sizingMode === 'unsized';
        return {
          ...emptyLine(),
          itemId: entry.itemId,
          sizeId: unsized ? (poolSizeOf(item)?.uuid || '') : '',
          quantity: entry.quantity,
        };
      });
      setLines(newLines.length > 0 ? newLines : [emptyLine()]);
    } catch {}
  };

  // Line is sellable: sized needs a sizeId; unsized needs a judged number.
  const lineIsValid = (l) => {
    if (!l.itemId || !(parseInt(l.quantity, 10) > 0)) return false;
    return isUnsizedItem(l.itemId) ? !!String(l.judgedSize).trim() : !!l.sizeId;
  };

  const totals = lines.reduce((acc, line) => {
    const { mrp, lineTotal } = computeLinePrice(line);
    if (lineTotal != null) {
      acc.totalMrp += (mrp || 0) * (parseInt(line.quantity, 10) || 0);
      acc.totalAmount += lineTotal;
    }
    return acc;
  }, { totalMrp: 0, totalAmount: 0 });
  totals.totalDiscount = Math.max(0, parseFloat((totals.totalMrp - totals.totalAmount).toFixed(2)));

  const paid = parseFloat(amountPaid) || 0;
  const balance = totals.totalAmount - paid;
  const paymentStatus = paid >= totals.totalAmount ? 'paid' : paid > 0 ? 'partial' : 'due';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student) { setError('Select a student'); return; }
    const validLines = lines.filter(lineIsValid);
    if (validLines.length === 0) { setError('Add at least one item (pick a size, or enter a number for unsized items)'); return; }

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
        items: validLines.map(l => {
          const unsized = isUnsizedItem(l.itemId);
          const { unitPrice, suggested } = computeLinePrice(l);
          const overridden = unsized && unitPrice != null && suggested != null && unitPrice !== suggested;
          return {
            itemId: l.itemId,
            sizeId: l.sizeId,
            quantity: parseInt(l.quantity, 10),
            ...(unsized ? { judgedSize: String(l.judgedSize).trim() } : {}),
            ...(overridden ? { unitPriceOverride: unitPrice } : {}),
          };
        }),
      };
      const result = await uniformService.createSale(payload);
      navigate(`/uniform/sales/${result.uuid}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to create sale');
    } finally {
      setSaving(false);
    }
  };

  // ── Line editors ────────────────────────────────────────────────────────────

  const ItemSelect = ({ line, idx }) => (
    <TextField select fullWidth size="small" label={isMobile ? 'Item' : undefined} value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)}>
      <MenuItem value="">Select item...</MenuItem>
      {allItems.map(item => (
        <MenuItem key={item.uuid} value={item.uuid}>
          {item.name}{item.sizingMode === 'unsized' ? ' · unsized' : ''}
        </MenuItem>
      ))}
    </TextField>
  );

  // Size picker (sized) OR number input (unsized).
  const SizeOrNumber = ({ line, idx }) => {
    if (isUnsizedItem(line.itemId)) {
      const pool = poolSizeOf(getItem(line.itemId));
      return (
        <TextField
          fullWidth size="small" label={isMobile ? 'Number' : undefined}
          value={line.judgedSize}
          onChange={e => updateLine(idx, 'judgedSize', e.target.value)}
          placeholder="Number"
          helperText={pool ? `pool: ${pool.currentStock}` : undefined}
        />
      );
    }
    return (
      <TextField select fullWidth size="small" label={isMobile ? 'Size' : undefined} value={line.sizeId} onChange={e => updateLine(idx, 'sizeId', e.target.value)} disabled={!line.itemId}>
        <MenuItem value="">Size...</MenuItem>
        {getSizesForItem(line.itemId).map(s => (
          <MenuItem key={s.uuid} value={s.uuid}>{s.sizeLabel} {s.currentStock != null ? `(${s.currentStock})` : ''}</MenuItem>
        ))}
      </TextField>
    );
  };

  // Unit price: editable for unsized (operator judgment), read-only for sized.
  const UnitPriceCell = ({ line, idx }) => {
    const { unitPrice, suggested } = computeLinePrice(line);
    if (isUnsizedItem(line.itemId)) {
      return (
        <TextField
          size="small" type="number" label={isMobile ? 'Unit Price' : undefined}
          value={line.unitPriceOverride !== '' ? line.unitPriceOverride : (suggested != null ? suggested : '')}
          onChange={e => updateLine(idx, 'unitPriceOverride', e.target.value)}
          inputProps={{ step: '0.01', min: 0, style: { textAlign: isMobile ? 'left' : 'right' } }}
          sx={{ width: isMobile ? '100%' : 110 }}
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          placeholder={suggested != null ? String(suggested) : ''}
        />
      );
    }
    return <span>{unitPrice != null ? `₹${unitPrice}` : '—'}</span>;
  };

  // ── Mobile: one card per line ────────────────────────────────────────────────
  const MobileLines = () => (
    <Stack spacing={2}>
      {lines.map((line, idx) => {
        const { mrp, discountPct, lineTotal } = computeLinePrice(line);
        return (
          <Card key={idx} variant="outlined">
            <CardContent sx={{ pb: '12px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Item {idx + 1}</Typography>
                <IconButton size="small" color="error" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <Stack spacing={1.5}>
                <ItemSelect line={line} idx={idx} />
                <Grid container spacing={1.5}>
                  <Grid item xs={8}><SizeOrNumber line={line} idx={idx} /></Grid>
                  <Grid item xs={4}>
                    <TextField type="number" fullWidth size="small" label="Qty" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} inputProps={{ min: 1, style: { textAlign: 'left' } }} />
                  </Grid>
                </Grid>
                <UnitPriceCell line={line} idx={idx} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#8f9bb3' }}>
                  <Typography variant="body2">MRP {mrp != null ? `₹${mrp}` : '—'}{discountPct ? ` · ${discountPct}% off` : ''}</Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">{lineTotal != null ? `₹${lineTotal}` : '—'}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );

  // ── Desktop: table ───────────────────────────────────────────────────────────
  const DesktopLines = () => (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: '#f7f9fc' }}>
          <TableCell sx={{ fontWeight: 600, width: '26%' }}>Item</TableCell>
          <TableCell sx={{ fontWeight: 600, width: '18%' }}>Size / Number</TableCell>
          <TableCell sx={{ fontWeight: 600, width: '8%' }}>Qty</TableCell>
          <TableCell sx={{ fontWeight: 600, width: '12%' }} align="right">MRP</TableCell>
          <TableCell sx={{ fontWeight: 600, width: '10%' }} align="right">Disc%</TableCell>
          <TableCell sx={{ fontWeight: 600, width: '14%' }} align="right">Unit Price</TableCell>
          <TableCell sx={{ fontWeight: 600, width: '12%' }} align="right">Line Total</TableCell>
          <TableCell width={40} />
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line, idx) => {
          const { mrp, discountPct, lineTotal } = computeLinePrice(line);
          return (
            <TableRow key={idx}>
              <TableCell><ItemSelect line={line} idx={idx} /></TableCell>
              <TableCell><SizeOrNumber line={line} idx={idx} /></TableCell>
              <TableCell>
                <TextField type="number" fullWidth size="small" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} inputProps={{ min: 1 }} />
              </TableCell>
              <TableCell align="right" sx={{ color: '#8f9bb3' }}>{mrp != null ? `₹${mrp}` : '—'}</TableCell>
              <TableCell align="right" sx={{ color: '#8f9bb3' }}>{discountPct != null ? `${discountPct}%` : '—'}</TableCell>
              <TableCell align="right"><UnitPriceCell line={line} idx={idx} /></TableCell>
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
  );

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
              <Grid item xs={6} md={2}>
                <TextField fullWidth label="Sale Date" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={6} md={2}>
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
              <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add {isMobile ? 'Item' : 'Row'}</Button>
            </Box>
            {isMobile ? <MobileLines /> : <DesktopLines />}
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
