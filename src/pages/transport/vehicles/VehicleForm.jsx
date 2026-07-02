import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, CircularProgress,
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';
import { transportService } from '../../../services/transportService';

const VEHICLE_TYPES = [
  { value: 'bus', label: 'Bus' },
  { value: 'van', label: 'Van' },
  { value: 'other', label: 'Other' },
];
const OWNERSHIP = [
  { value: 'owned', label: 'School Owned' },
  { value: 'contract', label: 'On Contract' },
];

const empty = {
  vehicleType: 'van', makeModel: '', registrationNumber: '', ownership: 'owned',
  capacity: '', driverName: '', driverPhone: '', conductorName: '', conductorPhone: '',
};

export default function VehicleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const v = await transportService.getVehicle(id);
        setForm({
          vehicleType: v.vehicleType || 'van',
          makeModel: v.makeModel || '',
          registrationNumber: v.registrationNumber || '',
          ownership: v.ownership || 'owned',
          capacity: v.capacity ?? '',
          driverName: v.driverName || '',
          driverPhone: v.driverPhone || '',
          conductorName: v.conductorName || '',
          conductorPhone: v.conductorPhone || '',
        });
      } catch {
        setError('Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    if (!form.registrationNumber.trim()) { setError('Registration number is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        vehicleType: form.vehicleType,
        makeModel: form.makeModel || null,
        registrationNumber: form.registrationNumber.trim(),
        ownership: form.ownership,
        capacity: form.capacity === '' ? null : Number(form.capacity),
        driverName: form.driverName || null,
        driverPhone: form.driverPhone || null,
        conductorName: form.conductorName || null,
        conductorPhone: form.conductorPhone || null,
      };
      if (isEdit) await transportService.updateVehicle(id, payload);
      else await transportService.createVehicle(payload);
      navigate('/transport/vehicles');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/transport/vehicles')}>Back</Button>
        <Typography variant="h4">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select label="Type" value={form.vehicleType} onChange={set('vehicleType')} size="small">
                {VEHICLE_TYPES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Registration Number" value={form.registrationNumber} onChange={set('registrationNumber')} size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select label="Ownership" value={form.ownership} onChange={set('ownership')} size="small">
                {OWNERSHIP.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Make / Model (free text)" value={form.makeModel} onChange={set('makeModel')} size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Capacity (optional)" value={form.capacity} onChange={set('capacity')} size="small" />
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1, color: '#8f9bb3' }}>Driver</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Driver Name" value={form.driverName} onChange={set('driverName')} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Driver Phone" value={form.driverPhone} onChange={set('driverPhone')} size="small" />
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1, color: '#8f9bb3' }}>Conductor</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Conductor Name" value={form.conductorName} onChange={set('conductorName')} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Conductor Phone" value={form.conductorPhone} onChange={set('conductorPhone')} size="small" />
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Vehicle'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
