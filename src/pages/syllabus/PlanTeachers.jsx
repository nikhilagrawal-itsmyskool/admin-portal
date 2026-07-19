import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Grid, Box, Chip, Autocomplete, TextField, Alert, CircularProgress,
} from '@mui/material';
import { syllabusService } from '../../services/syllabusService';
import { employeeService } from '../../services/employeeService';

// Per-section teacher assignment for a plan. Teachers assigned here see the plan
// (and mark coverage for their section) in the teacher PWA.
export default function PlanTeachers({ syllabusId, grade, canManage }) {
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [grades, teachers, emps] = await Promise.all([
          syllabusService.getGrades(),
          syllabusService.getPlanTeachers(syllabusId),
          employeeService.searchEmployees(),
        ]);
        const g = (grades || []).find((x) => x.grade.toLowerCase() === (grade || '').toLowerCase());
        setSections(g?.sections || []);
        setAssignments(teachers || []);
        setEmployees(emps || []);
      } catch {
        setError('Failed to load teacher assignments');
      } finally {
        setLoading(false);
      }
    })();
  }, [syllabusId, grade]);

  const add = async (classId, teacher) => {
    if (!teacher) return;
    setError('');
    try {
      const created = await syllabusService.assignTeacher(syllabusId, { classId, teacherId: teacher.uuid });
      setAssignments((prev) => (prev.some((a) => a.uuid === created.uuid) ? prev : [...prev, created]));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to assign teacher');
    }
  };

  const remove = async (assignmentId) => {
    setError('');
    try {
      await syllabusService.unassignTeacher(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.uuid !== assignmentId));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to unassign teacher');
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Teachers (per section)</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        ) : sections.length === 0 ? (
          <Typography color="text.secondary" variant="body2">No sections found for grade {grade}.</Typography>
        ) : (
          <Grid container spacing={2}>
            {sections.map((s) => {
              const rows = assignments.filter((a) => a.classId === s.classId);
              const takenIds = new Set(rows.map((a) => a.teacherId));
              const options = employees.filter((e) => !takenIds.has(e.uuid));
              return (
                <Grid item xs={12} md={6} key={s.classId}>
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{s.className}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: rows.length ? 1.5 : 0 }}>
                      {rows.length === 0 && <Typography variant="caption" color="text.secondary">No teacher assigned</Typography>}
                      {rows.map((a) => (
                        <Chip key={a.uuid} size="small" label={a.teacherName || a.teacherId}
                          onDelete={canManage ? () => remove(a.uuid) : undefined} />
                      ))}
                    </Box>
                    {canManage && (
                      <Autocomplete
                        size="small"
                        options={options}
                        getOptionLabel={(o) => o.name || ''}
                        isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                        value={null}
                        blurOnSelect
                        onChange={(_, v) => add(s.classId, v)}
                        renderInput={(params) => <TextField {...params} label="Add teacher" />}
                      />
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
