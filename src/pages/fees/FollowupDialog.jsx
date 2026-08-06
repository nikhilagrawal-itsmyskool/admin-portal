import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip, Button,
  TextField, MenuItem, CircularProgress, Divider, Link, IconButton,
} from '@mui/material';
import { AttachFile as AttachIcon, Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { feesService } from '../../services/feesService';
import { errMsg, FEE_COLORS } from './feesUi';

export const FOLLOWUPS = [
  { v: '', label: '—' },
  { v: 'called', label: 'Called', color: 'info' },
  { v: 'promised', label: 'Promised', color: 'warning' },
  { v: 'unreachable', label: 'Unreachable', color: 'default' },
  { v: 'settled', label: 'Settled', color: 'success' },
];
export const fLabel = (v) => FOLLOWUPS.find((f) => f.v === (v || ''))?.label || '—';
export const fColor = (v) => FOLLOWUPS.find((f) => f.v === (v || ''))?.color || 'default';

const readAsBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res({ fileName: file.name, mimeType: file.type || 'application/octet-stream', base64Data: String(r.result).split(',')[1] });
  r.onerror = rej; r.readAsDataURL(file);
});

// Follow-up timeline for a student: newest-first entries with evidence + an add-entry form.
export default function FollowupDialog({ open, onClose, studentId, academicYearId, studentName, onChanged }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ status: '', note: '', promisedDate: '', files: [] });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setEntries(null);
    feesService.getFollowup({ studentId, academicYearId }).then((r) => setEntries(r?.entries || [])).catch((e) => { setError(errMsg(e)); setEntries([]); });
  };
  useEffect(() => { if (open && studentId) { setForm({ status: '', note: '', promisedDate: '', files: [] }); load(); } /* eslint-disable-next-line */ }, [open, studentId, academicYearId]);

  const add = async () => {
    if (!form.status && !form.note.trim() && !form.files.length) { setError('Add a status, note, or attachment.'); return; }
    setSaving(true); setError('');
    try {
      const attachments = await Promise.all([...form.files].map(readAsBase64));
      await feesService.setFollowup({ studentId, academicYearId, status: form.status || null, note: form.note.trim() || null, promisedDate: form.promisedDate || null, attachments });
      setForm({ status: '', note: '', promisedDate: '', files: [] });
      load(); onChanged && onChanged();
    } catch (e) { setError(errMsg(e)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Follow-up · {studentName}</span>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Typography sx={{ color: FEE_COLORS.danger, fontSize: 13, mb: 1 }}>{error}</Typography>}

        {/* add entry */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <TextField size="small" select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 130 }}>
              {FOLLOWUPS.map((f) => <MenuItem key={f.v} value={f.v}>{f.label}</MenuItem>)}
            </TextField>
            {form.status === 'promised' && <TextField size="small" type="date" label="Promised by" InputLabelProps={{ shrink: true }} value={form.promisedDate} onChange={(e) => setForm((f) => ({ ...f, promisedDate: e.target.value }))} />}
            <Button component="label" size="small" variant="outlined" startIcon={<AttachIcon />}>
              Attach{form.files.length ? ` (${form.files.length})` : ''}
              <input hidden multiple type="file" onChange={(e) => setForm((f) => ({ ...f, files: Array.from(e.target.files || []) }))} />
            </Button>
          </Box>
          <TextField fullWidth size="small" multiline minRows={2} label="Remark" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ mt: 1 }} disabled={saving} onClick={add}>{saving ? 'Saving…' : 'Add to timeline'}</Button>
        </Box>
        <Divider sx={{ mb: 1 }} />

        {/* timeline */}
        {entries === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
        ) : entries.length === 0 ? (
          <Typography sx={{ color: FEE_COLORS.muted, py: 1, fontSize: 13 }}>No follow-up yet.</Typography>
        ) : entries.map((e) => (
          <Box key={e.uuid} sx={{ borderLeft: `2px solid ${FEE_COLORS.border}`, pl: 1.5, pb: 1.5, ml: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {e.status && <Chip size="small" color={fColor(e.status)} label={fLabel(e.status)} />}
              <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>{e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : ''}</Typography>
              {e.promisedDate && <Typography sx={{ fontSize: 12, color: FEE_COLORS.warning }}>promised {String(e.promisedDate).slice(0, 10)}</Typography>}
            </Box>
            {e.note && <Typography sx={{ fontSize: 13, mt: 0.25 }}>{e.note}</Typography>}
            {(e.attachments || []).length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                {e.attachments.map((a) => (
                  a.url && /^image\//.test(a.mimeType)
                    ? <Link key={a.uuid} href={a.url} target="_blank"><Box component="img" src={a.url} alt={a.fileName} sx={{ height: 56, borderRadius: 1, border: `1px solid ${FEE_COLORS.border}` }} /></Link>
                    : <Link key={a.uuid} href={a.url || '#'} target="_blank" sx={{ fontSize: 12 }}>{a.fileName}</Link>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
