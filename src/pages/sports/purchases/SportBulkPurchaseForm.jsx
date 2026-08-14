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
import { sportsService } from '../../../services/sportsService';
import { todayIso } from '../../../utils/date';

const emptyItem = () => ({
  _key: Math.random(),
  uuid: undefined,
  sport: null,
  item: null,
  itemOptions: [],
  quantity: '',
  costPerUnit: '',
  batchNo: '',
  remarks: '',
});

const toDateInput = (v) => (v ? new Date(v).toISOString().split('T')[0] : '');

export default function SportBulkPurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [sportTypes, setSportTypes] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Header fields
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [defaultBatchNo, setDefaultBatchNo] = useState('');
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
        const [typesData, itemsData] = await Promise.all([sportsService.getSportTypes(), sportsService.getItems()]);
        if (cancelled) return;
        const types = typesData.sportTypes || [];
        setSportTypes(types);
        setAllItems(itemsData);

        if (isEdit) {
          const batch = await sportsService.getPurchaseBatchById(id);
          if (cancelled) return;
          setPurchaseDate(toDateInput(batch.purchaseDate) || todayIso());
          setSupplier(batch.supplier || '');
          setInvoiceNumber(batch.invoiceNumber || '');
          setDefaultBatchNo(batch.batchNo || '');
          setNotes(batch.notes || '');
          setHasExistingBill(!!batch.fileId);

          const rows = (batch.items || []).map((it) => {
            const sport = types.find((t) => t.value === it.sportType) || null;
            const item = itemsData.find((i) => i.uuid === it.itemId) || null;
            return {
              _key: Math.random(),
              uuid: it.uuid,
              sport,
              item,
              itemOptions: sport ? itemsData.filter((i) => i.sportType === sport.value) : [],
              quantity: it.quantity != null ? String(it.quantity) : '',
              costPerUnit: it.costPerUnit != null ? String(it.costPerUnit) : '',
              batchNo: it.batchNo || '',
              remarks: it.remarks || '',
            };
          });
          setLineItems(rows.length ? rows : [emptyItem()]);
        }
      } catch {
        if (!cancelled) setError(isEdit ? 'Failed to load purchase' : 'Failed to load sports/items');
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
      if (field === 'sport') {
        next[index].item = null;
        next[index].itemOptions = value ? allItems.filter((i) => i.sportType === value.value) : [];
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
      const file = await sportsService.getSportBill(id);
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
      if (!li.sport) { setError(`Row ${i + 1}: Sport is required`); return; }
      if (!li.item) { setError(`Row ${i + 1}: Item is required`); return; }
      if (!li.quantity || parseInt(li.quantity) <= 0) { setError(`Row ${i + 1}: Quantity must be greater than 0`); return; }
    }

    const payload = {
      purchaseDate,
      supplier: supplier || undefined,
      invoiceNumber: invoiceNumber || undefined,
      batchNo: defaultBatchNo || undefined,
      notes: notes || undefined,
      items: lineItems.map((li) => ({
        uuid: li.uuid || undefined,
        itemId: li.item.uuid,
        sportType: li.sport.value,
        quantity: parseInt(li.quantity),
        costPerUnit: li.costPerUnit ? parseFloat(li.costPerUnit) : undefined,
        batchNo: li.batchNo || undefined,
        remarks: li.remarks || undefined,
      })),
    };

    const billPayload = billFile
      ? { fileName: billFile.fileName, mimeType: billFile.mimeType, base64Data: billFile.base64Data }
      : null;

    setSubmitting(true);
    try {
      if (isEdit) {
        const result = await sportsService.updatePurchaseBatch(id, payload);
        const returnedId = result?.uuid || id;
        if (billPayload) {
          await sportsService.uploadSportBill(returnedId, billPayload);
        } else if (removeExistingBill && hasExistingBill) {
          await sportsService.deleteSportBill(returnedId);
        }
      } else {
        await sportsService.createBulkPurchase({ ...payload, bill: billPayload || undefined });
      }
      navigate('/sports/purchases');
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
        <IconButton onClick={() => navigate('/sports/purchases')}>
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
            <Grid item xs={12}>
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
                  <TableCell sx={{ minWidth: 160 }}>Sport *</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Item *</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Qty *</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Cost/Unit</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Batch No. Override</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>Remarks</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((li, index) => (
                  <TableRow key={li._key}>
                    <TableCell>
                      <Autocomplete
                        options={sportTypes}
                        getOptionLabel={(o) => o.label || ''}
                        isOptionEqualToValue={(o, v) => o.value === v.value}
                        value={li.sport}
                        onChange={(_, val) => updateItem(index, 'sport', val)}
                        size="small"
                        renderInput={(params) => <TextField {...params} placeholder="Select sport" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        options={li.itemOptions}
                        getOptionLabel={(o) => o.name}
                        value={li.item}
                        onChange={(_, val) => updateItem(index, 'item', val)}
                        disabled={!li.sport}
                        size="small"
                        renderInput={(params) => <TextField {...params} placeholder={li.sport ? 'Select item' : 'Select sport first'} />}
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
        <Button variant="outlined" onClick={() => navigate('/sports/purchases')} disabled={submitting}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
