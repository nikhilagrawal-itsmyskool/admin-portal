import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Alert,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { studentService } from '../../../services/studentService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function HouseList() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState({ name: '', code: '', color: '' });
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentService.getHouses();
      setHouses(data.houses || []);
    } catch {
      setError('Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (item) => {
    setForm(item ? { name: item.name, code: item.code, color: item.color || '' } : { name: '', code: '', color: '' });
    setDialog({ open: true, item });
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (dialog.item) {
        await studentService.updateHouse(dialog.item.uuid, { name: form.name, color: form.color });
      } else {
        await studentService.createHouse({ name: form.name, code: form.code || undefined, color: form.color || undefined });
      }
      setDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to save house');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await studentService.deleteHouse(del.item.uuid);
      setDel({ open: false, item: null });
      load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Cannot delete house (students may still be assigned)');
      setDel({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Houses</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog(null)}>
          Add House
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Color</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading…</TableCell>
                </TableRow>
              ) : houses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>No houses yet.</TableCell>
                </TableRow>
              ) : (
                houses.map((h) => (
                  <TableRow key={h.uuid}>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{h.code}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {h.color && (
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: h.color, border: '1px solid #ccc' }} />
                        )}
                        {h.color || '—'}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openDialog(h)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDel({ open: true, item: h })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog.item ? 'Edit House' : 'Add House'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} size="small" />
            </Grid>
            {!dialog.item && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Code (optional)"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  size="small"
                  helperText="Auto-derived from name if left blank"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Color"
                type="color"
                value={form.color || '#3366ff'}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, item: null })}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={del.open}
        title="Delete House"
        message={`Delete ${del.item?.name}? This is blocked if any student is still assigned.`}
        onConfirm={remove}
        onCancel={() => setDel({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
