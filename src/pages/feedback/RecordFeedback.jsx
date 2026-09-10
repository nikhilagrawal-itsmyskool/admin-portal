import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert,
  CircularProgress, Stack, Chip,
} from '@mui/material';
import { Search as SearchIcon, PersonSearch as TeacherIcon } from '@mui/icons-material';
import { feedbackService } from '../../services/feedbackService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { todayIso } from '../../utils/date';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../components/common/EmployeeSearchDialog';

const emptyForm = () => ({ categoryId: '', feedbackText: '', visitDate: todayIso() });

export default function RecordFeedback() {
  const { academicYearId } = useAcademicYear();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [student, setStudent] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [studentOpen, setStudentOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        setCategories((await feedbackService.categories()) || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reset = () => {
    setStudent(null); setTeacher(null); setForm(emptyForm());
  };

  const submit = async () => {
    if (!student) { setError('Choose a student'); return; }
    if (!form.categoryId) { setError('Choose a category'); return; }
    if (!form.feedbackText.trim()) { setError('Enter the feedback'); return; }
    if (!teacher) { setError('Assign a teacher'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      await feedbackService.record({
        studentId: student.uuid,
        classId: student.classId || student.class_id || undefined,
        academicYearId: academicYearId || undefined,
        categoryId: form.categoryId,
        feedbackText: form.feedbackText.trim(),
        visitDate: form.visitDate || undefined,
        assignedTo: teacher.uuid,
      });
      setSuccess(`Feedback for ${student.name} recorded and assigned to ${teacher.name}.`);
      reset();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to record feedback');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Record Feedback</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
        Log feedback collected on a home visit and assign it to a teacher to act on.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={2}>
              {/* Student */}
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>STUDENT</Typography>
                {student ? (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip label={`${student.name}${student.className ? ` · ${student.className}` : ''}`} onDelete={() => setStudent(null)} />
                    {student.admissionNumber && <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Adm #{student.admissionNumber}</Typography>}
                  </Stack>
                ) : (
                  <Button variant="outlined" startIcon={<SearchIcon />} onClick={() => setStudentOpen(true)}>Find student</Button>
                )}
              </Grid>

              {/* Category + visit date */}
              <Grid item xs={12} sm={7}>
                <TextField select fullWidth size="small" label="Category" value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  {categories.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField fullWidth type="date" size="small" label="Visit date" value={form.visitDate}
                  onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>

              {/* Feedback text */}
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Feedback" multiline minRows={4} value={form.feedbackText}
                  onChange={(e) => setForm((f) => ({ ...f, feedbackText: e.target.value }))}
                  placeholder="What did the family share? What needs follow-up?" />
              </Grid>

              {/* Assign teacher */}
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>ASSIGN TO TEACHER</Typography>
                {teacher ? (
                  <Chip color="primary" variant="outlined" label={teacher.name} onDelete={() => setTeacher(null)} />
                ) : (
                  <Button variant="outlined" startIcon={<TeacherIcon />} onClick={() => setTeacherOpen(true)}>Choose teacher</Button>
                )}
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button color="inherit" onClick={reset} disabled={busy}>Clear</Button>
                  <Button variant="contained" onClick={submit} disabled={busy}>Record & assign</Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <StudentSearchDialog open={studentOpen} onClose={() => setStudentOpen(false)} onSelect={(s) => setStudent(s)} />
      <EmployeeSearchDialog open={teacherOpen} onClose={() => setTeacherOpen(false)} onSelect={(e) => setTeacher(e)} />
    </Box>
  );
}
