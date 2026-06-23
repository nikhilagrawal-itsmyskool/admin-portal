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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { suppliesService } from '../../../services/suppliesService';

export default function SupplyItemForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    itemType: 'consumable',
    unit: '',
    reorderLevel: '',
    location: '',
    itemCondition: '',
    costPerUnit: '',
    comments: '',
    status: 'active',
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [units, setUnits] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Near-match guard
  const [confirmDialog, setConfirmDialog] = useState({ open: false, candidates: [] });

  useEffect(() => {
    const init = async () => {
      const cats = await loadLookups();
      if (isEdit) loadItem(cats);
    };
    init();
  }, [id]);

  const loadLookups = async () => {
    try {
      const [catData, unitsData, conditionsData] = await Promise.all([
        suppliesService.getCategories(),
        suppliesService.getUnits(),
        suppliesService.getConditions(),
      ]);
      const cats = catData.categories || [];
      setCategories(cats);
      setUnits(unitsData.units || []);
      setConditions(conditionsData.conditions || []);
      return cats;
    } catch (err) {
      console.error('Failed to load lookups:', err);
      return [];
    }
  };

  const loadItem = async (cats) => {
    setLoading(true);
    try {
      const item = await suppliesService.getItemById(id);
      setFormData({
        name: item.name || '',
        itemType: item.itemType || 'consumable',
        unit: item.unit || '',
        reorderLevel: item.reorderLevel ?? '',
        location: item.location || '',
        itemCondition: item.itemCondition || '',
        costPerUnit: item.costPerUnit ?? '',
        comments: item.comments || '',
        status: item.status || 'active',
      });
      setSelectedCategory(cats.find((c) => c.uuid === item.categoryId) || null);
    } catch (err) {
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'itemType' && value === 'consumable' ? { itemCondition: '' } : {}),
    }));
    setError('');
  };

  const buildPayload = (confirmNewItem = false) => {
    const payload = {
      categoryId: selectedCategory?.uuid,
      name: formData.name,
      itemType: formData.itemType,
      unit: formData.unit,
      reorderLevel: parseInt(formData.reorderLevel, 10) || 0,
      costPerUnit: parseFloat(formData.costPerUnit) || null,
      location: formData.location || undefined,
      comments: formData.comments || undefined,
    };
    if (formData.itemCondition) payload.itemCondition = formData.itemCondition;
    if (confirmNewItem) payload.confirmNewItem = true;
    return payload;
  };

  const submitCreate = async (confirmNewItem) => {
    const result = await suppliesService.createItem(buildPayload(confirmNewItem));
    if (result?.needsConfirmation) {
      setConfirmDialog({ open: true, candidates: result.conflicts?.[0]?.candidates || [] });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) { setError('Category is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await suppliesService.updateItem(id, buildPayload());
        navigate('/supplies/items');
      } else {
        const done = await submitCreate(false);
        if (done) navigate('/supplies/items');
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCreate = async () => {
    setConfirmDialog({ open: false, candidates: [] });
    setSaving(true);
    try {
      const done = await submitCreate(true);
      if (done) navigate('/supplies/items');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{isEdit ? 'Edit Item' : 'Add New Item'}</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={categories}
                  getOptionLabel={(o) => o.name || ''}
                  isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                  value={selectedCategory}
                  onChange={(_, v) => setSelectedCategory(v)}
                  renderInput={(params) => <TextField {...params} label="Category" required />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Item Name" name="name" value={formData.name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Item Type" name="itemType" value={formData.itemType} onChange={handleChange} required>
                  <MenuItem value="consumable">Consumable</MenuItem>
                  <MenuItem value="equipment">Equipment</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Unit" name="unit" value={formData.unit} onChange={handleChange} required>
                  {units.map((u) => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Reorder Level" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleChange} inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Store Room A, Shelf 3" />
              </Grid>
              {formData.itemType === 'equipment' && (
                <Grid item xs={12} md={6}>
                  <TextField fullWidth select label="Condition" name="itemCondition" value={formData.itemCondition} onChange={handleChange}>
                    <MenuItem value="">Not Specified</MenuItem>
                    {conditions.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Reference Cost per Unit" name="costPerUnit" type="number" value={formData.costPerUnit} onChange={handleChange} inputProps={{ step: '0.01', min: 0 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Comments" name="comments" value={formData.comments} onChange={handleChange} multiline rows={3} />
              </Grid>
              {isEdit && (
                <Grid item xs={12} md={6}>
                  <TextField fullWidth select label="Status" name="status" value={formData.status} onChange={handleChange}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="deleted">Deleted</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/supplies/items')} disabled={saving}>Cancel</Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Near-match guard dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, candidates: [] })} maxWidth="sm" fullWidth>
        <DialogTitle>Similar item{confirmDialog.candidates.length > 1 ? 's' : ''} already exist</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            "{formData.name}" looks close to existing item{confirmDialog.candidates.length > 1 ? 's' : ''} in this category.
            Did you mean one of these?
          </Typography>
          <List dense>
            {confirmDialog.candidates.map((c) => (
              <ListItem key={c.itemId} divider>
                <ListItemText primary={c.name} secondary={`Unit: ${c.unit} · Stock: ${c.currentStock}`} />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            If your item is genuinely different, create it anyway.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, candidates: [] })}>Go Back</Button>
          <Button onClick={handleConfirmCreate} variant="contained" color="warning">Create New Anyway</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
