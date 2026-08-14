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
import { labService } from '../../../services/labService';
import { todayIso } from '../../../utils/date';

export default function LabPurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    labId: '',
    itemId: '',
    purchaseDate: todayIso(),
    quantity: '',
    costPerUnit: '',
    supplier: '',
    invoiceNumber: '',
    batchNo: '',
    expiryDate: '',
    warrantyEndDate: '',
    remarks: '',
    status: 'active',
  });
  const [labs, setLabs] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const [labsData, itemsData] = await loadData();
      if (isEdit) {
        loadPurchase(labsData, itemsData);
      }
    };
    init();
  }, [id]);

  const loadData = async () => {
    try {
      const [labsData, itemsData] = await Promise.all([
        labService.getLabs(),
        labService.getItems(),
      ]);
      setLabs(labsData);
      setItems(itemsData);
      setFilteredItems(itemsData);
      return [labsData, itemsData];
    } catch (err) {
      console.error('Failed to load data:', err);
      return [[], []];
    }
  };

  const loadPurchase = async (labsData, itemsData) => {
    setLoading(true);
    try {
      const purchase = await labService.getPurchaseById(id);
      setFormData({
        labId: purchase.labId || '',
        itemId: purchase.itemId || '',
        purchaseDate: purchase.purchaseDate?.split('T')[0] || '',
        quantity: purchase.quantity || '',
        costPerUnit: purchase.costPerUnit ?? '',
        supplier: purchase.supplier || '',
        invoiceNumber: purchase.invoiceNumber || '',
        batchNo: purchase.batchNo || '',
        expiryDate: purchase.expiryDate?.split('T')[0] || '',
        warrantyEndDate: purchase.warrantyEndDate?.split('T')[0] || '',
        remarks: purchase.remarks || '',
        status: purchase.status || 'active',
      });
      const lab = labsData.find((l) => l.uuid === purchase.labId);
      if (lab) {
        setSelectedLab(lab);
        setFilteredItems(itemsData.filter((i) => i.labId === lab.uuid));
      }
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

  const handleLabChange = (event, newValue) => {
    setSelectedLab(newValue);
    setSelectedItem(null);
    setFormData((prev) => ({ ...prev, labId: newValue?.uuid || '', itemId: '' }));
    if (newValue) {
      setFilteredItems(items.filter((i) => i.labId === newValue.uuid));
    } else {
      setFilteredItems(items);
    }
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
      };

      if (isEdit) {
        await labService.updatePurchase(id, payload);
      } else {
        await labService.createPurchase(payload);
      }
      navigate('/lab/purchases');
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
                  options={labs}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedLab}
                  onChange={handleLabChange}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField {...params} label="Lab" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={filteredItems}
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
                  label="Cost per Unit"
                  name="costPerUnit"
                  type="number"
                  value={formData.costPerUnit}
                  onChange={handleChange}
                  inputProps={{ step: '0.01', min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Cost"
                  value={
                    formData.quantity && formData.costPerUnit
                      ? (parseFloat(formData.quantity) * parseFloat(formData.costPerUnit)).toFixed(2)
                      : ''
                  }
                  InputProps={{ readOnly: true }}
                  helperText="Computed: Quantity x Cost per Unit"
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
                  label="Warranty End Date"
                  name="warrantyEndDate"
                  type="date"
                  value={formData.warrantyEndDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  multiline
                  rows={3}
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
                    onClick={() => navigate('/lab/purchases')}
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
