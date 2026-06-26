import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Grid,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { studentService } from '../../services/studentService';

/**
 * Dual-mode promotion dialog.
 *  - When `selectedStudentIds` is non-empty: promotes exactly those students into the
 *    chosen target class+year (POST /promote).
 *  - Otherwise: promotes a whole source class into a target class+year (POST /promote-class).
 */
export default function PromoteDialog({
  open,
  onClose,
  classes = [],
  years = [],
  selectedStudentIds = [],
  defaultFromYear = null,
  defaultFromClass = null,
  onDone,
}) {
  const bulkSelection = selectedStudentIds.length > 0;

  const [fromYear, setFromYear] = useState(null);
  const [toYear, setToYear] = useState(null);
  const [fromClass, setFromClass] = useState(null);
  const [toClass, setToClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setFromYear(defaultFromYear || null);
      setToYear(null);
      setFromClass(defaultFromClass || null);
      setToClass(null);
      setError('');
      setResult(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    if (!toYear || !toClass) {
      setError('Select the target academic year and class.');
      return;
    }
    if (!bulkSelection && (!fromYear || !fromClass)) {
      setError('Select the source academic year and class.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (bulkSelection) {
        res = await studentService.promote({
          academicYearFromId: fromYear?.uuid,
          academicYearToId: toYear.uuid,
          items: selectedStudentIds.map((id) => ({ studentId: id, toClassId: toClass.uuid })),
        });
      } else {
        res = await studentService.promoteClass({
          fromClassId: fromClass.uuid,
          academicYearFromId: fromYear.uuid,
          toClassId: toClass.uuid,
          academicYearToId: toYear.uuid,
        });
      }
      setResult(res);
    } catch {
      setError('Promotion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{bulkSelection ? `Promote ${selectedStudentIds.length} selected student(s)` : 'Promote Class'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {result ? (
          <Box sx={{ py: 1 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Promoted {result.done}, skipped {result.skipped}.
            </Alert>
            {result.skipped > 0 && (
              <Typography variant="body2" color="text.secondary">
                Skipped students were already enrolled in the target class/year, or invalid.
              </Typography>
            )}
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                From
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={years}
                getOptionLabel={(o) => o.name || ''}
                value={fromYear}
                onChange={(e, v) => setFromYear(v)}
                renderInput={(p) => <TextField {...p} label="From year" size="small" />}
              />
            </Grid>
            {!bulkSelection && (
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={classes}
                  getOptionLabel={(o) => o.name || ''}
                  value={fromClass}
                  onChange={(e, v) => setFromClass(v)}
                  renderInput={(p) => <TextField {...p} label="From class" size="small" />}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                To
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={years}
                getOptionLabel={(o) => o.name || ''}
                value={toYear}
                onChange={(e, v) => setToYear(v)}
                renderInput={(p) => <TextField {...p} label="To year" size="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={classes}
                getOptionLabel={(o) => o.name || ''}
                value={toClass}
                onChange={(e, v) => setToClass(v)}
                renderInput={(p) => <TextField {...p} label="To class" size="small" />}
              />
            </Grid>
            {bulkSelection && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Tip: set "To class" = the same class for a held-back student to retain them in the new year.
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={result ? onDone : onClose}>{result ? 'Done' : 'Cancel'}</Button>
        {!result && (
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Promoting…' : 'Promote'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
