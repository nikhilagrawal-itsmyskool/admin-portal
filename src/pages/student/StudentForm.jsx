import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Grid,
  MenuItem,
  Autocomplete,
  Alert,
  Divider,
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];

const PREF_RECIPIENTS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
];

export default function StudentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const can = useCan();
  const canManage = can(ACTIONS.STUDENT_MANAGE);

  // Frontend gate: only god/admin reach the form. Entry points are already hidden;
  // this bounces a non-manager who lands here via a direct URL.
  useEffect(() => {
    if (!canManage) navigate('/students', { replace: true });
  }, [canManage, navigate]);

  const [houses, setHouses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    admissionNumber: '',
    gender: '',
    dob: '',
    familyUniqueNumber: '',
    oldAdmissionNumber: '',
    communicationPreference: '',
    status: 'active',
  });
  const [house, setHouse] = useState(null);
  // Initial enrollment (create only)
  const [enrollYear, setEnrollYear] = useState(null);
  const [enrollClass, setEnrollClass] = useState(null);
  const [rollNumber, setRollNumber] = useState('');

  useEffect(() => {
    loadLookups();
    if (isEdit) loadStudent();
  }, [id]);

  const loadLookups = async () => {
    // Each lookup loads independently — one failing API must not blank the others.
    const [h, c, y] = await Promise.allSettled([
      studentService.getHouses(),
      classService.getClasses(),
      academicCalendarService.getAcademicYears(),
    ]);
    if (h.status === 'fulfilled') setHouses(h.value.houses || []);
    if (c.status === 'fulfilled') setClasses(c.value || []);
    if (y.status === 'fulfilled') setYears(y.value || []);
  };

  const loadStudent = async () => {
    setLoading(true);
    try {
      const s = await studentService.getStudentById(id);
      setForm({
        name: s.name || '',
        admissionNumber: s.admissionNumber || '',
        gender: s.gender || '',
        dob: s.dob ? String(s.dob).slice(0, 10) : '',
        familyUniqueNumber: s.familyUniqueNumber || '',
        oldAdmissionNumber: s.oldAdmissionNumber || '',
        communicationPreference: s.communicationPreference || '',
        status: s.status || 'active',
      });
      if (s.houseId) setHouse({ uuid: s.houseId, name: s.houseName });
    } catch {
      setError('Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Communication preference is a compact `recipient:channel` token (e.g. "mother:whatsapp");
  // empty means the (future) communication module applies its default ladder.
  const prefRecipient = (form.communicationPreference || '').split(':')[0] || '';
  const prefChannel = (form.communicationPreference || '').split(':')[1] || 'whatsapp';
  const setPref = (recipient, channel) =>
    setForm((f) => ({
      ...f,
      communicationPreference: recipient ? `${recipient}:${channel || 'whatsapp'}` : '',
    }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim() || !form.admissionNumber.trim()) {
      setError('Name and admission number are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, houseId: house?.uuid || null };
      if (isEdit) {
        await studentService.updateStudent(id, payload);
        navigate(`/students/${id}`);
      } else {
        if (enrollYear && enrollClass) {
          payload.academicYearId = enrollYear.uuid;
          payload.classId = enrollClass.uuid;
          if (rollNumber) payload.rollNumber = parseInt(rollNumber, 10);
        }
        const created = await studentService.createStudent(payload);
        navigate(`/students/${created.uuid}`);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/students')}>
          Back
        </Button>
        <Typography variant="h4">{isEdit ? 'Edit Student' : 'Admit Student'}</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Name" value={form.name} onChange={setField('name')} size="small" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                required
                label="Admission #"
                value={form.admissionNumber}
                onChange={setField('admissionNumber')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select label="Gender" value={form.gender} onChange={setField('gender')} size="small">
                <MenuItem value="">—</MenuItem>
                {GENDERS.map((g) => (
                  <MenuItem key={g.value} value={g.value}>
                    {g.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Date of birth"
                type="date"
                value={form.dob}
                onChange={setField('dob')}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Family #"
                value={form.familyUniqueNumber}
                onChange={setField('familyUniqueNumber')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Old Adm #"
                value={form.oldAdmissionNumber}
                onChange={setField('oldAdmissionNumber')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={houses}
                getOptionLabel={(o) => o.name || ''}
                value={house}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                onChange={(e, v) => setHouse(v)}
                renderInput={(p) => <TextField {...p} label="House" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Contact preference"
                value={prefRecipient}
                onChange={(e) => setPref(e.target.value, prefChannel)}
                size="small"
                helperText="Empty = default ladder"
              >
                <MenuItem value="">Default ladder</MenuItem>
                {PREF_RECIPIENTS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label} first
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                label="Channel"
                value={prefChannel}
                onChange={(e) => setPref(prefRecipient, e.target.value)}
                size="small"
                disabled={!prefRecipient}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </TextField>
            </Grid>
            {isEdit && (
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Status" value={form.status} onChange={setField('status')} size="small">
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
            )}

            {!isEdit && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Initial enrollment (optional)
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    options={years}
                    getOptionLabel={(o) => o.name || ''}
                    value={enrollYear}
                    onChange={(e, v) => setEnrollYear(v)}
                    renderInput={(p) => <TextField {...p} label="Academic year" size="small" />}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    options={classes}
                    getOptionLabel={(o) => o.name || ''}
                    value={enrollClass}
                    onChange={(e, v) => setEnrollClass(v)}
                    renderInput={(p) => <TextField {...p} label="Class" size="small" />}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Roll number"
                    type="number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    size="small"
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Admit Student'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/students')}>
              Cancel
            </Button>
          </Box>
          {!isEdit && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Parents/guardians and photos are added from the student's profile after admission.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
