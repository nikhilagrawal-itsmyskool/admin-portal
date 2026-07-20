import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Button, Alert, Stack, Chip,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { useCan } from '../../permissions/can';

// Per-school assembly mode + branding. Template mode keeps the plain planning
// experience; house mode unlocks houses/rotation, weekly rosters, checklist and
// grading (their menu items appear only when mode === 'house').
export default function AssemblySettings() {
  const can = useCan();
  const canManage = can('assembly.manage');

  const [form, setForm] = useState({ mode: 'template', title: '', subtitle: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await assemblyService.getConfig();
        setForm({ mode: c?.mode || 'template', title: c?.title || '', subtitle: c?.subtitle || '' });
      } catch {
        setError('Failed to load assembly settings');
      } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setError(''); setOk(false);
    try {
      await assemblyService.setConfig({
        mode: form.mode,
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
      });
      setOk(true);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Assembly Settings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOk(false)}>Settings saved</Alert>}

      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <TextField
                fullWidth select label="Mode" value={form.mode} disabled={!canManage || loading}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                helperText="House mode adds rotating houses, weekly rosters, checklist and grading.">
                <MenuItem value="template">Template — plans &amp; tree only</MenuItem>
                <MenuItem value="house">House — full rostering, checklist &amp; grading</MenuItem>
              </TextField>
              <Box sx={{ mt: 1 }}>
                <Chip size="small" label={form.mode === 'house' ? 'House mode' : 'Template mode'}
                  color={form.mode === 'house' ? 'primary' : 'default'} variant={form.mode === 'house' ? 'filled' : 'outlined'} />
              </Box>
            </Box>
            <TextField fullWidth label="Title (optional)" placeholder="e.g. Morning Assembly" value={form.title}
              disabled={!canManage || loading} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField fullWidth label="Subtitle (optional)" value={form.subtitle}
              disabled={!canManage || loading} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            {canManage && (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || loading} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
