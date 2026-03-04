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

export default function LabItemForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    labId: '',
    name: '',
    category: '',
    itemType: '',
    unit: '',
    reorderLevel: '',
    location: '',
    itemCondition: '',
    costPerUnit: '',
    comments: '',
    status: 'active',
  });
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const labsData = await loadLookups();
      if (isEdit) {
        loadItem(labsData);
      }
    };
    init();
  }, [id]);

  const loadLookups = async () => {
    try {
      const [labsData, unitsData, conditionsData] = await Promise.all([
        labService.getLabs(),
        labService.getUnits(),
        labService.getConditions(),
      ]);
      setLabs(labsData);
      setUnits(unitsData.units || []);
      setConditions(conditionsData.conditions || []);
      return labsData;
    } catch (err) {
      console.error('Failed to load lookups:', err);
      return [];
    }
  };

  const loadCategoriesForType = async (labType) => {
    try {
      const data = await labService.getCategories(labType);
      if (labType && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else if (labType && data.categories?.[labType]) {
        setCategories(data.categories[labType]);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadItem = async (labsData) => {
    setLoading(true);
    try {
      const item = await labService.getItemById(id);
      setFormData({
        labId: item.labId || '',
        name: item.name || '',
        category: item.category || '',
        itemType: item.itemType || '',
        unit: item.unit || '',
        reorderLevel: item.reorderLevel ?? '',
        location: item.location || '',
        itemCondition: item.itemCondition || '',
        costPerUnit: item.costPerUnit ?? '',
        comments: item.comments || '',
        status: item.status || 'active',
      });
      const lab = labsData.find((l) => l.uuid === item.labId);
      if (lab) {
        setSelectedLab(lab);
        await loadCategoriesForType(lab.type);
      }
    } catch (err) {
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'itemType' && value === 'consumable') {
      setFormData((prev) => ({ ...prev, [name]: value, itemCondition: '' }));
    }
    setError('');
  };

  const handleLabChange = (event, newValue) => {
    setSelectedLab(newValue);
    setFormData((prev) => ({ ...prev, labId: newValue?.uuid || '', category: '' }));
    if (newValue) {
      loadCategoriesForType(newValue.type);
    } else {
      setCategories([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        reorderLevel: parseInt(formData.reorderLevel, 10) || 0,
        costPerUnit: parseFloat(formData.costPerUnit) || null,
      };
      if (!payload.itemCondition) delete payload.itemCondition;
      if (!payload.category) delete payload.category;

      if (isEdit) {
        await labService.updateItem(id, payload);
      } else {
        await labService.createItem(payload);
      }
      navigate('/lab/items');
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save item';
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
        {isEdit ? 'Edit Item' : 'Add New Item'}
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
                  getOptionLabel={(option) => `${option.name} (${option.type})`}
                  value={selectedLab}
                  onChange={handleLabChange}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField {...params} label="Lab" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={categories.length === 0}
                  helperText={!selectedLab ? 'Select a lab first' : ''}
                >
                  <MenuItem value="">None</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Item Type"
                  name="itemType"
                  value={formData.itemType}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="equipment">Equipment</MenuItem>
                  <MenuItem value="consumable">Consumable</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reorder Level"
                  name="reorderLevel"
                  type="number"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Shelf A, Cabinet 3"
                />
              </Grid>
              {formData.itemType === 'equipment' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Condition"
                    name="itemCondition"
                    value={formData.itemCondition}
                    onChange={handleChange}
                  >
                    <MenuItem value="">Not Specified</MenuItem>
                    {conditions.map((cond) => (
                      <MenuItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Cost per Unit"
                  name="costPerUnit"
                  type="number"
                  value={formData.costPerUnit}
                  onChange={handleChange}
                  inputProps={{ step: '0.01', min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Comments"
                  name="comments"
                  value={formData.comments}
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
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/lab/items')}
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
