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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { sportsService } from '../../../services/sportsService';
import { classService } from '../../../services/classService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import { todayIso } from '../../../utils/date';

export default function SportIssueForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    sportType: '',
    itemId: '',
    issueDate: todayIso(),
    quantity: '1',
    issueType: '',
    issuedTo: '',
    issuedToType: '',
    issuedToId: '',
    purpose: '',
    expectedReturnDate: '',
    status: 'active',
  });
  const [sportTypes, setSportTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedSportType, setSelectedSportType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [issueTypes, setIssueTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const issuedToTypes = [
    { value: 'student', label: 'Student' },
    { value: 'employee', label: 'Employee' },
    { value: 'class', label: 'Class' },
  ];

  useEffect(() => {
    const init = async () => {
      const [sportsData, itemsData] = await loadData();
      if (isEdit) {
        loadIssue(sportsData, itemsData);
      }
    };
    init();
  }, [id]);

  const loadData = async () => {
    try {
      const [typesData, itemsData, conditionsData, classesData] = await Promise.all([
        sportsService.getSportTypes(),
        sportsService.getItems(),
        sportsService.getConditions(),
        classService.getClasses(),
      ]);
      const types = typesData.sportTypes || [];
      setSportTypes(types);
      setItems(itemsData);
      setFilteredItems(itemsData);
      setIssueTypes(conditionsData.issueTypes || []);
      setClasses(classesData);
      return [types, itemsData];
    } catch (err) {
      console.error('Failed to load data:', err);
      return [[], []];
    }
  };

  const loadIssue = async (typesData, itemsData) => {
    setLoading(true);
    try {
      const issue = await sportsService.getIssueById(id);
      setFormData({
        sportType: issue.sportType || '',
        itemId: issue.itemId || '',
        issueDate: issue.issueDate?.split('T')[0] || '',
        quantity: issue.quantity || '1',
        issueType: issue.issueType || '',
        issuedTo: issue.issuedToName || issue.issuedTo || '',
        issuedToType: issue.issuedToType || '',
        issuedToId: issue.issuedToId || '',
        purpose: issue.purpose || '',
        expectedReturnDate: issue.expectedReturnDate?.split('T')[0] || '',
        status: issue.status || 'active',
      });
      const sportType = typesData.find((t) => t.value === issue.sportType);
      if (sportType) {
        setSelectedSportType(sportType);
        setFilteredItems(itemsData.filter((i) => i.sportType === sportType.value));
      }
      const item = itemsData.find((i) => i.uuid === issue.itemId);
      if (item) setSelectedItem(item);
    } catch (err) {
      setError('Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSportChange = (event, newValue) => {
    setSelectedSportType(newValue);
    setSelectedItem(null);
    setFormData((prev) => ({ ...prev, sportType: newValue?.value || '', itemId: '' }));
    if (newValue) {
      setFilteredItems(items.filter((i) => i.sportType === newValue.value));
    } else {
      setFilteredItems(items);
    }
  };

  const handleItemChange = (event, newValue) => {
    setSelectedItem(newValue);
    setFormData((prev) => ({ ...prev, itemId: newValue?.uuid || '' }));
  };

  const handleIssuedToTypeChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      issuedToType: value,
      issuedToId: '',
      issuedTo: '',
    }));
    setSelectedClass(null);
    setError('');
  };

  const handleStudentSelect = (student) => {
    setFormData((prev) => ({
      ...prev,
      issuedToId: student.uuid,
      issuedTo: student.name,
    }));
  };

  const handleEmployeeSelect = (employee) => {
    setFormData((prev) => ({
      ...prev,
      issuedToId: employee.uuid,
      issuedTo: employee.name,
    }));
  };

  const handleClassChange = (event, newValue) => {
    setSelectedClass(newValue);
    setFormData((prev) => ({
      ...prev,
      issuedToId: newValue?.uuid || '',
      issuedTo: newValue?.name || '',
    }));
  };

  const clearIssuedTo = () => {
    setFormData((prev) => ({
      ...prev,
      issuedToId: '',
      issuedTo: '',
    }));
    setSelectedClass(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity, 10) || 1,
      };

      if (isEdit) {
        await sportsService.updateIssue(id, payload);
      } else {
        await sportsService.createIssue(payload);
      }
      navigate('/sports/issues');
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

  const renderIssuedToField = () => {
    if (!formData.issuedToType) {
      return null;
    }

    if (formData.issuedToType === 'class') {
      return (
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={classes}
            getOptionLabel={(option) => option.name || ''}
            value={selectedClass || classes.find((c) => c.uuid === formData.issuedToId) || null}
            onChange={handleClassChange}
            renderInput={(params) => (
              <TextField {...params} label="Select Class" placeholder="Search class..." />
            )}
          />
        </Grid>
      );
    }

    // Student or Employee - show read-only field with search button
    return (
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={formData.issuedToType === 'student' ? 'Student' : 'Employee'}
          value={formData.issuedTo}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                {formData.issuedTo && (
                  <IconButton size="small" onClick={clearIssuedTo}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() =>
                    formData.issuedToType === 'student'
                      ? setStudentDialogOpen(true)
                      : setEmployeeDialogOpen(true)
                  }
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          placeholder={`Click search to select ${formData.issuedToType}...`}
        />
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isEdit ? 'Edit Issue' : 'Issue Sport Item'}
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
                  options={sportTypes}
                  getOptionLabel={(option) => option.label || ''}
                  isOptionEqualToValue={(o, v) => o.value === v.value}
                  value={selectedSportType}
                  onChange={handleSportChange}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField {...params} label="Sport" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={filteredItems}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Issue Type"
                  name="issueType"
                  value={formData.issueType}
                  onChange={handleChange}
                  required
                >
                  {issueTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Issued To Type"
                  name="issuedToType"
                  value={formData.issuedToType}
                  onChange={handleIssuedToTypeChange}
                >
                  <MenuItem value="">Not Specified</MenuItem>
                  {issuedToTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {renderIssuedToField()}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  multiline
                  rows={2}
                  placeholder="Describe the purpose of issuing..."
                />
              </Grid>
              {formData.issueType === 'individual' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expected Return Date"
                    name="expectedReturnDate"
                    type="date"
                    value={formData.expectedReturnDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              )}
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
                    onClick={() => navigate('/sports/issues')}
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
    </Box>
  );
}
