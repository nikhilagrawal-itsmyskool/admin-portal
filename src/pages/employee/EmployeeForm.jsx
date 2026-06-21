import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete,
  Chip,
} from '@mui/material';
import { employeeService } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('god') || user?.roles?.includes('admin');

  const [formData, setFormData] = useState({
    name: '',
    familyUniqueNumber: '',
    employeeNumber: '',
    gender: '',
    dob: '',
    mobile: '',
    whatsapp: '',
    email: '',
  });
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
    if (isEdit) {
      loadEmployee();
    }
  }, [id]);

  const loadRoles = async () => {
    try {
      const data = await employeeService.listRoles();
      setAllRoles(data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const employee = await employeeService.getEmployee(id);
      setFormData({
        name: employee.name || '',
        familyUniqueNumber: employee.familyUniqueNumber || '',
        employeeNumber: employee.employeeNumber || '',
        gender: employee.gender || '',
        dob: employee.dob ? String(employee.dob).slice(0, 10) : '',
        mobile: employee.mobile || '',
        whatsapp: employee.whatsapp || '',
        email: employee.email || '',
      });
      setSelectedRoles(employee.roles || []);
    } catch (err) {
      setError('Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Required fields always sent; optional fields only when non-empty.
      const payload = {
        name: formData.name,
        familyUniqueNumber: formData.familyUniqueNumber,
        roleIds: selectedRoles.map((r) => r.uuid),
      };
      ['employeeNumber', 'gender', 'dob', 'mobile', 'whatsapp', 'email'].forEach((key) => {
        if (formData[key] !== '' && formData[key] != null) payload[key] = formData[key];
      });

      if (isEdit) {
        await employeeService.updateEmployee(id, payload);
      } else {
        await employeeService.createEmployee(payload);
      }
      navigate('/employees');
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save employee';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert severity="warning">You do not have permission to manage employees.</Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isEdit ? 'Edit Employee' : 'Add New Employee'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Login ID (Family Unique Number)"
                  name="familyUniqueNumber"
                  value={formData.familyUniqueNumber}
                  onChange={handleChange}
                  required
                  helperText="Used as the employee's login username."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Employee Number"
                  name="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  {GENDERS.map((g) => (
                    <MenuItem key={g.value} value={g.value}>
                      {g.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="WhatsApp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={allRoles}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                  value={selectedRoles}
                  onChange={(_e, value) => setSelectedRoles(value)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option.name} size="small" {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Roles" placeholder="Assign roles" />
                  )}
                />
              </Grid>
              {!isEdit && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    A login will be created automatically with the default password{' '}
                    <strong>Itsmyskool@123</strong>. The employee must change it on first login.
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/employees')} disabled={saving}>
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
