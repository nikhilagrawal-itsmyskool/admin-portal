import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { medicalService } from '../../../services/medicalService';

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    itemId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: '',
    batchNo: '',
    expiryDate: '',
    supplier: '',
    invoiceNumber: '',
    costPerUnit: '',
    status: 'active',
  });
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const itemsData = await loadItems();
      if (isEdit) {
        loadPurchase(itemsData);
      }
    };
    init();
  }, [id]);

  const loadItems = async () => {
    try {
      const data = await medicalService.getItems();
      setItems(data);
      return data;
    } catch (err) {
      console.error('Failed to load items:', err);
      return [];
    }
  };

  const loadPurchase = async (itemsData) => {
    setLoading(true);
    try {
      const purchase = await medicalService.getPurchaseById(id);
      setFormData({
        itemId: purchase.itemId || '',
        purchaseDate: purchase.purchaseDate?.split('T')[0] || '',
        quantity: purchase.quantity || '',
        batchNo: purchase.batchNo || '',
        expiryDate: purchase.expiryDate?.split('T')[0] || '',
        supplier: purchase.supplier || '',
        invoiceNumber: purchase.invoiceNumber || '',
        costPerUnit: purchase.costPerUnit || '',
        status: purchase.status || 'active',
      });
      const item = itemsData.find((i) => i.uuid === purchase.itemId);
      if (item) setSelectedItem(item);
    } catch (err) {
      setError('Failed to load purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleItemChange = (event, newValue) => {
    setSelectedItem(newValue);
    setFormData((prev) => ({ ...prev, itemId: newValue?.uuid || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10) || 0,
        costPerUnit: parseFloat(formData.costPerUnit) || null,
        status: formData.status,
      };

      if (isEdit) {
        await medicalService.updatePurchase(id, payload);
      } else {
        await medicalService.createPurchase(payload);
      }
      navigate('/medical/purchases');
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save purchase';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isEdit ? 'Edit Purchase' : 'Add New Purchase'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={items}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedItem}
                  onChange={handleItemChange}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField {...params} label="Item" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Purchase Date"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Batch Number"
                  name="batchNo"
                  value={formData.batchNo}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  name="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cost per Unit"
                  name="costPerUnit"
                  type="number"
                  value={formData.costPerUnit}
                  onChange={handleChange}
                  inputProps={{ step: '0.01', min: 0 }}
                />
              </Grid>
              {isEdit && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="deleted">Deleted</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Purchase'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/medical/purchases')}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
