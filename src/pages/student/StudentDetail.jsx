import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Alert,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoIcon,
  Add as AddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const RELATIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]); // strip data: prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function GuardianDialog({ open, onClose, onSave, initial }) {
  const [g, setG] = useState({ relation: 'father', name: '', occupation: '', address: '', mobile: '', whatsapp: '', email: '', isPrimaryContact: false });
  useEffect(() => {
    if (open) {
      setG(
        initial || { relation: 'father', name: '', occupation: '', address: '', mobile: '', whatsapp: '', email: '', isPrimaryContact: false }
      );
    }
  }, [open, initial]);
  const set = (k) => (e) => setG((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Guardian' : 'Add Guardian'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="Relation" value={g.relation} onChange={set('relation')} size="small">
              {RELATIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth label="Name" value={g.name} onChange={set('name')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Occupation" value={g.occupation} onChange={set('occupation')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Mobile" value={g.mobile} onChange={set('mobile')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="WhatsApp" value={g.whatsapp} onChange={set('whatsapp')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email" value={g.email} onChange={set('email')} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Address" value={g.address} onChange={set('address')} size="small" multiline rows={2} />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Primary contact"
              value={g.isPrimaryContact ? 'yes' : 'no'}
              onChange={(e) => setG((p) => ({ ...p, isPrimaryContact: e.target.value === 'yes' }))}
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(g)} disabled={!g.relation}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function StudentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [guardianDialog, setGuardianDialog] = useState({ open: false, initial: null });
  const [delGuardian, setDelGuardian] = useState({ open: false, item: null });

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await studentService.getStudentById(id);
      setStudent(s);
      loadPhoto();
    } catch {
      setError('Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const loadPhoto = async () => {
    try {
      const p = await studentService.getPhoto('student', id);
      setPhotoUrl(`data:${p.mimeType};base64,${p.data}`);
    } catch {
      setPhotoUrl('');
    }
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64Data = await fileToBase64(file);
      await studentService.uploadPhoto('student', id, { fileName: file.name, mimeType: file.type, base64Data });
      loadPhoto();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Photo upload failed (use JPEG/PNG under 2 MB)');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveGuardian = async (g) => {
    try {
      if (g.uuid) {
        await studentService.updateGuardian(id, g.uuid, g);
      } else {
        await studentService.createGuardian(id, g);
      }
      setGuardianDialog({ open: false, initial: null });
      load();
    } catch {
      setError('Failed to save guardian');
    }
  };

  const removeGuardian = async () => {
    try {
      await studentService.deleteGuardian(id, delGuardian.item.uuid);
      setDelGuardian({ open: false, item: null });
      load();
    } catch {
      setError('Failed to delete guardian');
    }
  };

  if (loading) return <Typography>Loading…</Typography>;
  if (!student) return <Alert severity="error">{error || 'Not found'}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/students')}>
          Back
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {student.name}
        </Typography>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/students/${id}/edit`)}>
          Edit
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Identity card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar src={photoUrl} sx={{ width: 120, height: 120, mx: 'auto', mb: 1, fontSize: 40 }}>
                {student.name?.[0]}
              </Avatar>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handlePhotoPick} />
              <Button size="small" startIcon={<PhotoIcon />} onClick={() => fileRef.current?.click()}>
                {photoUrl ? 'Change photo' : 'Add photo'}
              </Button>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={0.5} sx={{ textAlign: 'left' }}>
                <Fact label="Admission #" value={student.admissionNumber} />
                <Fact label="Class" value={student.currentClassName} />
                <Fact label="Roll #" value={student.currentRollNumber} />
                <Fact label="House" value={student.houseName} />
                <Fact label="Gender" value={student.gender} />
                <Fact label="DOB" value={student.dob ? String(student.dob).slice(0, 10) : null} />
                <Fact label="Family #" value={student.familyUniqueNumber} />
                <Fact label="Comm. pref" value={student.communicationPreference} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={student.status}
                    size="small"
                    color={student.status === 'active' ? 'success' : 'default'}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Guardians + enrollment */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Guardians</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setGuardianDialog({ open: true, initial: null })}>
                  Add
                </Button>
              </Box>
              {(student.guardians || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No guardians added yet.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {student.guardians.map((g) => (
                    <Grid item xs={12} sm={6} key={g.uuid}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: '12px !important' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                              {g.relation}
                              {g.isPrimaryContact && (
                                <Tooltip title="Primary contact">
                                  <StarIcon fontSize="inherit" color="warning" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                                </Tooltip>
                              )}
                            </Typography>
                            <Box>
                              <IconButton size="small" onClick={() => setGuardianDialog({ open: true, initial: g })}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setDelGuardian({ open: true, item: g })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Typography variant="body2">{g.name || '—'}</Typography>
                          {g.occupation && (
                            <Typography variant="caption" color="text.secondary">
                              {g.occupation}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {[g.mobile, g.email].filter(Boolean).join(' · ') || '—'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Enrollment history
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Academic Year</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Roll #</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(student.enrollments || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>No enrollment records.</TableCell>
                    </TableRow>
                  ) : (
                    student.enrollments.map((e) => (
                      <TableRow key={e.uuid}>
                        <TableCell>{e.academicYearName || '—'}</TableCell>
                        <TableCell>{e.className || '—'}</TableCell>
                        <TableCell>{e.rollNumber ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mt: 3 }}>
            360° summary (attendance, conduct, library, dues, health) is coming in a later phase.
          </Alert>
        </Grid>
      </Grid>

      <GuardianDialog
        open={guardianDialog.open}
        initial={guardianDialog.initial}
        onClose={() => setGuardianDialog({ open: false, initial: null })}
        onSave={saveGuardian}
      />

      <ConfirmDialog
        open={delGuardian.open}
        title="Delete Guardian"
        message="Remove this guardian?"
        onConfirm={removeGuardian}
        onCancel={() => setDelGuardian({ open: false, item: null })}
      />
    </Box>
  );
}

function Fact({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}
