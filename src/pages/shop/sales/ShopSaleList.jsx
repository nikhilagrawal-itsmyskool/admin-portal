import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Alert, CircularProgress, Chip,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const PAYMENT_COLORS = { paid: 'success', partial: 'warning', due: 'error' };
const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

export default function ShopSaleList() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    shopService.getSales()
      .then(setSales)
      .catch(() => setError('Failed to load sales'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Sales</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/shop/sales/new')}>New Sale</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : sales.length === 0 ? (
        <Card><Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No sales yet.</Typography></Box></Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Session</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Paid</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.uuid} hover>
                  <TableCell>{s.saleDate}</TableCell>
                  <TableCell>
                    {s.studentName || s.studentId}
                    {s.studentAdmissionNo && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>#{s.studentAdmissionNo}</Typography>}
                  </TableCell>
                  <TableCell>{s.academicSession || '—'}</TableCell>
                  <TableCell align="right">{formatCurrency(s.totalAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(s.amountPaid)}</TableCell>
                  <TableCell align="center">
                    <Chip label={s.paymentStatus} color={PAYMENT_COLORS[s.paymentStatus] || 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => navigate(`/shop/sales/${s.uuid}`)}><ViewIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
}
