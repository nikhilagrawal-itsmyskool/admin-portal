import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { employeeService } from '../../../services/employeeService';

const GENDER_LABELS = { M: 'Male', F: 'Female', O: 'Other' };

const fmtDate = (v) => (v ? String(v).slice(0, 10) : '—');

function Field({ label, value }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ color: '#8f9bb3' }}>{label}</Typography>
      <Typography variant="body1">{value || '—'}</Typography>
    </Grid>
  );
}

// Read-only employee profile. Open to anyone with employee.view (incl. a teacher
// viewing themselves). Management actions stay on EmployeeList behind employee.manage.
export default function EmployeeDetailDialog({ open, employee, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && employee) {
      loadDetail();
    } else {
      setDetail(null);
      setError('');
    }
  }, [open, employee]);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await employeeService.getEmployee(employee.uuid);
      setDetail(data);
    } catch (err) {
      // Fall back to the row data we already have if the fetch fails.
      setError(err.response?.data?.error?.description || 'Failed to load full details');
      setDetail(employee);
    } finally {
      setLoading(false);
    }
  };

  const e = detail || employee || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Employee Details{employee ? ` — ${employee.name}` : ''}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Field label="Name" value={e.name} />
            <Field label="Login ID" value={e.familyUniqueNumber} />
            <Field label="Employee Number" value={e.employeeNumber} />
            <Field label="Teacher Code" value={e.code} />
            <Field label="Gender" value={GENDER_LABELS[e.gender] || e.gender} />
            <Field label="Date of Birth" value={fmtDate(e.dob)} />
            <Field label="Mobile" value={e.mobile} />
            <Field label="WhatsApp" value={e.whatsapp} />
            <Field label="Email" value={e.email} />
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Status</Typography>
              <Box>
                <Chip
                  label={e.status === 'deleted' ? 'Deleted' : 'Active'}
                  size="small"
                  color={e.status === 'deleted' ? 'default' : 'success'}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Roles</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {(e.roles || []).length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>None</Typography>
                ) : (
                  e.roles.map((r) => <Chip key={r.uuid || r.code || r.name} label={r.name || r.code} size="small" />)
                )}
              </Stack>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
