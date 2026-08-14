import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Alert, Button, Chip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon, Undo as ReturnIcon, Payment as PaymentIcon,
  Visibility as VisibilityIcon, AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import uniformService from '../../../services/uniformService';
import { fmtDate, fmtDateLong, todayIso } from '../../../utils/date';

const PAYMENT_COLORS = { paid: 'success', partial: 'warning', due: 'error' };
const PAYMENT_LABELS = { paid: 'Fully Paid', partial: 'Partially Paid', due: 'Due' };
const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

function PaymentDialog({ open, onClose, onSave, sale }) {
  const [form, setForm] = useState({ amount: '', paymentDate: todayIso(), notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setForm({ amount: '', paymentDate: todayIso(), notes: '' }); setError(''); }
  }, [open]);

  const balance = sale ? (sale.totalAmount || 0) - (sale.amountPaid || 0) : 0;

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setError('Amount must be greater than 0'); return; }
    if (amount > balance) { setError(`Amount cannot exceed balance due (${formatCurrency(balance)})`); return; }
    setSaving(true);
    try {
      await uniformService.addPayment(sale.uuid, { amount, paymentDate: form.paymentDate, notes: form.notes || undefined });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {sale && (
          <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 2 }}>
            Balance due: <strong>{formatCurrency(balance)}</strong>
          </Typography>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth type="number" label="Amount (₹)" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} size="small"
              inputProps={{ min: 0.01, max: balance, step: 0.01 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Payment Date" type="date" value={form.paymentDate}
              onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} size="small"
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Notes (optional)" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ReturnDialog({ open, onClose, onSave, saleId, saleItem }) {
  const [form, setForm] = useState({ returnDate: todayIso(), quantity: 1, reason: '', evidence: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) { setForm({ returnDate: todayIso(), quantity: 1, reason: '', evidence: null }); setError(''); }
  }, [open]);

  const available = saleItem ? saleItem.quantity - (saleItem.returnedQuantity || 0) : 0;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setForm(p => ({ ...p, evidence: null })); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target.result.split(',')[1];
      setForm(p => ({ ...p, evidence: { fileName: file.name, mimeType: file.type, base64Data } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.reason.trim()) { setError('Reason is required'); return; }
    if (!form.quantity || form.quantity < 1) { setError('Quantity must be at least 1'); return; }
    setSaving(true);
    try {
      await uniformService.createReturn(saleId, {
        saleItemId: saleItem.uuid,
        returnDate: form.returnDate,
        quantity: parseInt(form.quantity),
        reason: form.reason.trim(),
        evidence: form.evidence || undefined,
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to process return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Process Return</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {saleItem && (
          <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 2 }}>
            {saleItem.itemName} — {saleItem.sizeLabel} | Available to return: {available}
          </Typography>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Return Date" type="date" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth type="number" label="Quantity to Return" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} size="small" inputProps={{ min: 1, max: available }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Reason *" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} size="small" required />
          </Grid>
          <Grid item xs={12}>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
            <Button size="small" variant="outlined" startIcon={<AttachFileIcon />} onClick={() => fileInputRef.current.click()}>
              {form.evidence ? form.evidence.fileName : 'Attach Evidence (optional)'}
            </Button>
            {form.evidence && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                {form.evidence.fileName}
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Processing...' : 'Return'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function EvidenceViewDialog({ open, onClose, saleId, returnItem }) {
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (open && returnItem?.uuid) {
      setLoading(true);
      setEvidence(null);
      setFetchError('');
      uniformService.getReturnEvidence(saleId, returnItem.uuid)
        .then(data => setEvidence(data))
        .catch(() => setFetchError('Failed to load evidence'))
        .finally(() => setLoading(false));
    }
  }, [open, returnItem, saleId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Return Evidence — {returnItem?.itemName} ({returnItem?.sizeLabel})</DialogTitle>
      <DialogContent>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
        {fetchError && <Alert severity="error">{fetchError}</Alert>}
        {evidence && !loading && (
          evidence.mimeType?.startsWith('image/') ? (
            <Box sx={{ textAlign: 'center' }}>
              <img src={`data:${evidence.mimeType};base64,${evidence.data}`} alt="Evidence" style={{ maxWidth: '100%' }} />
            </Box>
          ) : evidence.mimeType === 'application/pdf' ? (
            <iframe src={`data:application/pdf;base64,${evidence.data}`} width="100%" height="560px" title="Evidence PDF" style={{ border: 'none' }} />
          ) : (
            <Alert severity="info">Preview not supported — <a href={`data:${evidence.mimeType};base64,${evidence.data}`} download={evidence.fileName}>Download file</a></Alert>
          )
        )}
      </DialogContent>
      <DialogActions>
        {evidence && (
          <Button component="a" href={`data:${evidence.mimeType};base64,${evidence.data}`} download={evidence.fileName}>Download</Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function handlePrintReceipt(sale, schoolCode) {
  const totalReturnsCredit = (sale.returns || []).reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const totalPaid = (sale.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const netAmount = sale.totalAmount || 0;
  const balanceDue = netAmount - (sale.amountPaid || 0);

  const returnsSection = (sale.returns || []).length > 0 ? `
<h3 style="margin: 20px 0 8px">Returns / Credits</h3>
<table>
  <thead><tr><th>Return Date</th><th>Item</th><th>Size</th><th>Qty</th><th align="right">Credit</th><th>Reason</th></tr></thead>
  <tbody>
    ${sale.returns.map(r => `<tr>
      <td>${fmtDateLong(r.returnDate)}</td>
      <td>${r.itemName}</td>
      <td>${r.sizeLabel}</td>
      <td>${r.quantity}</td>
      <td align="right" style="color:#c62828">- ₹${(r.refundAmount || 0).toFixed(2)}</td>
      <td>${r.reason || '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : '';

  const paymentsSection = (sale.payments || []).length > 0 ? `
<h3 style="margin: 20px 0 8px">Payment History</h3>
<table>
  <thead><tr><th>Date</th><th align="right">Amount</th><th>Notes</th></tr></thead>
  <tbody>
    ${sale.payments.map(p => `<tr>
      <td>${fmtDateLong(p.paymentDate)}</td>
      <td align="right">₹${(p.amount || 0).toFixed(2)}</td>
      <td>${p.notes || '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Uniform Sale Receipt</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 13px; }
  h2 { text-align: center; margin-bottom: 4px; }
  h3 { color: #444; font-size: 13px; }
  .center { text-align: center; }
  .section { margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { padding: 6px 8px; border: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .totals td { border: none; padding: 4px 8px; }
  .total-row td { font-weight: 700; border-top: 2px solid #333; }
  .footer { margin-top: 24px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; font-size: 11px; font-style: italic; color: #555; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .paid { background: #e6f4ea; color: #2e7d32; }
  .partial { background: #fff8e1; color: #f57f17; }
  .due { background: #fce8e6; color: #c62828; }
</style>
</head>
<body>
<h2>${schoolCode?.toUpperCase() || 'School'}</h2>
<p class="center">Uniform Sale Receipt</p>

<div class="section">
  <table class="totals">
    <tr><td width="50%"><strong>Receipt No:</strong> ${sale.uuid}</td><td><strong>Date:</strong> ${fmtDateLong(sale.saleDate)}</td></tr>
    <tr><td><strong>Student:</strong> ${sale.studentName || '—'}</td><td><strong>Admission No:</strong> ${sale.studentAdmissionNo || '—'}</td></tr>
    <tr><td><strong>Sale Type:</strong> ${sale.saleType === 'bulk' ? 'Bulk / Institutional' : 'Student'}</td><td><strong>Payment:</strong> <span class="badge ${sale.paymentStatus}">${PAYMENT_LABELS[sale.paymentStatus] || sale.paymentStatus}</span></td></tr>
  </table>
</div>

<h3 style="margin: 20px 0 8px">Items Sold</h3>
<table>
  <thead>
    <tr><th>Item</th><th>Size</th><th>Qty</th><th>MRP</th><th>Disc%</th><th>Unit Price</th><th>Total</th></tr>
  </thead>
  <tbody>
    ${sale.items.map(item => `<tr>
      <td>${item.itemName}</td>
      <td>${item.sizeLabel}</td>
      <td>${item.quantity}</td>
      <td>${item.mrp != null ? `₹${item.mrp}` : '—'}</td>
      <td>${item.discountPct != null ? `${item.discountPct}%` : '—'}</td>
      <td>${item.unitPrice != null ? `₹${item.unitPrice}` : '—'}</td>
      <td>${item.lineTotal != null ? `₹${item.lineTotal}` : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>

${returnsSection}
${paymentsSection}

<table class="totals" style="margin-top: 16px">
  <tr><td width="65%"></td><td><strong>Total MRP:</strong></td><td align="right">${formatCurrency(sale.totalMrp)}</td></tr>
  <tr><td></td><td><strong>Discount:</strong></td><td align="right">- ${formatCurrency(sale.totalDiscount)}</td></tr>
  ${totalReturnsCredit > 0 ? `<tr><td></td><td><strong style="color:#c62828">Returns Credit:</strong></td><td align="right" style="color:#c62828">- ₹${totalReturnsCredit.toFixed(2)}</td></tr>` : ''}
  <tr class="total-row"><td></td><td><strong>Net Amount:</strong></td><td align="right"><strong>${formatCurrency(netAmount)}</strong></td></tr>
  <tr><td></td><td><strong>Total Paid:</strong></td><td align="right">${formatCurrency(sale.amountPaid)}</td></tr>
  ${balanceDue > 0.005 ? `<tr><td></td><td><strong style="color:#c62828">Balance Due:</strong></td><td align="right" style="color:#c62828"><strong>₹${balanceDue.toFixed(2)}</strong></td></tr>` : ''}
</table>

${sale.notes ? `<div class="section"><em>Note: ${sale.notes}</em></div>` : ''}

<div class="footer">
  The school reserves the right to adjust any outstanding balance against the student's running account ledger.
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

export default function UniformSaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returnDialog, setReturnDialog] = useState({ open: false, saleItem: null });
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [evidenceDialog, setEvidenceDialog] = useState({ open: false, returnItem: null });

  const schoolCode = localStorage.getItem('schoolCode') || '';

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await uniformService.getSaleById(id);
      setSale(data);
    } catch {
      setError('Failed to load sale');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!sale) return <Alert severity="error">Sale not found</Alert>;

  const balanceDue = (sale.totalAmount || 0) - (sale.amountPaid || 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Sale Details</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => handlePrintReceipt(sale, schoolCode)}>
            Print Receipt
          </Button>
          <Button variant="outlined" onClick={() => navigate('/uniform/sales')}>Back to List</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Header info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}><Typography variant="caption" color="text.secondary">Student</Typography><Typography fontWeight={500}>{sale.studentName || '—'}</Typography></Grid>
            <Grid item xs={6} md={3}><Typography variant="caption" color="text.secondary">Admission No</Typography><Typography>{sale.studentAdmissionNo || '—'}</Typography></Grid>
            <Grid item xs={6} md={2}><Typography variant="caption" color="text.secondary">Date</Typography><Typography>{fmtDate(sale.saleDate)}</Typography></Grid>
            <Grid item xs={6} md={2}><Typography variant="caption" color="text.secondary">Type</Typography><Typography>{sale.saleType === 'bulk' ? 'Bulk' : 'Student'}</Typography></Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="caption" color="text.secondary">Payment</Typography>
              <Box><Chip label={PAYMENT_LABELS[sale.paymentStatus] || sale.paymentStatus} size="small" color={PAYMENT_COLORS[sale.paymentStatus] || 'default'} /></Box>
            </Grid>
            {sale.notes && <Grid item xs={12}><Typography variant="caption" color="text.secondary">Notes</Typography><Typography>{sale.notes}</Typography></Grid>}
          </Grid>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Items Sold</Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Disc%</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Unit Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Line Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Returned</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items.map(item => {
                const available = item.quantity - (item.returnedQuantity || 0);
                return (
                  <TableRow key={item.uuid}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.sizeLabel}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{item.mrp != null ? `₹${item.mrp}` : '—'}</TableCell>
                    <TableCell align="right">{item.discountPct != null ? `${item.discountPct}%` : '—'}</TableCell>
                    <TableCell align="right">{item.unitPrice != null ? `₹${item.unitPrice}` : '—'}</TableCell>
                    <TableCell align="right">{item.lineTotal != null ? `₹${item.lineTotal}` : '—'}</TableCell>
                    <TableCell align="right" sx={{ color: item.returnedQuantity > 0 ? 'warning.main' : 'text.secondary' }}>
                      {item.returnedQuantity > 0 ? item.returnedQuantity : '—'}
                    </TableCell>
                    <TableCell>
                      {available > 0 && (
                        <Button size="small" startIcon={<ReturnIcon />} onClick={() => setReturnDialog({ open: true, saleItem: item })}>
                          Return
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment history */}
      {(sale.payments || []).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Payment History</Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.payments.map(p => (
                  <TableRow key={p.uuid}>
                    <TableCell>{fmtDate(p.paymentDate)}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>{formatCurrency(p.amount)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{p.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6">Payment Summary</Typography>
                {sale.paymentStatus !== 'paid' && (
                  <Button size="small" variant="outlined" startIcon={<PaymentIcon />} onClick={() => setPaymentDialog(true)}>
                    Record Payment
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography color="text.secondary">Total MRP</Typography><Typography>{formatCurrency(sale.totalMrp)}</Typography></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography color="text.secondary">Total Discount</Typography><Typography color="success.main">- {formatCurrency(sale.totalDiscount)}</Typography></Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography fontWeight={600}>Net Amount</Typography><Typography fontWeight={600}>{formatCurrency(sale.totalAmount)}</Typography></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography color="text.secondary">Amount Paid</Typography><Typography color="success.main">{formatCurrency(sale.amountPaid)}</Typography></Box>
              {balanceDue > 0.005 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="error.main" fontWeight={600}>Balance Due</Typography>
                  <Typography color="error.main" fontWeight={600}>₹{balanceDue.toFixed(2)}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Returns history */}
      {(sale.returns || []).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Returns</Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Credit</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.returns.map(r => (
                  <TableRow key={r.uuid}>
                    <TableCell>{fmtDate(r.returnDate)}</TableCell>
                    <TableCell>{r.itemName}</TableCell>
                    <TableCell>{r.sizeLabel}</TableCell>
                    <TableCell align="right">{r.quantity}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>- {formatCurrency(r.refundAmount)}</TableCell>
                    <TableCell>{r.reason || '—'}</TableCell>
                    <TableCell>
                      {r.fileId && (
                        <Tooltip title="View Evidence">
                          <IconButton size="small" onClick={() => setEvidenceDialog({ open: true, returnItem: r })}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PaymentDialog
        open={paymentDialog}
        onClose={() => setPaymentDialog(false)}
        onSave={() => { setPaymentDialog(false); load(); }}
        sale={sale}
      />

      <ReturnDialog
        open={returnDialog.open}
        onClose={() => setReturnDialog({ open: false, saleItem: null })}
        onSave={() => { setReturnDialog({ open: false, saleItem: null }); load(); }}
        saleId={id}
        saleItem={returnDialog.saleItem}
      />

      <EvidenceViewDialog
        open={evidenceDialog.open}
        onClose={() => setEvidenceDialog({ open: false, returnItem: null })}
        saleId={id}
        returnItem={evidenceDialog.returnItem}
      />
    </Box>
  );
}
