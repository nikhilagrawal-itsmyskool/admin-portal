import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Alert, Button, Chip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Divider,
} from '@mui/material';
import { ArrowBack as BackIcon, Print as PrintIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';
import { fmtDate, fmtDateLong } from '../../../utils/date';

const PAYMENT_COLORS = { paid: 'success', partial: 'warning', due: 'error' };
const PAYMENT_LABELS = { paid: 'Fully Paid', partial: 'Partially Paid', due: 'Due' };
const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

function handlePrintReceipt(sale, schoolCode) {
  const balanceDue = (sale.totalAmount || 0) - (sale.amountPaid || 0);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Shop Sale Receipt</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 13px; }
  h2 { text-align: center; margin-bottom: 4px; }
  .center { text-align: center; }
  .section { margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
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
<p class="center">Shop Sale Receipt</p>

<div class="section">
  <table class="totals">
    <tr><td width="50%"><strong>Receipt No:</strong> ${sale.uuid}</td><td><strong>Date:</strong> ${fmtDateLong(sale.saleDate)}</td></tr>
    <tr><td><strong>Student:</strong> ${sale.studentName || '—'}</td><td><strong>Admission No:</strong> ${sale.studentAdmissionNo || '—'}</td></tr>
    ${sale.academicSession ? `<tr><td><strong>Session:</strong> ${sale.academicSession}</td><td><strong>Payment:</strong> <span class="badge ${sale.paymentStatus}">${PAYMENT_LABELS[sale.paymentStatus] || sale.paymentStatus}</span></td></tr>` : `<tr><td></td><td><strong>Payment:</strong> <span class="badge ${sale.paymentStatus}">${PAYMENT_LABELS[sale.paymentStatus] || sale.paymentStatus}</span></td></tr>`}
  </table>
</div>

<table>
  <thead>
    <tr><th>Item</th><th>Qty</th><th>MRP</th><th>Disc%</th><th>Unit Price</th><th>Total</th></tr>
  </thead>
  <tbody>
    ${(sale.items || []).map(item => `<tr>
      <td>${item.itemName}</td>
      <td>${item.quantity}</td>
      <td>${item.mrp != null ? `₹${item.mrp}` : '—'}</td>
      <td>${item.discountPct != null ? `${item.discountPct}%` : '—'}</td>
      <td>${item.unitPrice != null ? `₹${item.unitPrice}` : '—'}</td>
      <td>${item.lineTotal != null ? `₹${item.lineTotal}` : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>

<table class="totals">
  <tr><td width="70%"></td><td><strong>Total MRP:</strong></td><td align="right">${formatCurrency(sale.totalMrp)}</td></tr>
  <tr><td></td><td><strong>Discount:</strong></td><td align="right">- ${formatCurrency(sale.totalDiscount)}</td></tr>
  <tr class="total-row"><td></td><td><strong>Total Amount:</strong></td><td align="right"><strong>${formatCurrency(sale.totalAmount)}</strong></td></tr>
  <tr><td></td><td><strong>Amount Paid:</strong></td><td align="right">${formatCurrency(sale.amountPaid)}</td></tr>
  ${balanceDue > 0 ? `<tr><td></td><td><strong style="color:#c62828">Balance Due:</strong></td><td align="right" style="color:#c62828"><strong>₹${balanceDue.toFixed(2)}</strong></td></tr>` : ''}
</table>

${sale.notes ? `<div class="section"><em>Note: ${sale.notes}</em></div>` : ''}

<div class="footer">
  Thank you for your purchase. Please retain this receipt for your records.
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

export default function ShopSaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const schoolCode = localStorage.getItem('schoolCode') || '';

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await shopService.getSaleById(id);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/shop/sales')}>Sales</Button>
          <Typography variant="h4">Sale Details</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => handlePrintReceipt(sale, schoolCode)}>
          Print Receipt
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Student</Typography>
              <Typography fontWeight={500}>{sale.studentName || '—'}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Admission No</Typography>
              <Typography>{sale.studentAdmissionNo || '—'}</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="caption" color="text.secondary">Date</Typography>
              <Typography>{fmtDate(sale.saleDate)}</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="caption" color="text.secondary">Session</Typography>
              <Typography>{sale.academicSession || '—'}</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="caption" color="text.secondary">Payment</Typography>
              <Box><Chip label={PAYMENT_LABELS[sale.paymentStatus] || sale.paymentStatus} size="small" color={PAYMENT_COLORS[sale.paymentStatus] || 'default'} /></Box>
            </Grid>
            {sale.notes && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Notes</Typography>
                <Typography>{sale.notes}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Items Sold</Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Disc%</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Unit Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Line Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(sale.items || []).map(item => (
                <TableRow key={item.uuid}>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{item.mrp != null ? formatCurrency(item.mrp) : '—'}</TableCell>
                  <TableCell align="right">{item.discountPct != null ? `${item.discountPct}%` : '—'}</TableCell>
                  <TableCell align="right">{item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{item.lineTotal != null ? formatCurrency(item.lineTotal) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Payment Summary</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography color="text.secondary">Total MRP</Typography>
                <Typography>{formatCurrency(sale.totalMrp)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography color="text.secondary">Total Discount</Typography>
                <Typography color="success.main">- {formatCurrency(sale.totalDiscount)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography fontWeight={600}>Total Amount</Typography>
                <Typography fontWeight={600}>{formatCurrency(sale.totalAmount)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography color="text.secondary">Amount Paid</Typography>
                <Typography color="success.main">{formatCurrency(sale.amountPaid)}</Typography>
              </Box>
              {balanceDue > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="error.main" fontWeight={600}>Balance Due</Typography>
                  <Typography color="error.main" fontWeight={600}>₹{balanceDue.toFixed(2)}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
