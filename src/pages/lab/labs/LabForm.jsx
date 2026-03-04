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
  InputAdornment,
  IconButton,
  Paper,
} from '@mui/material';
import { PersonSearch as PersonSearchIcon } from '@mui/icons-material';
import { labService } from '../../../services/labService';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function LabForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    inChargeId: '',
    status: 'active',
  });
  const [labTypes, setLabTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inChargeEmployee, setInChargeEmployee] = useState(null);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  useEffect(() => {
    loadLabTypes();
    if (isEdit) {
      loadLab();
    }
  }, [id]);

  const loadLabTypes = async () => {
    try {
      const data = await labService.getLabTypes();
      setLabTypes(data.labTypes || []);
    } catch (err) {
      console.error('Failed to load lab types:', err);
    }
  };

  const loadLab = async () => {
    setLoading(true);
    try {
      const lab = await labService.getLabById(id);
      setFormData({
        name: lab.name || '',
        type: lab.type || '',
        location: lab.location || '',
        inChargeId: lab.inChargeId || '',
        status: lab.status || 'active',
      });
      if (lab.inChargeId) {
        setInChargeEmployee({
          uuid: lab.inChargeId,
          name: lab.inChargeName || 'Unknown',
        });
      }
    } catch (err) {
      setError('Failed to load lab');
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
      const payload = { ...formData };
      if (!payload.inChargeId) delete payload.inChargeId;

      if (isEdit) {
        await labService.updateLab(id, payload);
      } else {
        await labService.createLab(payload);
      }
      navigate('/lab/labs');
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save lab';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

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
        {isEdit ? 'Edit Lab' : 'Add New Lab'}
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
                  label="Lab Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Lab Type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  {labTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Building A, Room 101"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box>
                  <TextField
                    fullWidth
                    label="In-Charge"
                    value={inChargeEmployee ? inChargeEmployee.name : ''}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setEmployeeSearchOpen(true)}
                            edge="end"
                          >
                            <PersonSearchIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Click search to find employee..."
                  />
                  {inChargeEmployee && (
                    <Paper variant="outlined" sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Name:</strong> {inChargeEmployee.name}
                      </Typography>
                      {inChargeEmployee.employeeId && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>ID:</strong> {inChargeEmployee.employeeId}
                        </Typography>
                      )}
                    </Paper>
                  )}
                </Box>
              </Grid>
              {isEdit && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="deleted">Deleted</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lab'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/lab/labs')}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <EmployeeSearchDialog
        open={employeeSearchOpen}
        onClose={() => setEmployeeSearchOpen(false)}
        onSelect={(employee) => {
          setInChargeEmployee(employee);
          setFormData((prev) => ({ ...prev, inChargeId: employee.uuid }));
        }}
      />
    </Box>
  );
}
