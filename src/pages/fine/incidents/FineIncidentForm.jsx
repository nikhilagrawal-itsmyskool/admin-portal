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
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { fineService } from '../../../services/fineService';
import { useAuth } from '../../../context/AuthContext';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

const CATEGORY_OPTIONS = [
  { value: 'library', label: 'Library' },
  { value: 'infrastructure_movable', label: 'Infrastructure (Movable)' },
  { value: 'infrastructure_immovable', label: 'Infrastructure (Immovable)' },
  { value: 'library_books', label: 'Library Books' },
  { value: 'medical', label: 'Medical' },
  { value: 'labs', label: 'Labs' },
];

export default function FineIncidentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    incidentDate: new Date().toISOString().split('T')[0],
    category: '',
    personType: 'student',
    personId: '',
    personName: '',
    description: '',
    suggestedFineAmount: '',
    reportedById: user?.id || '',
    reportedByName: user?.displayName || '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [reporterDialogOpen, setReporterDialogOpen] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadIncident();
    }
  }, [id]);

  const loadIncident = async () => {
    setLoading(true);
    try {
      const data = await fineService.getIncidentById(id);
      setFormData({
        incidentDate: data.incidentDate?.split('T')[0] || '',
        category: data.category || '',
        personType: data.personType || 'student',
        personId: data.personId || '',
        personName: data.personName || '',
        description: data.description || '',
        suggestedFineAmount: data.suggestedFineAmount ?? '',
      });
    } catch {
      setError('Failed to load incident');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePersonTypeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      personType: e.target.value,
      personId: '',
      personName: '',
    }));
  };

  const handleStudentSelect = (student) => {
    setFormData((prev) => ({
      ...prev,
      personId: student.uuid,
      personName: student.name,
    }));
    setStudentDialogOpen(false);
  };

  const handleEmployeeSelect = (employee) => {
    setFormData((prev) => ({
      ...prev,
      personId: employee.uuid,
      personName: employee.name,
    }));
    setEmployeeDialogOpen(false);
  };

  const handleReporterSelect = (employee) => {
    setFormData((prev) => ({
      ...prev,
      reportedById: employee.uuid,
      reportedByName: employee.name,
    }));
    setReporterDialogOpen(false);
  };

  const clearPerson = () => {
    setFormData((prev) => ({ ...prev, personId: '', personName: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        incidentDate: formData.incidentDate,
        category: formData.category,
        personType: formData.personType,
        personId: formData.personId || undefined,
        description: formData.description,
        suggestedFineAmount: formData.suggestedFineAmount
          ? parseFloat(formData.suggestedFineAmount)
          : undefined,
        ...(!isEdit && formData.reportedById ? { reportedById: formData.reportedById } : {}),
      };

      if (isEdit) {
        await fineService.updateIncident(id, payload);
        navigate(`/fine/incidents/${id}`);
      } else {
        const result = await fineService.createIncident(payload);
        navigate(`/fine/incidents/${result.uuid}`);
      }
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save incident';
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
        {isEdit ? 'Edit Incident' : 'Report Incident'}
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
                  label="Incident Date"
                  name="incidentDate"
                  type="date"
                  value={formData.incidentDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Person Type"
                  name="personType"
                  value={formData.personType}
                  onChange={handlePersonTypeChange}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="employee">Employee</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={formData.personType === 'student' ? 'Student' : 'Employee'}
                  value={formData.personName}
                  placeholder={`Click search to select ${formData.personType}...`}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        {formData.personName && (
                          <IconButton size="small" onClick={clearPerson}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() =>
                            formData.personType === 'student'
                              ? setStudentDialogOpen(true)
                              : setEmployeeDialogOpen(true)
                          }
                        >
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Suggested Fine Amount (₹)"
                  name="suggestedFineAmount"
                  type="number"
                  value={formData.suggestedFineAmount}
                  onChange={handleChange}
                  inputProps={{ step: '0.01', min: 0 }}
                />
              </Grid>
              {!isEdit && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Reported By"
                    value={formData.reportedByName}
                    placeholder="Logged-in user"
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          {formData.reportedByName !== (user?.displayName || '') && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  reportedById: user?.id || '',
                                  reportedByName: user?.displayName || '',
                                }))
                              }
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton size="small" onClick={() => setReporterDialogOpen(true)}>
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Report Incident'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      isEdit ? navigate(`/fine/incidents/${id}`) : navigate('/fine/incidents')
                    }
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

      <StudentSearchDialog
        open={studentDialogOpen}
        onClose={() => setStudentDialogOpen(false)}
        onSelect={handleStudentSelect}
      />

      <EmployeeSearchDialog
        open={employeeDialogOpen}
        onClose={() => setEmployeeDialogOpen(false)}
        onSelect={handleEmployeeSelect}
      />

      <EmployeeSearchDialog
        open={reporterDialogOpen}
        onClose={() => setReporterDialogOpen(false)}
        onSelect={handleReporterSelect}
      />
    </Box>
  );
}
