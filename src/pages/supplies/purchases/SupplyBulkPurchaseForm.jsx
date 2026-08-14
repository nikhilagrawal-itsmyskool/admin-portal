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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { suppliesService } from '../../../services/suppliesService';
import { todayIso } from '../../../utils/date';

const emptyItem = () => ({
  _key: Math.random(),
  uuid: undefined,
  category: null,
  item: null, // existing item object
  newName: '', // typed new-item name
  unit: '',
  quantity: '',
  costPerUnit: '',
  batchNo: '',
  remarks: '',
  confirmNewItem: false,
});

const toDateInput = (v) => (v ? new Date(v).toISOString().split('T')[0] : '');
const isNewLine = (li) => !li.item && li.newName.trim().length > 0;

export default function SupplyBulkPurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [categories, setCategories] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Header
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [defaultBatchNo, setDefaultBatchNo] = useState('');
  const [notes, setNotes] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [hasExistingBill, setHasExistingBill] = useState(false);
  const [removeExistingBill, setRemoveExistingBill] = useState(false);
  const billInputRef = useRef(null);

  const [lineItems, setLineItems] = useState([emptyItem()]);

  // Near-match resolution dialog
  const [conflictDialog, setConflictDialog] = useState({ open: false, conflicts: [], resolutions: {} });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catData, itemsData, unitsData] = await Promise.all([
          suppliesService.getCategories(),
          suppliesService.getItems(),
          suppliesService.getUnits(),
        ]);
        if (cancelled) return;
        const cats = catData.categories || [];
        setCategories(cats);
        setAllItems(itemsData);
        setUnits(unitsData.units || []);

        if (isEdit) {
          const batch = await suppliesService.getPurchaseBatchById(id);
          if (cancelled) return;
          setPurchaseDate(toDateInput(batch.purchaseDate) || todayIso());
          setSupplier(batch.supplier || '');
          setInvoiceNumber(batch.invoiceNumber || '');
          setDefaultBatchNo(batch.batchNo || '');
          setNotes(batch.notes || '');
          setHasExistingBill(!!batch.fileId);

          const rows = (batch.items || []).map((it) => {
            const item = itemsData.find((i) => i.uuid === it.itemId) || null;
            return {
              _key: Math.random(),
              uuid: it.uuid,
              category: item ? cats.find((c) => c.uuid === item.categoryId) || null : null,
              item,
              newName: '',
              unit: '',
              quantity: it.quantity != null ? String(it.quantity) : '',
              costPerUnit: it.costPerUnit != null ? String(it.costPerUnit) : '',
              batchNo: it.batchNo || '',
              remarks: it.remarks || '',
              confirmNewItem: false,
            };
          });
          setLineItems(rows.length ? rows : [emptyItem()]);
        }
      } catch {
        if (!cancelled) setError(isEdit ? 'Failed to load purchase' : 'Failed to load categories/items');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const patchItem = (index, patch) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleCategoryChange = (index, val) => {
    patchItem(index, { category: val, item: null, newName: '', unit: '' });
  };

  const itemOptionsFor = (li) => (li.category ? allItems.filter((i) => i.categoryId === li.category.uuid) : []);

  const handleBillFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBillFile({ fileName: file.name, mimeType: file.type, base64Data: reader.result.split(',')[1], size: file.size });
      setRemoveExistingBill(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadExistingBill = async () => {
    try {
      const file = await suppliesService.getBill(id);
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.fileName || 'bill';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download bill');
    }
  };

  const addItem = () => setLineItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index) => setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const validate = (lines) => {
    for (let i = 0; i < lines.length; i++) {
      const li = lines[i];
      if (!li.category) return `Row ${i + 1}: Category is required`;
      if (!li.item && !li.newName.trim()) return `Row ${i + 1}: Select or type an item`;
      if (isNewLine(li) && !li.unit) return `Row ${i + 1}: Unit is required for the new item`;
      if (!li.quantity || parseInt(li.quantity) <= 0) return `Row ${i + 1}: Quantity must be greater than 0`;
    }
    return '';
  };

  const buildPayload = (lines) => ({
    purchaseDate,
    supplier: supplier || undefined,
    invoiceNumber: invoiceNumber || undefined,
    batchNo: defaultBatchNo || undefined,
    notes: notes || undefined,
    items: lines.map((li) => {
      const base = {
        quantity: parseInt(li.quantity),
        costPerUnit: li.costPerUnit ? parseFloat(li.costPerUnit) : undefined,
        batchNo: li.batchNo || undefined,
        remarks: li.remarks || undefined,
      };
      if (isEdit) {
        return { ...base, uuid: li.uuid || undefined, itemId: li.item.uuid };
      }
      if (li.item) {
        return { ...base, itemId: li.item.uuid };
      }
      return {
        ...base,
        newItem: { name: li.newName.trim(), categoryId: li.category.uuid, unit: li.unit },
        confirmNewItem: li.confirmNewItem || undefined,
      };
    }),
  });

  const submitCreate = async (lines) => {
    const billPayload = billFile ? { fileName: billFile.fileName, mimeType: billFile.mimeType, base64Data: billFile.base64Data } : undefined;
    const result = await suppliesService.createBulkPurchase({ ...buildPayload(lines), bill: billPayload });
    if (result?.needsConfirmation) {
      // Default each conflict to reusing the first candidate (nudges de-duplication).
      const resolutions = {};
      for (const c of result.conflicts) {
        resolutions[c.lineIndex] = { action: 'use', candidate: c.candidates[0] };
      }
      setConflictDialog({ open: true, conflicts: result.conflicts, resolutions });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    const msg = validate(lineItems);
    if (msg) { setError(msg); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        const result = await suppliesService.updatePurchaseBatch(id, buildPayload(lineItems));
        const returnedId = result?.uuid || id;
        if (billFile) {
          await suppliesService.uploadBill(returnedId, { fileName: billFile.fileName, mimeType: billFile.mimeType, base64Data: billFile.base64Data });
        } else if (removeExistingBill && hasExistingBill) {
          await suppliesService.deleteBill(returnedId);
        }
        navigate('/supplies/purchases');
      } else {
        const done = await submitCreate(lineItems);
        if (done) navigate('/supplies/purchases');
      }
    } catch (err) {
      setError(err?.response?.data?.error?.description || (isEdit ? 'Failed to save purchase' : 'Failed to create bulk purchase'));
    } finally {
      setSubmitting(false);
    }
  };

  // Apply the conflict resolutions to the lines, then resubmit.
  const handleResolveConflicts = async () => {
    const { resolutions } = conflictDialog;
    const resolved = lineItems.map((li, idx) => {
      const r = resolutions[idx];
      if (!r) return li;
      if (r.action === 'use') {
        const existing = allItems.find((i) => i.uuid === r.candidate.itemId);
        return { ...li, item: existing || li.item, newName: '', confirmNewItem: false };
      }
      return { ...li, confirmNewItem: true };
    });
    setLineItems(resolved);
    setConflictDialog({ open: false, conflicts: [], resolutions: {} });
    setSubmitting(true);
    setError('');
    try {
      const done = await submitCreate(resolved);
      if (done) navigate('/supplies/purchases');
    } catch (err) {
      setError(err?.response?.data?.error?.description || 'Failed to create bulk purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const setResolution = (lineIndex, value) => {
    setConflictDialog((prev) => ({ ...prev, resolutions: { ...prev.resolutions, [lineIndex]: value } }));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/supplies/purchases')}><BackIcon /></IconButton>
        <Typography variant="h4">{isEdit ? 'Edit Purchase' : 'New Purchase'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Invoice Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Purchase Date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} required />
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
              <input ref={billInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleBillFile} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" size="small" startIcon={<AttachFileIcon />} onClick={() => billInputRef.current?.click()}>
                  {hasExistingBill && !removeExistingBill ? 'Replace Bill' : 'Attach Bill'}
                </Button>
                {billFile && <Chip label={`${billFile.fileName} (${(billFile.size / 1024).toFixed(1)} KB)`} size="small" onDelete={() => setBillFile(null)} />}
                {isEdit && hasExistingBill && !billFile && !removeExistingBill && (
                  <Chip label="Current bill" size="small" variant="outlined" icon={<DownloadIcon />} onClick={handleDownloadExistingBill} onDelete={() => setRemoveExistingBill(true)} />
                )}
                {isEdit && removeExistingBill && !billFile && (
                  <Chip label="Bill will be removed on save" size="small" color="warning" onDelete={() => setRemoveExistingBill(false)} />
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>Items</Typography>
          {!isEdit && (
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Pick an existing item, or type a new name to add it to the catalog on save.
            </Typography>
          )}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, whiteSpace: 'nowrap' } }}>
                  <TableCell sx={{ minWidth: 170 }}>Category *</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Item *</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>Unit</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Qty *</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Cost/Unit</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Batch No. Override</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Remarks</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((li, index) => {
                  const newLine = isNewLine(li);
                  return (
                    <TableRow key={li._key}>
                      <TableCell>
                        <Autocomplete
                          options={categories}
                          getOptionLabel={(o) => o.name || ''}
                          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                          value={li.category}
                          onChange={(_, val) => handleCategoryChange(index, val)}
                          disabled={isEdit}
                          size="small"
                          renderInput={(params) => <TextField {...params} placeholder="Category" />}
                        />
                      </TableCell>
                      <TableCell>
                        <Autocomplete
                          freeSolo={!isEdit}
                          options={itemOptionsFor(li)}
                          getOptionLabel={(o) => (typeof o === 'string' ? o : o.name || '')}
                          value={li.item || (li.newName ? li.newName : null)}
                          onChange={(_, val) => {
                            if (typeof val === 'string') patchItem(index, { item: null, newName: val });
                            else if (val) patchItem(index, { item: val, newName: '', unit: '' });
                            else patchItem(index, { item: null, newName: '' });
                          }}
                          onInputChange={(_, val, reason) => {
                            if (reason === 'input' && !isEdit) patchItem(index, { item: null, newName: val });
                          }}
                          disabled={!li.category}
                          size="small"
                          renderInput={(params) => (
                            <TextField {...params} placeholder={li.category ? (isEdit ? 'Select item' : 'Select or type new') : 'Category first'} />
                          )}
                        />
                        {newLine && <Chip label="New item" size="small" color="success" variant="outlined" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />}
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          value={newLine ? li.unit : (li.item?.unit || '')}
                          onChange={(e) => patchItem(index, { unit: e.target.value })}
                          disabled={!newLine}
                          size="small"
                          sx={{ width: 100 }}
                        >
                          <MenuItem value="">—</MenuItem>
                          {units.map((u) => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField type="number" value={li.quantity} onChange={(e) => patchItem(index, { quantity: e.target.value })} size="small" inputProps={{ min: 1, style: { width: 60 } }} />
                      </TableCell>
                      <TableCell>
                        <TextField type="number" value={li.costPerUnit} onChange={(e) => patchItem(index, { costPerUnit: e.target.value })} size="small" inputProps={{ min: 0, step: 0.01, style: { width: 80 } }} />
                      </TableCell>
                      <TableCell>
                        <TextField value={li.batchNo} onChange={(e) => patchItem(index, { batchNo: e.target.value })} size="small" placeholder="uses default" inputProps={{ style: { width: 100 } }} />
                      </TableCell>
                      <TableCell>
                        <TextField value={li.remarks} onChange={(e) => patchItem(index, { remarks: e.target.value })} size="small" inputProps={{ style: { width: 130 } }} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removeItem(index)} disabled={lineItems.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <Button startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 2 }} size="small">Add Item</Button>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : undefined}>
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Purchase'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/supplies/purchases')} disabled={submitting}>Cancel</Button>
      </Box>

      {/* Near-match resolution dialog */}
      <Dialog open={conflictDialog.open} onClose={() => setConflictDialog({ open: false, conflicts: [], resolutions: {} })} maxWidth="sm" fullWidth>
        <DialogTitle>Some new items look like duplicates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choose to use an existing item or create the new one anyway, for each:
          </Typography>
          <Stack spacing={2}>
            {conflictDialog.conflicts.map((c) => {
              const res = conflictDialog.resolutions[c.lineIndex] || {};
              const currentValue = res.action === 'create' ? '__create__' : res.candidate?.itemId;
              return (
                <Box key={c.lineIndex} sx={{ border: '1px solid #e4e9f2', borderRadius: 1, p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Row {c.lineIndex + 1}: "{c.proposedName}"
                  </Typography>
                  <ToggleButtonGroup
                    orientation="vertical"
                    exclusive
                    fullWidth
                    size="small"
                    value={currentValue}
                    onChange={(_, val) => {
                      if (!val) return;
                      if (val === '__create__') setResolution(c.lineIndex, { action: 'create' });
                      else setResolution(c.lineIndex, { action: 'use', candidate: c.candidates.find((x) => x.itemId === val) });
                    }}
                  >
                    {c.candidates.map((cand) => (
                      <ToggleButton key={cand.itemId} value={cand.itemId} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                        Use existing: {cand.name} (Stock: {cand.currentStock})
                      </ToggleButton>
                    ))}
                    <ToggleButton value="__create__" sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                      Create "{c.proposedName}" as a new item
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialog({ open: false, conflicts: [], resolutions: {} })}>Cancel</Button>
          <Button onClick={handleResolveConflicts} variant="contained">Continue</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
