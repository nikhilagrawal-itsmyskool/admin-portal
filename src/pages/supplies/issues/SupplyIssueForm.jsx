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
import { suppliesService } from '../../../services/suppliesService';
import { classService } from '../../../services/classService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function SupplyIssueForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    itemId: '',
    issueDate: new Date().toISOString().split('T')[0],
    quantity: '1',
    issueType: '',
    issuedTo: '',
    issuedToType: '',
    issuedToId: '',
    purpose: '',
    expectedReturnDate: '',
  });
  const [items, setItems] = useState([]);
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
      const itemsData = await loadData();
      if (isEdit) loadIssue(itemsData);
    };
    init();
  }, [id]);

  const loadData = async () => {
    try {
      const [itemsData, conditionsData, classesData] = await Promise.all([
        suppliesService.getItems(),
        suppliesService.getConditions(),
        classService.getClasses(),
      ]);
      setItems(itemsData);
      setIssueTypes(conditionsData.issueTypes || []);
      setClasses(classesData);
      return itemsData;
    } catch (err) {
      console.error('Failed to load data:', err);
      return [];
    }
  };

  const loadIssue = async (itemsData) => {
    setLoading(true);
    try {
      const issue = await suppliesService.getIssueById(id);
      setFormData({
        itemId: issue.itemId || '',
        issueDate: issue.issueDate?.split('T')[0] || '',
        quantity: issue.quantity || '1',
        issueType: issue.issueType || '',
        issuedTo: issue.issuedToName || issue.issuedTo || '',
        issuedToType: issue.issuedToType || '',
        issuedToId: issue.issuedToId || '',
        purpose: issue.purpose || '',
        expectedReturnDate: issue.expectedReturnDate?.split('T')[0] || '',
      });
      const item = itemsData.find((i) => i.uuid === issue.itemId);
      if (item) setSelectedItem(item);
    } catch (err) {
      setError('Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); setError(''); };

  const handleItemChange = (_, newValue) => {
    setSelectedItem(newValue);
    setFormData((prev) => ({ ...prev, itemId: newValue?.uuid || '' }));
  };

  const handleIssuedToTypeChange = (e) => {
    setFormData((prev) => ({ ...prev, issuedToType: e.target.value, issuedToId: '', issuedTo: '' }));
    setSelectedClass(null);
    setError('');
  };

  const handleStudentSelect = (student) => setFormData((prev) => ({ ...prev, issuedToId: student.uuid, issuedTo: student.name }));
  const handleEmployeeSelect = (employee) => setFormData((prev) => ({ ...prev, issuedToId: employee.uuid, issuedTo: employee.name }));
  const handleClassChange = (_, newValue) => {
    setSelectedClass(newValue);
    setFormData((prev) => ({ ...prev, issuedToId: newValue?.uuid || '', issuedTo: newValue?.name || '' }));
  };
  const clearIssuedTo = () => { setFormData((prev) => ({ ...prev, issuedToId: '', issuedTo: '' })); setSelectedClass(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...formData, quantity: parseInt(formData.quantity, 10) || 1 };
      if (isEdit) await suppliesService.updateIssue(id, payload);
      else await suppliesService.createIssue(payload);
      navigate('/supplies/issues');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save issue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const renderIssuedToField = () => {
    if (!formData.issuedToType) return null;
    if (formData.issuedToType === 'class') {
      return (
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={classes}
            getOptionLabel={(o) => o.name || ''}
            value={selectedClass || classes.find((c) => c.uuid === formData.issuedToId) || null}
            onChange={handleClassChange}
            renderInput={(params) => <TextField {...params} label="Select Class" placeholder="Search class..." />}
          />
        </Grid>
      );
    }
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
                {formData.issuedTo && <IconButton size="small" onClick={clearIssuedTo}><ClearIcon fontSize="small" /></IconButton>}
                <IconButton size="small" onClick={() => (formData.issuedToType === 'student' ? setStudentDialogOpen(true) : setEmployeeDialogOpen(true))}><SearchIcon fontSize="small" /></IconButton>
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
      <Typography variant="h4" sx={{ mb: 3 }}>{isEdit ? 'Edit Issue' : 'Issue Supply Item'}</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={items}
                  getOptionLabel={(o) => `${o.name} (Stock: ${o.currentStock})`}
                  value={selectedItem}
                  onChange={handleItemChange}
                  disabled={isEdit}
                  renderInput={(params) => <TextField {...params} label="Item" required />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Issue Date" name="issueDate" type="date" value={formData.issueDate} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} inputProps={{ min: 1, max: selectedItem?.currentStock || 999 }} required helperText={selectedItem ? `Available: ${selectedItem.currentStock}` : ''} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Issue Type" name="issueType" value={formData.issueType} onChange={handleChange} required>
                  {issueTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Issued To Type" name="issuedToType" value={formData.issuedToType} onChange={handleIssuedToTypeChange}>
                  <MenuItem value="">Not Specified</MenuItem>
                  {issuedToTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              </Grid>
              {renderIssuedToField()}
              <Grid item xs={12}>
                <TextField fullWidth label="Purpose" name="purpose" value={formData.purpose} onChange={handleChange} multiline rows={2} placeholder="Describe the purpose of issuing..." />
              </Grid>
              {formData.issueType === 'individual' && (
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Expected Return Date" name="expectedReturnDate" type="date" value={formData.expectedReturnDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Issue Item'}</Button>
                  <Button variant="outlined" onClick={() => navigate('/supplies/issues')} disabled={saving}>Cancel</Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <StudentSearchDialog open={studentDialogOpen} onClose={() => setStudentDialogOpen(false)} onSelect={handleStudentSelect} />
      <EmployeeSearchDialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} onSelect={handleEmployeeSelect} />
    </Box>
  );
}
