import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import { assetService } from '../../../services/assetService';

const ROOT_OPTION = { uuid: '__root__', label: '(Root — no parent)' };

// Move a whole node, or split part of a quantity bucket, to another parent.
export default function MoveAssetDialog({ open, onClose, onMoved, asset, candidates }) {
  const isBucket = asset && !asset.assetCode && asset.quantity > 1;
  const [target, setTarget] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && asset) {
      setTarget(null);
      setQuantity(asset.quantity || 1);
      setReason('');
      setError('');
    }
  }, [open, asset]);

  const options = [ROOT_OPTION, ...candidates.map((c) => ({ ...c, label: `${c.name} (${c.typeLabel || c.typeCode || 'asset'})` }))];

  const handleMove = async () => {
    if (!target) {
      setError('Select a destination');
      return;
    }
    const qty = Number(quantity);
    if (isBucket && (qty < 1 || qty > asset.quantity)) {
      setError(`Quantity must be between 1 and ${asset.quantity}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await assetService.moveAsset(asset.uuid, {
        toParentId: target.uuid === '__root__' ? null : target.uuid,
        quantity: isBucket ? qty : undefined,
        reason: reason || undefined,
      });
      onMoved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to move asset');
    } finally {
      setSaving(false);
    }
  };

  const isPartial = isBucket && Number(quantity) < asset.quantity;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Move — {asset?.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Autocomplete
          options={options}
          getOptionLabel={(o) => o.label || ''}
          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
          value={target}
          onChange={(e, v) => setTarget(v)}
          renderInput={(params) => <TextField {...params} label="Move to" size="small" sx={{ mt: 1 }} />}
        />

        {isBucket && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Quantity to move"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              size="small"
              inputProps={{ min: 1, max: asset.quantity }}
              helperText={`Bucket has ${asset.quantity}. ${isPartial ? 'Partial move will split the bucket.' : 'Moving the whole bucket.'}`}
            />
          </Box>
        )}

        <TextField
          fullWidth
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          size="small"
          sx={{ mt: 2 }}
        />

        {asset?.assetCode && (
          <Typography variant="caption" sx={{ color: '#8f9bb3', mt: 1, display: 'block' }}>
            This is a coded individual item ({asset.assetCode}); it moves as a whole.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleMove} disabled={saving}>
          {saving ? 'Moving...' : 'Move'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
