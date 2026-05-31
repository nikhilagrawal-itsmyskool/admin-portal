import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert,
  CircularProgress, MenuItem, IconButton, Table, TableBody, TableCell,
  TableHead, TableRow,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';

export default function UniformSetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allItems, setAllItems] = useState([]);

  const [form, setForm] = useState({ name: '', gender: '', description: '' });
  const [lines, setLines] = useState([{ itemId: '', quantity: 1 }]);

  useEffect(() => {
    loadItems();
    if (isEdit) loadSet();
  }, []);

  const loadItems = async () => {
    try {
      const data = await uniformService.getItems();
      setAllItems(data);
    } catch {}
  };

  const loadSet = async () => {
    try {
      const data = await uniformService.getSetById(id);
      setForm({ name: data.name, gender: data.gender || '', description: data.description || '' });
      setLines(data.items.map(i => ({ itemId: i.itemId, quantity: i.quantity })));
    } catch {
      setError('Failed to load set');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => setLines(prev => [...prev, { itemId: '', quantity: 1 }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    const validLines = lines.filter(l => l.itemId && l.quantity > 0);
    if (validLines.length === 0) { setError('Add at least one item'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        gender: form.gender || undefined,
        items: validLines.map((l, idx) => ({ itemId: l.itemId, quantity: parseInt(l.quantity), sortOrder: idx })),
      };
      if (isEdit) {
        await uniformService.updateSet(id, payload);
      } else {
        await uniformService.createSet(payload);
      }
      navigate('/uniform/sets');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save set');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{isEdit ? 'Edit Set' : 'Create Set'}</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField fullWidth label="Set Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="For (Gender)" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="male">Boys</MenuItem>
                  <MenuItem value="female">Girls</MenuItem>
                  <MenuItem value="unisex">Unisex</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Items in Set</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add Item</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <TableCell sx={{ fontWeight: 600, width: '70%' }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '20%' }}>Qty</TableCell>
                  <TableCell width={40} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField select fullWidth size="small" value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)}>
                        <MenuItem value="">Select item...</MenuItem>
                        {allItems.map(item => <MenuItem key={item.uuid} value={item.uuid}>{item.name}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" fullWidth size="small" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} inputProps={{ min: 1 }} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Set'}</Button>
          <Button variant="outlined" onClick={() => navigate('/uniform/sets')}>Cancel</Button>
        </Box>
      </form>
    </Box>
  );
}
