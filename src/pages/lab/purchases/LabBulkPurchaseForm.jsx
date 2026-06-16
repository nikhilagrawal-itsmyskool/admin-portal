import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Grid,
  Alert,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { labService } from '../../../services/labService';

const emptyItem = () => ({
  _key: Math.random(),
  uuid: undefined,
  lab: null,
  item: null,
  itemOptions: [],
  quantity: '',
  costPerUnit: '',
  batchNo: '',
  expiryDate: '',
  warrantyEndDate: '',
  remarks: '',
});

const toDateInput = (v) => (v ? new Date(v).toISOString().split('T')[0] : '');

export default function LabBulkPurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [labs, setLabs] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Header fields
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [defaultBatchNo, setDefaultBatchNo] = useState('');
  const [defaultExpiryDate, setDefaultExpiryDate] = useState('');
  const [defaultWarrantyEndDate, setDefaultWarrantyEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [hasExistingBill, setHasExistingBill] = useState(false);
  const [removeExistingBill, setRemoveExistingBill] = useState(false);
  const billInputRef = useRef(null);

  // Line items
  const [lineItems, setLineItems] = useState([emptyItem()]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [labsData, itemsData] = await Promise.all([labService.getLabs(), labService.getItems()]);
        if (cancelled) return;
        setLabs(labsData);
        setAllItems(itemsData);

        if (isEdit) {
          const batch = await labService.getPurchaseBatchById(id);
          if (cancelled) return;
          setPurchaseDate(toDateInput(batch.purchaseDate) || new Date().toISOString().split('T')[0]);
          setSupplier(batch.supplier || '');
          setInvoiceNumber(batch.invoiceNumber || '');
          setDefaultBatchNo(batch.batchNo || '');
          setDefaultExpiryDate(toDateInput(batch.expiryDate));
          setDefaultWarrantyEndDate(toDateInput(batch.warrantyEndDate));
          setNotes(batch.notes || '');
          setHasExistingBill(!!batch.fileId);

          const rows = (batch.items || []).map((it) => {
            const lab = labsData.find((l) => l.uuid === it.labId) || null;
            const item = itemsData.find((i) => i.uuid === it.itemId) || null;
            return {
              _key: Math.random(),
              uuid: it.uuid,
              lab,
              item,
              itemOptions: lab ? itemsData.filter((i) => i.labId === lab.uuid) : [],
              quantity: it.quantity != null ? String(it.quantity) : '',
              costPerUnit: it.costPerUnit != null ? String(it.costPerUnit) : '',
              batchNo: it.batchNo || '',
              expiryDate: toDateInput(it.expiryDate),
              warrantyEndDate: toDateInput(it.warrantyEndDate),
              remarks: it.remarks || '',
            };
          });
          setLineItems(rows.length ? rows : [emptyItem()]);
        }
      } catch {
        if (!cancelled) setError(isEdit ? 'Failed to load purchase' : 'Failed to load labs/items');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const updateItem = (index, field, value) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'lab') {
        next[index].item = null;
        next[index].itemOptions = value ? allItems.filter((i) => i.labId === value.uuid) : [];
      }
      return next;
    });
  };

  const handleBillFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      setBillFile({ fileName: file.name, mimeType: file.type, base64Data, size: file.size });
      setRemoveExistingBill(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadExistingBill = async () => {
    try {
      const file = await labService.getLabBill(id);
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName || 'bill';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download bill');
    }
  };

  const addItem = () => setLineItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');

    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      if (!li.lab) { setError(`Row ${i + 1}: Lab is required`); return; }
      if (!li.item) { setError(`Row ${i + 1}: Item is required`); return; }
      if (!li.quantity || parseInt(li.quantity) <= 0) { setError(`Row ${i + 1}: Quantity must be greater than 0`); return; }
    }

    const payload = {
      purchaseDate,
      supplier: supplier || undefined,
      invoiceNumber: invoiceNumber || undefined,
      batchNo: defaultBatchNo || undefined,
      expiryDate: defaultExpiryDate || undefined,
      warrantyEndDate: defaultWarrantyEndDate || undefined,
      notes: notes || undefined,
      items: lineItems.map((li) => ({
        uuid: li.uuid || undefined,
        itemId: li.item.uuid,
        labId: li.lab.uuid,
        quantity: parseInt(li.quantity),
        costPerUnit: li.costPerUnit ? parseFloat(li.costPerUnit) : undefined,
        batchNo: li.batchNo || undefined,
        expiryDate: li.expiryDate || undefined,
        warrantyEndDate: li.warrantyEndDate || undefined,
        remarks: li.remarks || undefined,
      })),
    };

    const billPayload = billFile
      ? { fileName: billFile.fileName, mimeType: billFile.mimeType, base64Data: billFile.base64Data }
      : null;

    setSubmitting(true);
    try {
      if (isEdit) {
        const result = await labService.updatePurchaseBatch(id, payload);
        const returnedId = result?.uuid || id;
        if (billPayload) {
          await labService.uploadLabBill(returnedId, billPayload);
        } else if (removeExistingBill && hasExistingBill) {
          await labService.deleteLabBill(returnedId);
        }
      } else {
        await labService.createBulkPurchase({ ...payload, bill: billPayload || undefined });
      }
      navigate('/lab/purchases');
    } catch (err) {
      setError(err?.response?.data?.error?.message || (isEdit ? 'Failed to save purchase' : 'Failed to create bulk purchase'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/lab/purchases')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4">{isEdit ? 'Edit Purchase' : 'Bulk Purchase'}</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Invoice Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Purchase Date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Invoice Number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Default Batch No." value={defaultBatchNo} onChange={(e) => setDefaultBatchNo(e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Default Expiry Date"
                type="date"
                value={defaultExpiryDate}
                onChange={(e) => setDefaultExpiryDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText="Applied to all items unless overridden"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Default Warranty End Date"
                type="date"
                value={defaultWarrantyEndDate}
                onChange={(e) => setDefaultWarrantyEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText="Applied to all items unless overridden"
              />
            </Grid>
            <Grid item xs={12} sm={12} md={6}>
              <TextField fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} size="small" multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <input
                ref={billInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleBillFile}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachFileIcon />}
                  onClick={() => billInputRef.current?.click()}
                >
                  {hasExistingBill && !removeExistingBill ? 'Replace Bill' : 'Attach Bill'}
                </Button>
                {billFile && (
                  <Chip
                    label={`${billFile.fileName} (${(billFile.size / 1024).toFixed(1)} KB)`}
                    size="small"
                    onDelete={() => setBillFile(null)}
                  />
                )}
                {isEdit && hasExistingBill && !billFile && !removeExistingBill && (
                  <Chip
                    label="Current bill"
                    size="small"
                    variant="outlined"
                    icon={<DownloadIcon />}
                    onClick={handleDownloadExistingBill}
                    onDelete={() => setRemoveExistingBill(true)}
                  />
                )}
                {isEdit && removeExistingBill && !billFile && (
                  <Chip
                    label="Bill will be removed on save"
                    size="small"
                    color="warning"
                    onDelete={() => setRemoveExistingBill(false)}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Items</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, whiteSpace: 'nowrap' } }}>
                  <TableCell sx={{ minWidth: 160 }}>Lab *</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Item *</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Qty *</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Cost/Unit</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Batch No. Override</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Expiry Override</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Warranty Override</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>Remarks</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((li, index) => (
                  <TableRow key={li._key}>
                    <TableCell>
                      <Autocomplete
                        options={labs}
                        getOptionLabel={(o) => o.name}
                        value={li.lab}
                        onChange={(_, val) => updateItem(index, 'lab', val)}
                        size="small"
                        renderInput={(params) => <TextField {...params} placeholder="Select lab" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        options={li.itemOptions}
                        getOptionLabel={(o) => o.name}
                        value={li.item}
                        onChange={(_, val) => updateItem(index, 'item', val)}
                        disabled={!li.lab}
                        size="small"
                        renderInput={(params) => <TextField {...params} placeholder={li.lab ? 'Select item' : 'Select lab first'} />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={li.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        size="small"
                        inputProps={{ min: 1, style: { width: 60 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={li.costPerUnit}
                        onChange={(e) => updateItem(index, 'costPerUnit', e.target.value)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01, style: { width: 80 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={li.batchNo}
                        onChange={(e) => updateItem(index, 'batchNo', e.target.value)}
                        size="small"
                        placeholder="uses default"
                        inputProps={{ style: { width: 100 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        value={li.expiryDate}
                        onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ style: { width: 120 } }}
                        placeholder="uses default"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        value={li.warrantyEndDate}
                        onChange={(e) => updateItem(index, 'warrantyEndDate', e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ style: { width: 120 } }}
                        placeholder="uses default"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={li.remarks}
                        onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                        size="small"
                        inputProps={{ style: { width: 140 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeItem(index)}
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
          <Button startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 2 }} size="small">
            Add Item
          </Button>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Bulk Purchase'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/lab/purchases')} disabled={submitting}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
