import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Alert, Chip,
  Autocomplete, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button,
} from '@mui/material';
import { homeworkService } from '../../services/homeworkService';
import { employeeService } from '../../services/employeeService';
import { academicCalendarService } from '../../services/academicCalendarService';

// Admin/god: override which teacher is the homework class-teacher for a class.
// Resolution is: this override (if set) else the timetable class_teacher. The
// override only affects who can post homework for the class in the teacher PWA.
export default function HomeworkMappingPage() {
  const [years, setYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [yrs, emps] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          employeeService.searchEmployees(),
        ]);
        setYears(Array.isArray(yrs) ? yrs : yrs?.academicYears || []);
        setEmployees(emps || []);
        const cur = await academicCalendarService.getCurrentAcademicYear();
        if (cur?.uuid) setAcademicYearId(cur.uuid);
      } catch {
        setError('Failed to load academic years / employees');
      }
    })();
  }, []);

  useEffect(() => {
    if (!academicYearId) return;
    (async () => {
      setLoading(true); setError('');
      try {
        const data = await homeworkService.getClassTeachers(academicYearId);
        setRows(data || []);
      } catch {
        setError('Failed to load the class-teacher map');
      } finally {
        setLoading(false);
      }
    })();
  }, [academicYearId]);

  const setOverride = async (classId, teacher) => {
    if (!teacher) return;
    setError(''); setSuccess('');
    try {
      const data = await homeworkService.setClassTeacher(classId, { teacherId: teacher.uuid, academicYearId });
      setRows(data || []);
      setSuccess('Override saved');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to set override');
    }
  };

  const clearOverride = async (classId) => {
    setError(''); setSuccess('');
    try {
      const data = await homeworkService.clearClassTeacher(classId, academicYearId);
      setRows(data || []);
      setSuccess('Override cleared');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to clear override');
    }
  };

  const sourceChip = (r) => {
    if (r.source === 'override') return <Chip label="Override" size="small" color="primary" />;
    if (r.source === 'timetable') return <Chip label="From timetable" size="small" variant="outlined" />;
    return <Chip label="Not set" size="small" color="warning" variant="outlined" />;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>Homework class teachers</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Who may post each class's homework. Defaults to the class teacher from the timetable —
        set an override here to hand it to a different teacher.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            select size="small" label="Academic Year" value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)} sx={{ minWidth: 220 }}
          >
            {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}</MenuItem>)}
          </TextField>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Class teacher</TableCell>
                <TableCell>Source</TableCell>
                <TableCell sx={{ minWidth: 260 }}>Set override</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center">No classes found</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.classId}>
                  <TableCell>{r.className}</TableCell>
                  <TableCell>{r.teacherName || <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                  <TableCell>{sourceChip(r)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Autocomplete
                        size="small"
                        sx={{ flex: 1, minWidth: 180 }}
                        options={employees}
                        getOptionLabel={(o) => o.name || ''}
                        isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                        value={null}
                        blurOnSelect
                        onChange={(_, v) => setOverride(r.classId, v)}
                        renderInput={(params) => <TextField {...params} label="Assign teacher" />}
                      />
                      {r.source === 'override' && (
                        <Button size="small" color="error" onClick={() => clearOverride(r.classId)}>Clear</Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
