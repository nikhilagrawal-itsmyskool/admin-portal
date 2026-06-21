import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/employeeService';
import { authService } from '../services/authService';

const GENDER_LABELS = { M: 'Male', F: 'Female', O: 'Other' };

function DetailRow({ label, value }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
        {label}
      </Typography>
      <Typography variant="body1">{value || '—'}</Typography>
    </Grid>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const isStudent = user?.type === 'student';

  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Only employees have a fetchable detail record; students show token info only.
    if (user?.type === 'employee' && user?.employeeId) {
      loadEmployeeDetails(user.employeeId);
    }
  }, [user]);

  const loadEmployeeDetails = async (employeeId) => {
    setLoadingDetails(true);
    try {
      const data = await employeeService.getEmployee(employeeId);
      setDetails(data);
    } catch (err) {
      // Non-fatal — fall back to token info only.
      setDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('All password fields are required.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(user.type, form.currentPassword, form.newPassword);
      setSuccess('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to change password';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Profile
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Details
          </Typography>

          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              <DetailRow label="Name" value={details?.name || user?.displayName} />
              <DetailRow label="Login ID" value={user?.loginName} />
              <DetailRow
                label="Account Type"
                value={isStudent ? 'Student' : 'Employee'}
              />
              <DetailRow label="School" value={user?.schoolCode} />

              {!isStudent && details && (
                <>
                  <DetailRow label="Employee Number" value={details.employeeNumber} />
                  <DetailRow label="Gender" value={GENDER_LABELS[details.gender] || details.gender} />
                  <DetailRow
                    label="Date of Birth"
                    value={details.dob ? String(details.dob).slice(0, 10) : ''}
                  />
                  <DetailRow label="Mobile" value={details.mobile} />
                  <DetailRow label="WhatsApp" value={details.whatsapp} />
                  <DetailRow label="Email" value={details.email} />
                </>
              )}

              {!isStudent && user?.roles?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#8f9bb3', display: 'block', mb: 0.5 }}>
                    Roles
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {user.roles.map((role) => (
                      <Chip key={role} label={role} size="small" />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Change Password
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6} />
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving...' : 'Change Password'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
