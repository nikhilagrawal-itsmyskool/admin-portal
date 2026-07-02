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
} from '@mui/material';
import { hiringService } from '../../services/hiringService';

export default function HiringCandidateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [lookups, setLookups] = useState({ positionTypes: [], subjects: [] });
  const [formData, setFormData] = useState({
    name: '',
    fatherHusbandName: '',
    positionType: '',
    subject: '',
    customSubject: '',
    mobile: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const lk = await hiringService.getLookups();
        setLookups(lk);
        if (isEdit) {
          const data = await hiringService.getCandidateById(id);
          const knownSubject = (lk.subjects || []).some(
            (s) => s.value === data.subject && s.value !== 'other'
          );
          setFormData({
            name: data.name || '',
            fatherHusbandName: data.fatherHusbandName || '',
            positionType: data.positionType || '',
            subject: data.subject ? (knownSubject ? data.subject : 'other') : '',
            customSubject: data.subject && !knownSubject ? data.subject : '',
            mobile: data.mobile || '',
            email: data.email || '',
          });
        }
      } catch {
        setError('Failed to load form data');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const resolveSubject = () => {
    if (formData.subject === 'other') return formData.customSubject.trim() || undefined;
    return formData.subject || undefined;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        fatherHusbandName: formData.fatherHusbandName.trim() || undefined,
        positionType: formData.positionType,
        subject: resolveSubject(),
        mobile: formData.mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
      };

      if (isEdit) {
        await hiringService.updateCandidate(id, payload);
        navigate(`/hiring/${id}`);
      } else {
        const result = await hiringService.createCandidate(payload);
        navigate(`/hiring/${result.uuid}`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save candidate');
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

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isEdit ? 'Edit Candidate' : 'Add Candidate'}
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
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Father's / Husband's Name"
                  name="fatherHusbandName"
                  value={formData.fatherHusbandName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Position Type"
                  name="positionType"
                  value={formData.positionType}
                  onChange={handleChange}
                  required
                >
                  {lookups.positionTypes.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <MenuItem value="">None</MenuItem>
                  {lookups.subjects.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {formData.subject === 'other' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Specify Subject"
                    name="customSubject"
                    value={formData.customSubject}
                    onChange={handleChange}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Candidate'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => (isEdit ? navigate(`/hiring/${id}`) : navigate('/hiring'))}
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
    </Box>
  );
}
