import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Alert,
  Typography,
} from '@mui/material';
import { studentService } from '../../services/studentService';

/** Assigns one House to every selected student (loops the per-student endpoint). */
export default function AssignHouseDialog({ open, onClose, houses = [], studentIds = [], onDone }) {
  const [house, setHouse] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setHouse(null);
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!house) {
      setError('Select a house.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await Promise.all(studentIds.map((id) => studentService.assignHouse(id, house.uuid)));
      onDone();
    } catch {
      setError('Failed to assign house to some students.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign House</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Assign a house to {studentIds.length} selected student(s).
        </Typography>
        <Autocomplete
          options={houses}
          getOptionLabel={(o) => o.name || ''}
          value={house}
          onChange={(e, v) => setHouse(v)}
          renderInput={(p) => <TextField {...p} label="House" size="small" />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Assigning…' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
