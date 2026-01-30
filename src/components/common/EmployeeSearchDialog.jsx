import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';

export default function EmployeeSearchDialog({ open, onClose, onSelect }) {
  const [name, setName] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (open) {
      loadDepartments();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setName('');
      setSelectedDepartment(null);
      setEmployees([]);
      setError('');
      setSearched(false);
    }
  }, [open]);

  const loadDepartments = async () => {
    try {
      const data = await employeeService.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleSearch = async () => {
    if (!name && !selectedDepartment) {
      setError('Please enter a name or select a department');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = {};
      if (name) params.name = name;
      if (selectedDepartment) params.department_id = selectedDepartment.uuid;

      const data = await employeeService.searchEmployees(params);
      setEmployees(data);
    } catch (err) {
      setError('Failed to search employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (employee) => {
    onSelect(employee);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Search Employee</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Employee Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              size="small"
              placeholder="Enter employee name..."
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <Autocomplete
              options={departments}
              getOptionLabel={(option) => option.name || ''}
              value={selectedDepartment}
              onChange={(e, newValue) => setSelectedDepartment(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Department" size="small" placeholder="Select department..." />
              )}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Search
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && searched && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.uuid}>
                      <TableCell>{employee.employee_id || employee.uuid}</TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.department_name}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSelect(employee)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
