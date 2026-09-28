import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, TextField, Button, Stack,
  IconButton, Divider, Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { programmesService, SELC } from '../../services/programmesService';
import { useCan } from '../../permissions/can';

// God-only page to edit programme-level "how to teach this" guidance shown as the
// collapsed card at the top of the teacher reader (motto, philosophy, bullet list).
export default function SelcSettings() {
  const can = useCan();
  const canManage = can('godpwa.programme.manage');

  const [name, setName] = useState('');
  const [form, setForm] = useState({ motto: '', philosophy: '', teacherGuidance: [] });
  const [baseline, setBaseline] = useState(JSON.stringify({ motto: '', philosophy: '', teacherGuidance: [] }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await programmesService.getProgramme(SELC);
        setName(p.name || 'Spoken English');
        const loaded = {
          motto: p.motto || '',
          philosophy: p.philosophy || '',
          teacherGuidance: Array.isArray(p.teacherGuidance) ? p.teacherGuidance : [],
        };
        setForm(loaded);
        setBaseline(JSON.stringify(loaded));
      } catch {
        setError('Failed to load programme settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setBullet = (i, v) =>
    setForm((f) => ({ ...f, teacherGuidance: f.teacherGuidance.map((b, k) => (k === i ? v : b)) }));
  const addBullet = () => setForm((f) => ({ ...f, teacherGuidance: [...f.teacherGuidance, ''] }));
  const removeBullet = (i) =>
    setForm((f) => ({ ...f, teacherGuidance: f.teacherGuidance.filter((_, k) => k !== i) }));
  const moveBullet = (i, dir) =>
    setForm((f) => {
      const arr = [...f.teacherGuidance];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, teacherGuidance: arr };
    });

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        motto: form.motto,
        philosophy: form.philosophy,
        teacherGuidance: form.teacherGuidance.map((s) => s.trim()).filter(Boolean),
      };
      await programmesService.updateProgramme(SELC, payload);
      const clean = { ...form, teacherGuidance: payload.teacherGuidance };
      setForm(clean);
      setBaseline(JSON.stringify(clean));
      setSuccess('Saved. Teachers will see the updated guidance card.');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <Alert severity="warning">You don't have permission to change programme settings.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>{name} — Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The "How to teach this programme" card teachers see at the top of the reader.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Card sx={{ maxWidth: 760 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Motto" fullWidth size="small" value={form.motto}
                onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))}
              />
              <TextField
                label="Philosophy" fullWidth multiline minRows={2} value={form.philosophy}
                onChange={(e) => setForm((f) => ({ ...f, philosophy: e.target.value }))}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Teaching principles (shown as bullets)</Typography>

            <Stack spacing={1}>
              {form.teacherGuidance.map((b, i) => (
                <Stack direction="row" spacing={1} alignItems="flex-start" key={i}>
                  <TextField
                    fullWidth size="small" multiline value={b}
                    onChange={(e) => setBullet(i, e.target.value)}
                    placeholder={`Principle ${i + 1}`}
                  />
                  <Tooltip title="Move up"><span>
                    <IconButton size="small" onClick={() => moveBullet(i, -1)} disabled={i === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span></Tooltip>
                  <Tooltip title="Move down"><span>
                    <IconButton size="small" onClick={() => moveBullet(i, 1)} disabled={i === form.teacherGuidance.length - 1}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span></Tooltip>
                  <Tooltip title="Remove"><span>
                    <IconButton size="small" color="error" onClick={() => removeBullet(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span></Tooltip>
                </Stack>
              ))}
            </Stack>

            <Button size="small" startIcon={<AddIcon />} onClick={addBullet} sx={{ mt: 1.5 }}>
              Add principle
            </Button>

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained" startIcon={<SaveIcon />} onClick={save}
                disabled={saving || JSON.stringify(form) === baseline}
              >
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
