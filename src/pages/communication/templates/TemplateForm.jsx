import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, Alert, CircularProgress,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { communicationService } from '../../../services/communicationService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

const CHANNELS = [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }];
const HEADER_TYPES = [{ value: 'none', label: 'None' }, { value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }];
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

export default function TemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const can = useCan();
  const canManage = can(ACTIONS.COMMUNICATION_TEMPLATE_MANAGE);

  const [form, setForm] = useState({
    key: '', name: '', channel: 'whatsapp', language: 'en', providerTemplateId: '',
    category: '', headerType: 'none', variables: '', bodyPreview: '', status: 'active',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const t = await communicationService.getTemplate(id);
        setForm({
          key: t.key || '', name: t.name || '', channel: t.channel || 'whatsapp',
          language: t.language || 'en', providerTemplateId: t.providerTemplateId || '',
          category: t.category || '', headerType: t.headerType || 'none',
          variables: (t.variables || []).join(', '), bodyPreview: t.bodyPreview || '',
          status: t.status === 'inactive' ? 'inactive' : 'active',
        });
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.key.trim()) { setError('Key is required'); return; }
    setSaving(true); setError('');
    const payload = {
      key: form.key.trim(),
      name: form.name || undefined,
      channel: form.channel,
      language: form.language || undefined,
      providerTemplateId: form.providerTemplateId || undefined,
      category: form.category || undefined,
      headerType: form.headerType,
      bodyPreview: form.bodyPreview || undefined,
      status: form.status,
      // Tolerate JSON-ish input (e.g. pasted `["a", "b"]`): strip stray quotes
      // and brackets so stored names stay clean and resolve at send time.
      variables: form.variables
        .split(',')
        .map((v) => v.trim().replace(/^["'[\]]+/, '').replace(/["'[\]]+$/, '').trim())
        .filter(Boolean),
    };
    try {
      if (isEdit) await communicationService.updateTemplate(id, payload);
      else await communicationService.createTemplate(payload);
      navigate('/communication/templates');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return <Alert severity="warning">You do not have permission to manage templates.</Alert>;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/communication/templates')} sx={{ mb: 2 }}>Back</Button>
      <Typography variant="h4" sx={{ mb: 3 }}>{isEdit ? 'Edit' : 'Add'} Template</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card component="form" onSubmit={handleSubmit}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Key" required value={form.key} onChange={set('key')} disabled={isEdit} helperText="Logical key, e.g. attendance_absent" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Name" value={form.name} onChange={set('name')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth select label="Channel" value={form.channel} onChange={set('channel')} disabled={isEdit}>
                {CHANNELS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Language" value={form.language} onChange={set('language')} disabled={isEdit} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth select label="Header Type" value={form.headerType} onChange={set('headerType')}>
                {HEADER_TYPES.map((h) => <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Provider Template ID" value={form.providerTemplateId} onChange={set('providerTemplateId')} helperText="MSG91 flow_id (SMS) / approved template name (WhatsApp)" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Category" value={form.category} onChange={set('category')} helperText="e.g. utility / transactional" />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth select label="Status" value={form.status} onChange={set('status')} helperText="Inactive = staged, not sent">
                {STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Variables (comma-separated)" value={form.variables} onChange={set('variables')} helperText="Ordered, e.g. studentName, className, date" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Body preview" value={form.bodyPreview} onChange={set('bodyPreview')} helperText="For display only; the approved template text lives at the provider" />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
