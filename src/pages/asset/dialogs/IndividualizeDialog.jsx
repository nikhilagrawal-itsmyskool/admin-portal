import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { assetService } from '../../../services/assetService';

// Tag N items out of a quantity bucket into uniquely-coded individual assets.
export default function IndividualizeDialog({ open, onClose, onDone, asset }) {
  const [count, setCount] = useState(1);
  const [codePrefix, setCodePrefix] = useState('AST');
  const [suggested, setSuggested] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && asset) {
      setCount(1);
      setCodePrefix('AST');
      setError('');
      loadSuggestion('AST');
    }
  }, [open, asset]);

  const loadSuggestion = async (prefix) => {
    try {
      const data = await assetService.suggestCode(prefix);
      setSuggested(data.code);
    } catch {
      setSuggested('');
    }
  };

  const handlePrefixChange = (value) => {
    setCodePrefix(value);
    if (value.trim()) loadSuggestion(value.trim());
  };

  const handleSubmit = async () => {
    const n = Number(count);
    if (n < 1 || n > asset.quantity) {
      setError(`Count must be between 1 and ${asset.quantity}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await assetService.individualize(asset.uuid, { count: n, codePrefix: codePrefix.trim() || undefined });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to individualize');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Individualize — {asset?.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" sx={{ mb: 2, color: '#8f9bb3' }}>
          Bucket currently holds <strong>{asset?.quantity}</strong>. Tagging items creates uniquely-coded
          assets and reduces the bucket by the same amount.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="How many to tag"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              size="small"
              inputProps={{ min: 1, max: asset?.quantity }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Code prefix"
              value={codePrefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              size="small"
            />
          </Grid>
        </Grid>
        {suggested && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f7f9fc', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Next code will start at</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{suggested}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Tagging...' : 'Tag items'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
