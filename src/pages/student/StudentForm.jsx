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
  Checkbox,
  FormControlLabel,
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
  { value: 'student', label: 'Student' },
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
  const [lookups, setLookups] = useState({}); // { category: [...], blood_group: [...], ... }
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
    communicationPreference: 'father:sms', // default recipient + channel; edit loads the stored value
    status: 'active',
    // extended demographics
    studentEmail: '',
    studentMobile: '',
    studentWhatsapp: '',
    categoryCode: '',
    bloodGroupCode: '',
    nationalityCode: '',
    motherTongueCode: '',
    aadhaarNumber: '',
    previousSchool: '',
    admissionDate: '',
    examOnly: false,
    examOnlyReason: '',
  });
  const [house, setHouse] = useState(null);
  // Initial enrollment (create only)
  const [enrollYear, setEnrollYear] = useState(null);
  const [enrollClass, setEnrollClass] = useState(null);
  const [rollNumber, setRollNumber] = useState('');
  const [joinDate, setJoinDate] = useState('');
  // Stream (only for classes that offer streams, e.g. XI/XII Science/Commerce).
  const [streams, setStreams] = useState([]);       // [{ code, name }] for the selected/current class
  const [streamCode, setStreamCode] = useState('');
  const [currentClass, setCurrentClass] = useState(null); // edit: the current enrollment's class

  useEffect(() => {
    loadLookups();
    if (isEdit) loadStudent();
  }, [id]);

  // Create: when the enrollment class changes, load the streams it offers (empty for
  // ordinary classes) and reset the picked stream. Edit loads streams in loadStudent.
  useEffect(() => {
    if (isEdit) return;
    const base = enrollClass?.uuid;
    if (!base) { setStreams([]); setStreamCode(''); return; }
    let active = true;
    classService
      .getClassStreams(base)
      .then((s) => { if (active) { setStreams(s || []); setStreamCode(''); } })
      .catch(() => { if (active) { setStreams([]); setStreamCode(''); } });
    return () => { active = false; };
  }, [enrollClass, isEdit]);

  const loadLookups = async () => {
    // Each lookup loads independently — one failing API must not blank the others.
    const [h, c, y, l] = await Promise.allSettled([
      studentService.getHouses(),
      classService.getClasses(),
      academicCalendarService.getAcademicYears(),
      studentService.getLookups(), // all types; grouped below
    ]);
    if (h.status === 'fulfilled') setHouses(h.value.houses || []);
    if (c.status === 'fulfilled') setClasses(c.value || []);
    if (y.status === 'fulfilled') setYears(y.value || []);
    if (l.status === 'fulfilled') {
      const grouped = {};
      for (const row of l.value.lookups || []) {
        (grouped[row.lookupType] = grouped[row.lookupType] || []).push(row);
      }
      setLookups(grouped);
    }
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
        studentEmail: s.studentEmail || '',
        studentMobile: s.studentMobile || '',
        studentWhatsapp: s.studentWhatsapp || '',
        categoryCode: s.categoryCode || '',
        bloodGroupCode: s.bloodGroupCode || '',
        nationalityCode: s.nationalityCode || '',
        motherTongueCode: s.motherTongueCode || '',
        aadhaarNumber: s.aadhaarNumber || '',
        previousSchool: s.previousSchool || '',
        admissionDate: s.admissionDate ? String(s.admissionDate).slice(0, 10) : '',
        examOnly: !!s.examOnly,
        examOnlyReason: s.examOnlyReason || '',
      });
      if (s.houseId) setHouse({ uuid: s.houseId, name: s.houseName });
      // Current enrollment class + its stream (if the class offers streams).
      if (s.currentClassId) {
        setCurrentClass({ uuid: s.currentClassId, name: s.currentClassName });
        setStreamCode(s.currentStreamCode || '');
        try {
          setStreams((await classService.getClassStreams(s.currentClassId)) || []);
        } catch {
          setStreams([]);
        }
      }
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
  const prefChannel = (form.communicationPreference || '').split(':')[1] || 'sms';
  const setPref = (recipient, channel) =>
    setForm((f) => ({
      ...f,
      communicationPreference: recipient ? `${recipient}:${channel || 'sms'}` : '',
    }));

  // A select backed by a per-school lookup type. Falls back to the stored code as a
  // one-off option so an existing value still shows if it isn't in the active list.
  const lookupSelect = (key, label, type, md = 3) => {
    const opts = lookups[type] || [];
    const val = form[key] || '';
    const missing = val && !opts.some((o) => o.code === val);
    return (
      <Grid item xs={12} md={md}>
        <TextField fullWidth select label={label} value={val} onChange={setField(key)} size="small">
          <MenuItem value="">—</MenuItem>
          {missing && <MenuItem value={val}>{val}</MenuItem>}
          {opts.map((o) => (
            <MenuItem key={o.uuid} value={o.code}>
              {o.label || o.code}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    );
  };

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
        // Only touch the stream when the current class offers one (send '' to clear).
        if (streams.length > 0) payload.streamCode = streamCode || '';
        await studentService.updateStudent(id, payload);
        navigate(`/students/${id}`);
      } else {
        if (enrollYear && enrollClass) {
          payload.academicYearId = enrollYear.uuid;
          payload.classId = enrollClass.uuid;
          if (streamCode) payload.streamCode = streamCode;
          if (rollNumber) payload.rollNumber = parseInt(rollNumber, 10);
          if (joinDate) payload.joinDate = joinDate;
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
        <Button startIcon={<BackIcon />} onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}>
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
                helperText="Auto = primary guardian → student"
              >
                <MenuItem value="">Auto (default ladder)</MenuItem>
                {PREF_RECIPIENTS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
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
            {/* Stream for the current enrollment — only for classes that offer streams. */}
            {isEdit && streams.length > 0 && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Current class"
                    value={currentClass?.name || ''}
                    size="small"
                    disabled
                    helperText="Change class via Promote"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    select
                    label="Stream"
                    value={streamCode}
                    onChange={(e) => setStreamCode(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">—</MenuItem>
                    {streams.map((s) => (
                      <MenuItem key={s.code} value={s.code}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </>
            )}

            {/* ---- More details ---- */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">
                More details
              </Typography>
            </Grid>
            {lookupSelect('categoryCode', 'Category', 'category')}
            {lookupSelect('bloodGroupCode', 'Blood group', 'blood_group')}
            {lookupSelect('nationalityCode', 'Nationality', 'nationality')}
            {lookupSelect('motherTongueCode', 'Mother tongue', 'mother_tongue')}
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Student email" value={form.studentEmail} onChange={setField('studentEmail')} size="small" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Student mobile" value={form.studentMobile} onChange={setField('studentMobile')} size="small" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Student WhatsApp" value={form.studentWhatsapp} onChange={setField('studentWhatsapp')} size="small" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Aadhaar number" value={form.aadhaarNumber} onChange={setField('aadhaarNumber')} size="small" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Date of admission"
                type="date"
                value={form.admissionDate}
                onChange={setField('admissionDate')}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Previous school attended" value={form.previousSchool} onChange={setField('previousSchool')} size="small" />
            </Grid>

            {/* Exam-only: registered here but studying elsewhere → pays no fees. The
                fees module reads this flag to skip demands and to cancel any posted. */}
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!form.examOnly}
                    onChange={(e) => setForm((f) => ({ ...f, examOnly: e.target.checked }))}
                    size="small"
                  />
                }
                label="Exam only (studying elsewhere)"
              />
            </Grid>
            {form.examOnly && (
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Reason / other school"
                  placeholder="e.g. Studying at St. Xavier's, Kanpur"
                  value={form.examOnlyReason}
                  onChange={setField('examOnlyReason')}
                  size="small"
                  helperText="Registered with us only to sit exams; no fees are charged."
                />
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
                {streams.length > 0 && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      select
                      label="Stream"
                      value={streamCode}
                      onChange={(e) => setStreamCode(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="">—</MenuItem>
                      {streams.map((s) => (
                        <MenuItem key={s.code} value={s.code}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Roll number"
                    type="number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Date of joining"
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Admit Student'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}>
              Cancel
            </Button>
          </Box>
          {!isEdit && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Guardians, addresses, siblings, photos and transfer certificate are managed from the student's profile after admission.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
