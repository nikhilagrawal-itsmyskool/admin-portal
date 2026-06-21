import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import { Person as PersonIcon, Clear as ClearIcon } from '@mui/icons-material';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import { assetService } from '../../../services/assetService';

// Assign / clear the person responsible for an asset. Clearing reverts the node
// to inheriting responsibility from its nearest ancestor.
export default function ResponsibilityDialog({ open, onClose, onSaved, asset }) {
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null); // { uuid, name } chosen now, or null = cleared
  const [touched, setTouched] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [empSearchOpen, setEmpSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && asset) {
      setTouched(false);
      setSelected(null);
      setRemarks(asset.responsibilityRemarks || '');
      setError('');
      loadCurrent();
    }
  }, [open, asset]);

  const loadCurrent = async () => {
    try {
      const data = await assetService.getResponsibility(asset.uuid);
      setCurrent(data);
    } catch (err) {
      setCurrent(null);
    }
  };

  const handleSelect = (employee) => {
    setSelected({ uuid: employee.uuid, name: employee.name });
    setTouched(true);
  };

  const handleClear = () => {
    setSelected(null);
    setTouched(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // If the user picked someone -> set explicit owner. If they cleared -> send null.
      const responsibleId = touched ? (selected ? selected.uuid : null) : (asset.responsibleId || null);
      await assetService.setResponsibility(asset.uuid, { responsibleId, remarks });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update responsibility');
    } finally {
      setSaving(false);
    }
  };

  // What will be shown as the "explicit owner" row.
  const explicitOwner = touched
    ? selected
    : (asset?.responsibleId ? { uuid: asset.responsibleId, name: asset.responsibleName } : null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Responsibility — {asset?.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {current && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f7f9fc', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
              Currently effective
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {current.responsibilitySource === 'none' ? (
                <Typography variant="body2">No one assigned (and nothing to inherit)</Typography>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    icon={<PersonIcon />}
                    label={current.effectiveResponsibleName || current.effectiveResponsibleId}
                    size="small"
                    color={current.isDelegated ? 'warning' : 'primary'}
                  />
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
                    {current.responsibilitySource === 'self'
                      ? (current.isDelegated ? 'delegated here' : 'assigned here')
                      : 'inherited from a parent'}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Assign an explicit owner
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<PersonIcon />} onClick={() => setEmpSearchOpen(true)}>
            {explicitOwner ? 'Change person' : 'Select person'}
          </Button>
          {explicitOwner && (
            <>
              <Chip label={explicitOwner.name || explicitOwner.uuid} onDelete={handleClear} />
              <Button size="small" startIcon={<ClearIcon />} onClick={handleClear}>
                Clear (inherit)
              </Button>
            </>
          )}
        </Stack>

        <TextField
          fullWidth
          label="Remarks (e.g. reason for delegation)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          size="small"
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>

      <EmployeeSearchDialog
        open={empSearchOpen}
        onClose={() => setEmpSearchOpen(false)}
        onSelect={handleSelect}
      />
    </Dialog>
  );
}
