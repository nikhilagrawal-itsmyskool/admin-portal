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
import { sportsService } from '../../../services/sportsService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function SportBreakageForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    sportType: '',
    itemId: '',
    breakageDate: new Date().toISOString().split('T')[0],
    quantity: '1',
    responsibleType: '',
    responsibleName: '',
    responsibleClass: '',
    responsibleId: '',
    cause: '',
    estimatedCost: '',
    actionTaken: '',
    breakageStatus: 'reported',
    remarks: '',
    status: 'active',
  });
  const [sportTypes, setSportTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedSportType, setSelectedSportType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null); // new file to upload
  const [existingFileId, setExistingFileId] = useState(null); // existing fileId in edit mode
  const [deleteExistingFile, setDeleteExistingFile] = useState(false);
  const imageInputRef = useRef(null);

  const responsibleTypes = [
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'wear_and_tear', label: 'Wear & Tear' },
    { value: 'unknown', label: 'Unknown' },
  ];

  const causes = [
    { value: 'accident', label: 'Accident' },
    { value: 'mishandling', label: 'Mishandling' },
    { value: 'wear_and_tear', label: 'Wear & Tear' },
    { value: 'manufacturing_defect', label: 'Manufacturing Defect' },
  ];

  const actions = [
    { value: 'replaced', label: 'Replaced' },
    { value: 'repaired', label: 'Repaired' },
    { value: 'written_off', label: 'Written Off' },
    { value: 'cost_recovered', label: 'Cost Recovered' },
  ];

  useEffect(() => {
    const init = async () => {
      const [sportsData, itemsData] = await loadData();
      if (isEdit) {
        loadBreakage(sportsData, itemsData);
      }
    };
    init();
  }, [id]);

  const loadData = async () => {
    try {
      const [typesData, itemsData] = await Promise.all([
        sportsService.getSportTypes(),
        sportsService.getItems(),
      ]);
      const types = typesData.sportTypes || [];
      setSportTypes(types);
      setItems(itemsData);
      setFilteredItems(itemsData);
      return [types, itemsData];
    } catch (err) {
      console.error('Failed to load data:', err);
      return [[], []];
    }
  };

  const loadBreakage = async (typesData, itemsData) => {
    setLoading(true);
    try {
      const breakage = await sportsService.getBreakageById(id);
      setFormData({
        sportType: breakage.sportType || '',
        itemId: breakage.itemId || '',
        breakageDate: breakage.breakageDate?.split('T')[0] || '',
        quantity: breakage.quantity || '1',
        responsibleType: breakage.responsibleType || '',
        responsibleName: breakage.resolvedResponsibleName || breakage.responsibleName || '',
        responsibleClass: breakage.resolvedResponsibleClass || breakage.responsibleClass || '',
        responsibleId: breakage.responsibleId || '',
        cause: breakage.cause || '',
        estimatedCost: breakage.estimatedCost ?? '',
        actionTaken: breakage.actionTaken || '',
        breakageStatus: breakage.breakageStatus || 'reported',
        remarks: breakage.remarks || '',
        status: breakage.status || 'active',
      });
      const sportType = typesData.find((t) => t.value === breakage.sportType);
      if (sportType) {
        setSelectedSportType(sportType);
        setFilteredItems(itemsData.filter((i) => i.sportType === sportType.value));
      }
      const item = itemsData.find((i) => i.uuid === breakage.itemId);
      if (item) setSelectedItem(item);
      if (breakage.fileId) setExistingFileId(breakage.fileId);
    } catch (err) {
      setError('Failed to load breakage');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleResponsibleTypeChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      responsibleType: value,
      responsibleName: '',
      responsibleClass: '',
      responsibleId: '',
    }));
    setError('');
  };

  const handleSportChange = (event, newValue) => {
    setSelectedSportType(newValue);
    setSelectedItem(null);
    setFormData((prev) => ({ ...prev, sportType: newValue?.value || '', itemId: '' }));
    if (newValue) {
      setFilteredItems(items.filter((i) => i.sportType === newValue.value));
    } else {
      setFilteredItems(items);
    }
  };

  const handleItemChange = (event, newValue) => {
    setSelectedItem(newValue);
    setFormData((prev) => ({
      ...prev,
      itemId: newValue?.uuid || '',
      estimatedCost: newValue?.costPerUnit
        ? (parseFloat(newValue.costPerUnit) * parseInt(formData.quantity || 1, 10)).toFixed(2)
        : prev.estimatedCost,
    }));
  };

  const handleQuantityChange = (e) => {
    const qty = e.target.value;
    setFormData((prev) => ({
      ...prev,
      quantity: qty,
      estimatedCost: selectedItem?.costPerUnit
        ? (parseFloat(selectedItem.costPerUnit) * parseInt(qty || 1, 10)).toFixed(2)
        : prev.estimatedCost,
    }));
  };

  const handleStudentSelect = (student) => {
    setFormData((prev) => ({
      ...prev,
      responsibleId: student.uuid,
      responsibleName: student.name,
      responsibleClass: student.class_name || '',
    }));
  };

  const handleEmployeeSelect = (employee) => {
    setFormData((prev) => ({
      ...prev,
      responsibleId: employee.uuid,
      responsibleName: employee.name,
    }));
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      setImageFile({ fileName: file.name, mimeType: file.type, base64Data, size: file.size });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearResponsible = () => {
    setFormData((prev) => ({
      ...prev,
      responsibleId: '',
      responsibleName: '',
      responsibleClass: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10) || 1,
        estimatedCost: parseFloat(formData.estimatedCost) || null,
        fileData: imageFile ? { fileName: imageFile.fileName, mimeType: imageFile.mimeType, base64Data: imageFile.base64Data } : undefined,
        deleteFile: deleteExistingFile || undefined,
      };

      if (isEdit) {
        await sportsService.updateBreakage(id, payload);
      } else {
        await sportsService.createBreakage(payload);
      }
      navigate('/sports/breakages');
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save breakage';
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

  const showPersonFields = formData.responsibleType === 'student' || formData.responsibleType === 'teacher';

  const renderResponsibleNameField = () => {
    if (!showPersonFields) return null;

    return (
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Responsible Name"
          value={formData.responsibleName}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                {formData.responsibleName && (
                  <IconButton size="small" onClick={clearResponsible}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() =>
                    formData.responsibleType === 'student'
                      ? setStudentDialogOpen(true)
                      : setEmployeeDialogOpen(true)
                  }
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          placeholder={`Click search to select ${formData.responsibleType === 'student' ? 'student' : 'teacher'}...`}
        />
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isEdit ? 'Edit Breakage' : 'Report Breakage'}
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
                  options={sportTypes}
                  getOptionLabel={(option) => option.label || ''}
                  isOptionEqualToValue={(o, v) => o.value === v.value}
                  value={selectedSportType}
                  onChange={handleSportChange}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField {...params} label="Sport" required />
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
                  label="Breakage Date"
                  name="breakageDate"
                  type="date"
                  value={formData.breakageDate}
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
                  onChange={handleQuantityChange}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Responsible Type"
                  name="responsibleType"
                  value={formData.responsibleType}
                  onChange={handleResponsibleTypeChange}
                >
                  <MenuItem value="">Not Specified</MenuItem>
                  {responsibleTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {renderResponsibleNameField()}
              {formData.responsibleType === 'student' && formData.responsibleClass && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Responsible Class"
                    value={formData.responsibleClass}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Cause"
                  name="cause"
                  value={formData.cause}
                  onChange={handleChange}
                >
                  <MenuItem value="">Not Specified</MenuItem>
                  {causes.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estimated Cost"
                  name="estimatedCost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={handleChange}
                  inputProps={{ step: '0.01', min: 0 }}
                  helperText={selectedItem?.costPerUnit ? `Item cost/unit: ${selectedItem.costPerUnit}` : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Action Taken"
                  name="actionTaken"
                  value={formData.actionTaken}
                  onChange={handleChange}
                >
                  <MenuItem value="">Not Specified</MenuItem>
                  {actions.map((a) => (
                    <MenuItem key={a.value} value={a.value}>
                      {a.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Breakage Status"
                  name="breakageStatus"
                  value={formData.breakageStatus}
                  onChange={handleChange}
                >
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </TextField>
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
              <Grid item xs={12}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={handleImageFile}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AttachFileIcon />}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Attach Image
                  </Button>
                  {imageFile && (
                    <Chip
                      label={`${imageFile.fileName} (${(imageFile.size / 1024).toFixed(1)} KB)`}
                      size="small"
                      onDelete={() => setImageFile(null)}
                    />
                  )}
                  {!imageFile && existingFileId && !deleteExistingFile && (
                    <Chip
                      label="Existing image"
                      size="small"
                      color="primary"
                      variant="outlined"
                      onDelete={() => setDeleteExistingFile(true)}
                    />
                  )}
                  {deleteExistingFile && (
                    <Chip
                      label="Image will be removed"
                      size="small"
                      color="error"
                      variant="outlined"
                      onDelete={() => setDeleteExistingFile(false)}
                    />
                  )}
                </Box>
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
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Report Breakage'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/sports/breakages')}
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

      <StudentSearchDialog
        open={studentDialogOpen}
        onClose={() => setStudentDialogOpen(false)}
        onSelect={handleStudentSelect}
      />

      <EmployeeSearchDialog
        open={employeeDialogOpen}
        onClose={() => setEmployeeDialogOpen(false)}
        onSelect={handleEmployeeSelect}
      />
    </Box>
  );
}
