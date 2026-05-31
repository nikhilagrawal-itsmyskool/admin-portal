import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert,
  CircularProgress, IconButton, MenuItem, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, AttachFile as AttachIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

function computeLineCost(mrp, bulkDiscountPct) {
  if (!mrp) return null;
  return parseFloat((mrp * (1 - (bulkDiscountPct || 0) / 100)).toFixed(2));
}

export default function UniformPurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isView = Boolean(id);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(isView);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [billLoading, setBillLoading] = useState(false);

  const [header, setHeader] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    supplier: '',
    invoiceNumber: '',
    notes: '',
    studentDiscountPct: '',
    bulkDiscountPct: '',
  });

  const [lines, setLines] = useState([{ itemId: '', sizeId: '', quantity: 1, mrp: '', studentDiscountPct: '', bulkDiscountPct: '' }]);
  const [bill, setBill] = useState(null); // { fileName, mimeType, base64Data }
  const [viewData, setViewData] = useState(null);

  useEffect(() => {
    loadItems();
    if (isView) loadPurchase();
  }, []);

  const loadItems = async () => {
    try {
      const data = await uniformService.getItems();
      setAllItems(data);
    } catch {}
  };

  const loadPurchase = async () => {
    try {
      const data = await uniformService.getPurchaseById(id);
      setViewData(data);
    } catch {
      setError('Failed to load purchase');
    } finally {
      setLoading(false);
    }
  };

  const getSizesForItem = (itemId) => {
    const item = allItems.find(i => i.uuid === itemId);
    return item?.sizes || [];
  };

  const handleHeaderDiscountChange = (field, value) => {
    setHeader(p => ({ ...p, [field]: value }));
    // Propagate to all lines
    setLines(prev => prev.map(line => ({ ...line, [field]: value })));
  };

  const addLine = () => setLines(prev => [...prev, {
    itemId: '', sizeId: '', quantity: 1, mrp: '',
    studentDiscountPct: header.studentDiscountPct,
    bulkDiscountPct: header.bulkDiscountPct,
  }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      if (field === 'itemId') updated.sizeId = '';
      return updated;
    }));
  };

  const handleBillSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      setError('Bill must be a PDF, JPEG, or PNG file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target.result.split(',')[1];
      setBill({ fileName: file.name, mimeType: file.type, base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenBill = async () => {
    setBillLoading(true);
    try {
      const data = await uniformService.getPurchaseBill(id);
      if (data?.data) {
        const url = `data:${data.mimeType};base64,${data.data}`;
        window.open(url, '_blank');
      }
    } catch {
      setError('Failed to load bill');
    } finally {
      setBillLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter(l => l.itemId && l.sizeId && l.quantity > 0 && l.mrp);
    if (validLines.length === 0) { setError('Add at least one item line with MRP'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        purchaseDate: header.purchaseDate,
        supplier: header.supplier,
        invoiceNumber: header.invoiceNumber,
        notes: header.notes,
        items: validLines.map(l => ({
          itemId: l.itemId,
          sizeId: l.sizeId,
          quantity: parseInt(l.quantity),
          mrp: parseFloat(l.mrp),
          studentDiscountPct: l.studentDiscountPct !== '' ? parseFloat(l.studentDiscountPct) : undefined,
          bulkDiscountPct: l.bulkDiscountPct !== '' ? parseFloat(l.bulkDiscountPct) : undefined,
        })),
        bill: bill || undefined,
      };
      await uniformService.createPurchase(payload);
      navigate('/uniform/purchases');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  // View mode
  if (isView && viewData) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Purchase Details</Typography>
          <Button variant="outlined" onClick={() => navigate('/uniform/purchases')}>Back to List</Button>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}><Typography variant="caption" color="text.secondary">Date</Typography><Typography>{new Date(viewData.purchaseDate).toLocaleDateString('en-IN')}</Typography></Grid>
              <Grid item xs={6} md={3}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography>{viewData.supplier || '—'}</Typography></Grid>
              <Grid item xs={6} md={3}><Typography variant="caption" color="text.secondary">Invoice #</Typography><Typography>{viewData.invoiceNumber || '—'}</Typography></Grid>
              <Grid item xs={6} md={3}><Typography variant="caption" color="text.secondary">Total</Typography><Typography fontWeight={600}>{viewData.totalAmount != null ? `₹${viewData.totalAmount}` : '—'}</Typography></Grid>
              {viewData.notes && <Grid item xs={12}><Typography variant="caption" color="text.secondary">Notes</Typography><Typography>{viewData.notes}</Typography></Grid>}
              {viewData.fileId && (
                <Grid item xs={12}>
                  <Tooltip title="Click to open bill">
                    <Chip
                      icon={<AttachIcon />}
                      label={billLoading ? 'Opening...' : 'Bill attached'}
                      size="small"
                      variant="outlined"
                      clickable
                      disabled={billLoading}
                      onClick={handleOpenBill}
                      deleteIcon={<OpenIcon />}
                      onDelete={handleOpenBill}
                    />
                  </Tooltip>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Items Purchased</Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">MRP</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Student Disc%</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Bulk Disc%</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Cost/Unit</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Line Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewData.items.map(item => {
                  const lineTotal = item.costPerUnit != null ? (item.costPerUnit * item.quantity).toFixed(2) : null;
                  return (
                    <TableRow key={item.uuid}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.sizeLabel}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{item.mrp != null ? `₹${item.mrp}` : '—'}</TableCell>
                      <TableCell align="right">{item.studentDiscountPct != null ? `${item.studentDiscountPct}%` : '—'}</TableCell>
                      <TableCell align="right">{item.bulkDiscountPct != null ? `${item.bulkDiscountPct}%` : '—'}</TableCell>
                      <TableCell align="right">{item.costPerUnit != null ? `₹${item.costPerUnit}` : '—'}</TableCell>
                      <TableCell align="right">{lineTotal != null ? `₹${lineTotal}` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Compute line totals for create mode
  const lineTotals = lines.map(l => {
    const mrp = parseFloat(l.mrp) || 0;
    const bulkDisc = parseFloat(l.bulkDiscountPct) || 0;
    const qty = parseInt(l.quantity) || 0;
    if (!mrp || !qty) return { costPerUnit: null, lineTotal: null };
    const costPerUnit = computeLineCost(mrp, bulkDisc);
    return { costPerUnit, lineTotal: parseFloat((costPerUnit * qty).toFixed(2)) };
  });
  const totalAmount = lineTotals.reduce((sum, l) => sum + (l.lineTotal || 0), 0);

  // Create mode
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Record Purchase</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Purchase Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Purchase Date" type="date" value={header.purchaseDate} onChange={e => setHeader(p => ({ ...p, purchaseDate: e.target.value }))} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Supplier" value={header.supplier} onChange={e => setHeader(p => ({ ...p, supplier: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Invoice Number" value={header.invoiceNumber} onChange={e => setHeader(p => ({ ...p, invoiceNumber: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Student Disc % (default)" type="number" value={header.studentDiscountPct}
                  onChange={e => handleHeaderDiscountChange('studentDiscountPct', e.target.value)}
                  inputProps={{ step: '0.01', min: 0, max: 100 }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Bulk Disc % (default)" type="number" value={header.bulkDiscountPct}
                  onChange={e => handleHeaderDiscountChange('bulkDiscountPct', e.target.value)}
                  inputProps={{ step: '0.01', min: 0, max: 100 }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Notes" value={header.notes} onChange={e => setHeader(p => ({ ...p, notes: e.target.value }))} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Items</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add Row</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <TableCell sx={{ fontWeight: 600, width: '25%' }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '16%' }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '6%' }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '10%' }}>MRP (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '9%' }}>Stu Disc%</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '9%' }}>Bulk Disc%</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '10%' }} align="right">Cost/Unit</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '10%' }} align="right">Line Total</TableCell>
                  <TableCell width={40} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField select fullWidth size="small" value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)}>
                        <MenuItem value="">Select item...</MenuItem>
                        {allItems.map(item => <MenuItem key={item.uuid} value={item.uuid}>{item.name}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField select fullWidth size="small" value={line.sizeId} onChange={e => updateLine(idx, 'sizeId', e.target.value)} disabled={!line.itemId}>
                        <MenuItem value="">Select size...</MenuItem>
                        {getSizesForItem(line.itemId).map(s => <MenuItem key={s.uuid} value={s.uuid}>{s.sizeLabel}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" fullWidth size="small" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} inputProps={{ min: 1 }} />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" fullWidth size="small" value={line.mrp} onChange={e => updateLine(idx, 'mrp', e.target.value)} inputProps={{ step: '0.01', min: 0 }} required />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" fullWidth size="small" value={line.studentDiscountPct} onChange={e => updateLine(idx, 'studentDiscountPct', e.target.value)} inputProps={{ step: '0.01', min: 0, max: 100 }} />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" fullWidth size="small" value={line.bulkDiscountPct} onChange={e => updateLine(idx, 'bulkDiscountPct', e.target.value)} inputProps={{ step: '0.01', min: 0, max: 100 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#8f9bb3' }}>
                      {lineTotals[idx].costPerUnit != null ? `₹${lineTotals[idx].costPerUnit}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#8f9bb3' }}>
                      {lineTotals[idx].lineTotal != null ? `₹${lineTotals[idx].lineTotal}` : '—'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 1, borderTop: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography color="text.secondary">Total Amount</Typography>
                  <Typography fontWeight={700} variant="h6">₹{totalAmount.toFixed(2)}</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Bill / Invoice (optional)</Typography>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleBillSelect} />
            {bill ? (
              <Chip icon={<AttachIcon />} label={bill.fileName} onDelete={() => setBill(null)} />
            ) : (
              <Button size="small" startIcon={<AttachIcon />} variant="outlined" onClick={() => fileInputRef.current?.click()}>
                Attach Bill
              </Button>
            )}
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save Purchase'}</Button>
          <Button variant="outlined" onClick={() => navigate('/uniform/purchases')}>Cancel</Button>
        </Box>
      </form>
    </Box>
  );
}
