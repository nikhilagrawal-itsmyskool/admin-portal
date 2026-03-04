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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { labService } from '../../../services/labService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function LabBreakageForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    labId: '',
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
  const [labs, setLabs] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const [labsData, itemsData] = await loadData();
      if (isEdit) {
        loadBreakage(labsData, itemsData);
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

  const loadBreakage = async (labsData, itemsData) => {
    setLoading(true);
    try {
      const breakage = await labService.getBreakageById(id);
      setFormData({
        labId: breakage.labId || '',
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
      const lab = labsData.find((l) => l.uuid === breakage.labId);
      if (lab) {
        setSelectedLab(lab);
        setFilteredItems(itemsData.filter((i) => i.labId === lab.uuid));
      }
      const item = itemsData.find((i) => i.uuid === breakage.itemId);
      if (item) setSelectedItem(item);
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
      };

      if (isEdit) {
        await labService.updateBreakage(id, payload);
      } else {
        await labService.createBreakage(payload);
      }
      navigate('/lab/breakages');
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
                    onClick={() => navigate('/lab/breakages')}
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
