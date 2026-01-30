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
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Paper,
} from '@mui/material';
import { PersonSearch as PersonSearchIcon } from '@mui/icons-material';
import { medicalService } from '../../../services/medicalService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function IssueForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    itemId: '',
    issueDate: new Date().toISOString().split('T')[0],
    entityType: 'student',
    entityId: '',
    quantity: '',
    remarks: '',
    parentConsent: false,
    status: 'active',
  });
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [entityTypes, setEntityTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const itemsData = await loadData();
      if (isEdit) {
        loadIssue(itemsData);
      }
    };
    init();
  }, [id]);

  const loadData = async () => {
    try {
      const [itemsData, unitsData] = await Promise.all([
        medicalService.getItems(),
        medicalService.getUnits(),
      ]);
      setItems(itemsData);
      setEntityTypes(unitsData.entityTypes || ['employee', 'student']);
      return itemsData;
    } catch (err) {
      console.error('Failed to load data:', err);
      return [];
    }
  };

  const loadIssue = async (itemsData) => {
    setLoading(true);
    try {
      const issue = await medicalService.getIssueById(id);
      setFormData({
        itemId: issue.itemId || '',
        issueDate: issue.issueDate?.split('T')[0] || '',
        entityType: issue.entityType || 'student',
        entityId: issue.entityId || '',
        quantity: issue.quantity || '',
        remarks: issue.remarks || '',
        parentConsent: issue.parentConsent || false,
        status: issue.status || 'active',
      });
      const item = itemsData.find((i) => i.uuid === issue.itemId);
      if (item) setSelectedItem(item);

      // Set entity info from issue data for display
      if (issue.entityType === 'student' && issue.entityId) {
        setSelectedStudent({
          uuid: issue.entityId,
          name: issue.entityName || 'Unknown Student',
          admissionNo: issue.entityAdmissionNo || '',
          className: issue.entityClassName || '',
        });
      } else if (issue.entityType === 'employee' && issue.entityId) {
        setSelectedEmployee({
          uuid: issue.entityId,
          name: issue.entityName || 'Unknown Employee',
          employeeId: issue.entityEmployeeId || '',
          departmentName: issue.entityDepartmentName || '',
        });
      }
    } catch (err) {
      setError('Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear selected student/employee if entity type changes
    if (name === 'entityType') {
      setSelectedStudent(null);
      setSelectedEmployee(null);
      setFormData((prev) => ({
        ...prev,
        entityId: '',
        // Clear parent consent when switching to employee
        parentConsent: value === 'student' ? prev.parentConsent : false,
      }));
    }
    setError('');
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setFormData((prev) => ({
      ...prev,
      entityId: student.uuid,
    }));
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setFormData((prev) => ({
      ...prev,
      entityId: employee.uuid,
    }));
  };

  const handleItemChange = (event, newValue) => {
    setSelectedItem(newValue);
    setFormData((prev) => ({ ...prev, itemId: newValue?.uuid || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10) || 0,
        status: formData.status,
      };

      if (isEdit) {
        await medicalService.updateIssue(id, payload);
      } else {
        await medicalService.createIssue(payload);
      }
      navigate('/medical/issues');
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to save issue';
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
        {isEdit ? 'Edit Issue' : 'Issue Medical Item'}
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
                <Autocomplete
                  options={items}
                  getOptionLabel={(option) => `${option.name} (Stock: ${option.currentStock})`}
                  value={selectedItem}
                  onChange={handleItemChange}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField {...params} label="Item" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Issue Date"
                  name="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Issue To"
                  name="entityType"
                  value={formData.entityType}
                  onChange={handleChange}
                  required
                >
                  {entityTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                {formData.entityType === 'student' ? (
                  <Box>
                    <TextField
                      fullWidth
                      label="Student"
                      value={selectedStudent ? `${selectedStudent.name} (${selectedStudent.admissionNo || selectedStudent.uuid})` : ''}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setStudentSearchOpen(true)}
                              edge="end"
                            >
                              <PersonSearchIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      required
                      placeholder="Click search to find student..."
                    />
                    {selectedStudent && (
                      <Paper variant="outlined" sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Name:</strong> {selectedStudent.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Class:</strong> {selectedStudent.className}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>ID:</strong> {selectedStudent.admissionNo || selectedStudent.uuid}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <TextField
                      fullWidth
                      label="Employee"
                      value={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.employeeId || selectedEmployee.uuid})` : ''}
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
                      required
                      placeholder="Click search to find employee..."
                    />
                    {selectedEmployee && (
                      <Paper variant="outlined" sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Name:</strong> {selectedEmployee.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Department:</strong> {selectedEmployee.departmentName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>ID:</strong> {selectedEmployee.employeeId || selectedEmployee.uuid}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: selectedItem?.currentStock || 999 }}
                  required
                  helperText={selectedItem ? `Available: ${selectedItem.currentStock}` : ''}
                />
              </Grid>
              {formData.entityType === 'student' && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    For students, please ensure parent/guardian consent has been obtained before issuing medical items.
                  </Alert>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="parentConsent"
                        checked={formData.parentConsent}
                        onChange={handleChange}
                      />
                    }
                    label="Parent/Guardian Consent Obtained"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  placeholder="Enter reason for issuing, symptoms, etc."
                />
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
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Issue Item'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/medical/issues')}
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
        open={studentSearchOpen}
        onClose={() => setStudentSearchOpen(false)}
        onSelect={handleStudentSelect}
      />

      <EmployeeSearchDialog
        open={employeeSearchOpen}
        onClose={() => setEmployeeSearchOpen(false)}
        onSelect={handleEmployeeSelect}
      />
    </Box>
  );
}
