import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Alert, CircularProgress, Button, IconButton,
  TextField, Autocomplete, Divider, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';

// Admin/god: manage the class-teacher remark-suggestion library (seeded with the recommended
// Good/Average/Low Performance comments). These feed the "Insert suggestion" picker on the
// Co-Scholastic remark field. Editing here never touches any remark a teacher has already written.
export default function ReportRemarkTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null); // { id, text }
  const [newCat, setNewCat] = useState('Good Performance');
  const [newText, setNewText] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await examinationService.remarkTemplates();
      setTemplates(r.templates || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load remark templates');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))], [templates]);
  const grouped = useMemo(() => {
    const cats = [...new Set(templates.map((t) => t.category))];
    return cats.map((c) => [c, templates.filter((t) => t.category === c)]);
  }, [templates]);

  const apply = async (fn, okMsg) => {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await fn(); setTemplates(r.templates || []); setMsg(okMsg); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed'); }
    finally { setBusy(false); }
  };

  const add = async () => {
    const text = newText.trim(); const category = (newCat || '').trim();
    if (!text || !category) return;
    await apply(() => examinationService.saveRemarkTemplate({ category, text }), 'Remark added.');
    setNewText('');
  };
  const saveEdit = async () => {
    if (!editing || !editing.text.trim()) return;
    const row = templates.find((t) => t.id === editing.id);
    await apply(() => examinationService.saveRemarkTemplate({ uuid: editing.id, category: row.category, text: editing.text.trim() }), 'Remark updated.');
    setEditing(null);
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', maxWidth: 900 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Remark Templates</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Suggested class-teacher remarks, grouped by category. Teachers insert these on the Co-Scholastic
        screen and can edit the text afterward. Changes here are live — editing or deleting a suggestion
        never changes a remark already written on a report card.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Add a remark</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
            <Autocomplete
              freeSolo size="small" sx={{ minWidth: 220 }} options={categories} value={newCat}
              onInputChange={(_, v) => setNewCat(v)}
              renderInput={(p) => <TextField {...p} label="Category" placeholder="e.g. Good Performance" />}
            />
            <TextField size="small" fullWidth multiline minRows={2} label="Remark text" value={newText}
              onChange={(e) => setNewText(e.target.value)} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={add} disabled={busy || !newText.trim() || !(newCat || '').trim()} sx={{ whiteSpace: 'nowrap' }}>Add</Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {grouped.map(([cat, items]) => (
          <Card key={cat} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{cat}</Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack divider={<Divider flexItem />} spacing={0.5}>
                {items.map((t) => {
                  const isEditing = editing?.id === t.id;
                  return (
                    <Stack key={t.id} direction="row" spacing={1} alignItems="flex-start" sx={{ py: 0.75 }}>
                      {isEditing ? (
                        <>
                          <TextField size="small" fullWidth multiline value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                          <Tooltip title="Save"><span><IconButton size="small" color="primary" onClick={saveEdit} disabled={busy}><CheckIcon fontSize="small" /></IconButton></span></Tooltip>
                          <Tooltip title="Cancel"><IconButton size="small" onClick={() => setEditing(null)}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                        </>
                      ) : (
                        <>
                          <Typography variant="body2" sx={{ flex: 1 }}>{t.text}</Typography>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditing({ id: t.id, text: t.text })} disabled={busy}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Delete"><span><IconButton size="small" color="error" onClick={() => apply(() => examinationService.deleteRemarkTemplate(t.id), 'Remark deleted.')} disabled={busy}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>
                        </>
                      )}
                    </Stack>
                  );
                })}
                {!items.length && <Typography variant="caption" color="text.secondary">— none —</Typography>}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {!templates.length && <Alert severity="info">No remark templates yet — add one above.</Alert>}
      </Stack>
    </Box>
  );
}
