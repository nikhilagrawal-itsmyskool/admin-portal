import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Grid,
  MenuItem,
  Alert,
  Typography,
} from '@mui/material';
import { assetService } from '../../../services/assetService';

const emptyForm = {
  typeId: null,
  name: '',
  quantity: 1,
  assetCondition: '',
  assetStatus: 'active',
};

// Create a new asset (optionally under `parent`) or edit an existing one.
export default function AssetFormDialog({ open, onClose, onSaved, asset, parent, types, conditions, statuses }) {
  const isEdit = !!asset;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (asset) {
      setForm({
        typeId: types.find((t) => t.uuid === asset.typeId) || null,
        name: asset.name || '',
        quantity: asset.quantity ?? 1,
        assetCondition: asset.assetCondition || '',
        assetStatus: asset.assetStatus || 'active',
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [open, asset, types]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.typeId) {
      setError('Type is required');
      return;
    }
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await assetService.updateAsset(asset.uuid, {
          typeId: form.typeId.uuid,
          name: form.name.trim(),
          quantity: Number(form.quantity) || 1,
          assetCondition: form.assetCondition || undefined,
          assetStatus: form.assetStatus,
        });
      } else {
        await assetService.createAsset({
          typeId: form.typeId.uuid,
          name: form.name.trim(),
          quantity: Number(form.quantity) || 1,
          assetCondition: form.assetCondition || undefined,
          assetStatus: form.assetStatus,
          parentId: parent ? parent.uuid : undefined,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Asset' : parent ? `Add Asset under "${parent.name}"` : 'Add Root Asset'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={types}
              groupBy={(o) => (o.kind === 'container' ? 'Containers' : 'Items')}
              getOptionLabel={(o) => o.label || ''}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              value={form.typeId}
              onChange={(e, v) => set('typeId', v)}
              renderInput={(params) => <TextField {...params} label="Type" size="small" required />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              size="small"
              required
              placeholder="e.g. Room 101 / Student Benches"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              size="small"
              inputProps={{ min: 1 }}
              helperText={!isEdit ? 'Use >1 for a bulk bucket' : ' '}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth
              select
              label="Condition"
              value={form.assetCondition}
              onChange={(e) => set('assetCondition', e.target.value)}
              size="small"
            >
              <MenuItem value="">—</MenuItem>
              {conditions.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              select
              label="Lifecycle Status"
              value={form.assetStatus}
              onChange={(e) => set('assetStatus', e.target.value)}
              size="small"
            >
              {statuses.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        {!isEdit && (
          <Typography variant="caption" sx={{ color: '#8f9bb3', mt: 1, display: 'block' }}>
            Responsibility can be assigned from the tree after creating the asset.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
