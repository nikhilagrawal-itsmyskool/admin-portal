import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Alert, CircularProgress, Chip,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon, Delete as DeleteIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

export default function ShopPurchaseList() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await shopService.getPurchases();
      setPurchases(data);
    } catch {
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await shopService.deletePurchase(deleteTarget.uuid);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete purchase');
      setDeleteTarget(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Purchase Batches</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/shop/purchases/new')}>
          New Purchase
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : purchases.length === 0 ? (
        <Card>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No purchases yet. Record your first stock purchase.</Typography>
          </Box>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Session</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Invoice No.</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Bill</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map(p => (
                <TableRow key={p.uuid} hover>
                  <TableCell>{p.purchaseDate}</TableCell>
                  <TableCell>{p.academicSession || <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                  <TableCell>{p.supplier || '—'}</TableCell>
                  <TableCell>{p.invoiceNumber || '—'}</TableCell>
                  <TableCell align="right">{formatCurrency(p.totalAmount)}</TableCell>
                  <TableCell align="right">
                    {p.fileId ? <Chip label="Bill" size="small" color="success" /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => navigate(`/shop/purchases/${p.uuid}`)}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(p)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {deleteTarget && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <Card sx={{ p: 3, maxWidth: 400 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Delete Purchase?</Typography>
            <Typography sx={{ mb: 2 }}>This will reverse all stock changes from this batch.</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
}
