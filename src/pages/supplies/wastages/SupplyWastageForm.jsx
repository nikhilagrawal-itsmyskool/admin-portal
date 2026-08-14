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
  InputAdornment,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { suppliesService } from '../../../services/suppliesService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import { todayIso } from '../../../utils/date';

export default function SupplyWastageForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    itemId: '',
    wastageDate: todayIso(),
    quantity: '1',
    reason: '',
    responsibleType: '',
    responsibleName: '',
    responsibleClass: '',
    responsibleId: '',
    estimatedCost: '',
    actionTaken: '',
    wastageStatus: 'reported',
    remarks: '',
    status: 'active',
  });
  const [items, setItems] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [existingFileId, setExistingFileId] = useState(null);
  const [deleteExistingFile, setDeleteExistingFile] = useState(false);
  const imageInputRef = useRef(null);

  const responsibleTypes = [
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'wear_and_tear', label: 'Wear & Tear' },
    { value: 'unknown', label: 'Unknown' },
  ];

  const actions = [
    { value: 'written_off', label: 'Written Off' },
    { value: 'replaced', label: 'Replaced' },
    { value: 'cost_recovered', label: 'Cost Recovered' },
  ];

  useEffect(() => {
    const init = async () => {
      const itemsData = await loadData();
      if (isEdit) loadWastage(itemsData);
    };
    init();
  }, [id]);

  const loadData = async () => {
    try {
      const [itemsData, conditionsData] = await Promise.all([
        suppliesService.getItems(),
        suppliesService.getConditions(),
      ]);
      setItems(itemsData);
      setReasons(conditionsData.wastageReasons || []);
      return itemsData;
    } catch (err) {
      console.error('Failed to load data:', err);
      return [];
    }
  };

  const loadWastage = async (itemsData) => {
    setLoading(true);
    try {
      const w = await suppliesService.getWastageById(id);
      setFormData({
        itemId: w.itemId || '',
        wastageDate: w.wastageDate?.split('T')[0] || '',
        quantity: w.quantity || '1',
        reason: w.reason || '',
        responsibleType: w.responsibleType || '',
        responsibleName: w.resolvedResponsibleName || w.responsibleName || '',
        responsibleClass: w.resolvedResponsibleClass || w.responsibleClass || '',
        responsibleId: w.responsibleId || '',
        estimatedCost: w.estimatedCost ?? '',
        actionTaken: w.actionTaken || '',
        wastageStatus: w.wastageStatus || 'reported',
        remarks: w.remarks || '',
        status: w.status || 'active',
      });
      const item = itemsData.find((i) => i.uuid === w.itemId);
      if (item) setSelectedItem(item);
      if (w.fileId) setExistingFileId(w.fileId);
    } catch (err) {
      setError('Failed to load wastage');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); setError(''); };

  const handleResponsibleTypeChange = (e) => {
    setFormData((prev) => ({ ...prev, responsibleType: e.target.value, responsibleName: '', responsibleClass: '', responsibleId: '' }));
    setError('');
  };

  const handleItemChange = (_, newValue) => {
    setSelectedItem(newValue);
    setFormData((prev) => ({
      ...prev,
      itemId: newValue?.uuid || '',
      estimatedCost: newValue?.costPerUnit ? (parseFloat(newValue.costPerUnit) * parseInt(prev.quantity || 1, 10)).toFixed(2) : prev.estimatedCost,
    }));
  };

  const handleQuantityChange = (e) => {
    const qty = e.target.value;
    setFormData((prev) => ({
      ...prev,
      quantity: qty,
      estimatedCost: selectedItem?.costPerUnit ? (parseFloat(selectedItem.costPerUnit) * parseInt(qty || 1, 10)).toFixed(2) : prev.estimatedCost,
    }));
  };

  const handleStudentSelect = (student) => setFormData((prev) => ({ ...prev, responsibleId: student.uuid, responsibleName: student.name, responsibleClass: student.class_name || '' }));
  const handleEmployeeSelect = (employee) => setFormData((prev) => ({ ...prev, responsibleId: employee.uuid, responsibleName: employee.name }));

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageFile({ fileName: file.name, mimeType: file.type, base64Data: reader.result.split(',')[1], size: file.size });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearResponsible = () => setFormData((prev) => ({ ...prev, responsibleId: '', responsibleName: '', responsibleClass: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10) || 1,
        estimatedCost: parseFloat(formData.estimatedCost) || null,
        fileData: imageFile ? { fileName: imageFile.fileName, mimeType: imageFile.mimeType, base64Data: imageFile.base64Data } : undefined,
        deleteFile: deleteExistingFile || undefined,
      };
      if (isEdit) await suppliesService.updateWastage(id, payload);
      else await suppliesService.createWastage(payload);
      navigate('/supplies/wastages');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save wastage');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const showPersonFields = formData.responsibleType === 'student' || formData.responsibleType === 'teacher';

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{isEdit ? 'Edit Wastage' : 'Record Wastage'}</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={items}
                  getOptionLabel={(o) => `${o.name} (Stock: ${o.currentStock})`}
                  value={selectedItem}
                  onChange={handleItemChange}
                  disabled={isEdit}
                  renderInput={(params) => <TextField {...params} label="Item" required />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Wastage Date" name="wastageDate" type="date" value={formData.wastageDate} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleQuantityChange} inputProps={{ min: 1 }} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Reason" name="reason" value={formData.reason} onChange={handleChange} required>
                  {reasons.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Responsible Type" name="responsibleType" value={formData.responsibleType} onChange={handleResponsibleTypeChange}>
                  <MenuItem value="">Not Specified</MenuItem>
                  {responsibleTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              </Grid>
              {showPersonFields && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Responsible Name"
                    value={formData.responsibleName}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          {formData.responsibleName && <IconButton size="small" onClick={clearResponsible}><ClearIcon fontSize="small" /></IconButton>}
                          <IconButton size="small" onClick={() => (formData.responsibleType === 'student' ? setStudentDialogOpen(true) : setEmployeeDialogOpen(true))}><SearchIcon fontSize="small" /></IconButton>
                        </InputAdornment>
                      ),
                    }}
                    placeholder={`Click search to select ${formData.responsibleType === 'student' ? 'student' : 'teacher'}...`}
                  />
                </Grid>
              )}
              {formData.responsibleType === 'student' && formData.responsibleClass && (
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Responsible Class" value={formData.responsibleClass} InputProps={{ readOnly: true }} />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Estimated Cost" name="estimatedCost" type="number" value={formData.estimatedCost} onChange={handleChange} inputProps={{ step: '0.01', min: 0 }} helperText={selectedItem?.costPerUnit ? `Item cost/unit: ${selectedItem.costPerUnit}` : ''} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Action Taken" name="actionTaken" value={formData.actionTaken} onChange={handleChange}>
                  <MenuItem value="">Not Specified</MenuItem>
                  {actions.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Status" name="wastageStatus" value={formData.wastageStatus} onChange={handleChange}>
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} multiline rows={3} />
              </Grid>
              <Grid item xs={12}>
                <input ref={imageInputRef} type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleImageFile} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small" startIcon={<AttachFileIcon />} onClick={() => imageInputRef.current?.click()}>Attach Image</Button>
                  {imageFile && <Chip label={`${imageFile.fileName} (${(imageFile.size / 1024).toFixed(1)} KB)`} size="small" onDelete={() => setImageFile(null)} />}
                  {!imageFile && existingFileId && !deleteExistingFile && <Chip label="Existing image" size="small" color="primary" variant="outlined" onDelete={() => setDeleteExistingFile(true)} />}
                  {deleteExistingFile && <Chip label="Image will be removed" size="small" color="error" variant="outlined" onDelete={() => setDeleteExistingFile(false)} />}
                </Box>
              </Grid>
              {isEdit && (
                <Grid item xs={12} md={6}>
                  <TextField fullWidth select label="Record Status" name="status" value={formData.status} onChange={handleChange}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="deleted">Deleted</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Wastage'}</Button>
                  <Button variant="outlined" onClick={() => navigate('/supplies/wastages')} disabled={saving}>Cancel</Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <StudentSearchDialog open={studentDialogOpen} onClose={() => setStudentDialogOpen(false)} onSelect={handleStudentSelect} />
      <EmployeeSearchDialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} onSelect={handleEmployeeSelect} />
    </Box>
  );
}
