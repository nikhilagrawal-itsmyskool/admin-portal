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
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';

export default function StudentSearchDialog({ open, onClose, onSelect }) {
  const [name, setName] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setName('');
      setSelectedClass(null);
      setStudents([]);
      setError('');
      setSearched(false);
    }
  }, [open]);

  const loadClasses = async () => {
    try {
      const data = await classService.getClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const handleSearch = async () => {
    if (!name && !selectedClass) {
      setError('Please enter a name or select a class');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = {};
      if (name) params.name = name;
      if (selectedClass) params.classId = selectedClass.uuid;

      const data = await studentService.searchStudents(params);
      setStudents(data);
    } catch (err) {
      setError('Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (student) => {
    onSelect(student);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Search Student</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              size="small"
              placeholder="Enter student name..."
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <Autocomplete
              options={classes}
              getOptionLabel={(option) => option.name || ''}
              value={selectedClass}
              onChange={(e, newValue) => setSelectedClass(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Class" size="small" placeholder="Select class..." />
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
                  <TableCell>Class</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.uuid}>
                      <TableCell>{student.admission_no || student.uuid}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.class_name}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSelect(student)}
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
