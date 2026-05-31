import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { medicalService } from '../../../services/medicalService';

const ALLOWED_BILL_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const emptyLineItem = () => ({
  _key: Math.random(),
  selectedItem: null,
  itemId: '',
  quantity: '',
  costPerUnit: '',
  expiryDate: '',
  batchNo: '',
});

// Edit mode: still uses the old single-purchase API for backward compat
function EditPurchaseForm({ id }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: '',
    batchNo: '',
    expiryDate: '',
    supplier: '',
    invoiceNumber: '',
    costPerUnit: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [itemName, setItemName] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const purchase = await medicalService.getPurchaseById(id);
        setItemName(purchase.itemName || '');
        setFormData({
          purchaseDate: purchase.purchaseDate?.split('T')[0] || '',
          quantity: purchase.quantity || '',
          batchNo: purchase.batchNo || '',
          expiryDate: purchase.expiryDate?.split('T')[0] || '',
          supplier: purchase.supplier || '',
          invoiceNumber: purchase.invoiceNumber || '',
          costPerUnit: purchase.costPerUnit || '',
          status: purchase.status || 'active',
        });
      } catch {
        setError('Failed to load purchase');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await medicalService.updatePurchase(id, {
        ...formData,
        quantity: parseInt(formData.quantity, 10) || 0,
        costPerUnit: parseFloat(formData.costPerUnit) || null,
      });
      navigate('/medical/purchases');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save purchase');
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
        Edit Purchase
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
                <TextField fullWidth label="Item" value={itemName} disabled />
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
                  helperText="Computed: Quantity × Cost per Unit"
                />
              </Grid>
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
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/medical/purchases')} disabled={saving}>
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

// Add mode: unified bulk form (always calls /purchases/bulk)
function AddPurchaseForm() {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    supplier: '',
    invoiceNumber: '',
    batchNo: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [items, setItems] = useState([]);
  const [billFile, setBillFile] = useState(null); // { fileName, mimeType, base64Data, size }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    medicalService
      .getItems()
      .then(setItems)
      .catch(() => {});
  }, []);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLineItemChange = (key, field, value) => {
    setLineItems((prev) =>
      prev.map((item) => (item._key === key ? { ...item, [field]: value } : item))
    );
    setError('');
  };

  const handleItemSelect = (key, newValue) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item._key === key
          ? { ...item, selectedItem: newValue, itemId: newValue?.uuid || '' }
          : item
      )
    );
    setError('');
  };

  const addLineItem = () => setLineItems((prev) => [...prev, emptyLineItem()]);

  const removeLineItem = (key) =>
    setLineItems((prev) => (prev.length > 1 ? prev.filter((i) => i._key !== key) : prev));

  const handleBillSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_BILL_TYPES.includes(file.type)) {
      setError('Bill must be a PDF, JPEG, or PNG file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target.result.split(',')[1];
      setBillFile({ fileName: file.name, mimeType: file.type, base64Data, size: file.size });
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const totalCost = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cpu = parseFloat(item.costPerUnit) || 0;
    return sum + qty * cpu;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      if (!li.itemId) {
        setError(`Row ${i + 1}: item is required`);
        return;
      }
      if (!li.quantity || parseInt(li.quantity, 10) <= 0) {
        setError(`Row ${i + 1}: quantity must be greater than 0`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        purchaseDate: header.purchaseDate,
        supplier: header.supplier || undefined,
        invoiceNumber: header.invoiceNumber || undefined,
        batchNo: header.batchNo || undefined,
        notes: header.notes || undefined,
        items: lineItems.map((li) => ({
          itemId: li.itemId,
          quantity: parseInt(li.quantity, 10),
          costPerUnit: parseFloat(li.costPerUnit) || undefined,
          expiryDate: li.expiryDate || undefined,
          batchNo: li.batchNo || undefined,
        })),
      };
      if (billFile) {
        payload.bill = {
          fileName: billFile.fileName,
          mimeType: billFile.mimeType,
          base64Data: billFile.base64Data,
        };
      }
      await medicalService.createBulkPurchase(payload);
      navigate('/medical/purchases');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Add Purchase
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Invoice Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Invoice Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Purchase Date"
                  name="purchaseDate"
                  type="date"
                  value={header.purchaseDate}
                  onChange={handleHeaderChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Supplier"
                  name="supplier"
                  value={header.supplier}
                  onChange={handleHeaderChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  name="invoiceNumber"
                  value={header.invoiceNumber}
                  onChange={handleHeaderChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Batch / Lot No. (default for all items)"
                  name="batchNo"
                  value={header.batchNo}
                  onChange={handleHeaderChange}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={header.notes}
                  onChange={handleHeaderChange}
                  multiline
                  rows={1}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Items</Typography>
              <Button startIcon={<AddIcon />} onClick={addLineItem} size="small">
                Add Item
              </Button>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 220 }}>Item *</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Quantity *</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Cost / Unit</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Expiry Date</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Batch No. (override)</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Total</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((li) => (
                    <TableRow key={li._key}>
                      <TableCell>
                        <Autocomplete
                          options={items}
                          getOptionLabel={(o) => o.name || ''}
                          value={li.selectedItem}
                          onChange={(_, newValue) => handleItemSelect(li._key, newValue)}
                          size="small"
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select item" size="small" />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={li.quantity}
                          onChange={(e) => handleLineItemChange(li._key, 'quantity', e.target.value)}
                          inputProps={{ min: 1 }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={li.costPerUnit}
                          onChange={(e) => handleLineItemChange(li._key, 'costPerUnit', e.target.value)}
                          inputProps={{ step: '0.01', min: 0 }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={li.expiryDate}
                          onChange={(e) => handleLineItemChange(li._key, 'expiryDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 140 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={li.batchNo}
                          onChange={(e) => handleLineItemChange(li._key, 'batchNo', e.target.value)}
                          placeholder={header.batchNo || '—'}
                          sx={{ width: 130 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {li.quantity && li.costPerUnit
                          ? (parseFloat(li.quantity) * parseFloat(li.costPerUnit)).toFixed(2)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeLineItem(li._key)}
                          disabled={lineItems.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box sx={{ textAlign: 'right', mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body1">
                Total Bill: <strong>{totalCost > 0 ? totalCost.toFixed(2) : '—'}</strong>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Bill Upload */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Bill / Invoice (optional)
            </Typography>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              ref={fileInputRef}
              onChange={handleBillSelect}
              style={{ display: 'none' }}
            />
            {billFile ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<AttachFileIcon />}
                  label={`${billFile.fileName} (${(billFile.size / 1024).toFixed(1)} KB)`}
                  onDelete={() => setBillFile(null)}
                  color="primary"
                  variant="outlined"
                />
                <Button size="small" onClick={() => fileInputRef.current?.click()}>
                  Replace
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<AttachFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                size="small"
              >
                Attach Bill
              </Button>
            )}
            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
              PDF, JPEG, or PNG
            </Typography>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Create Purchase'}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/medical/purchases')} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default function PurchaseForm() {
  const { id } = useParams();
  return id ? <EditPurchaseForm id={id} /> : <AddPurchaseForm />;
}
