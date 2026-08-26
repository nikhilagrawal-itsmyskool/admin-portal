import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Box, Typography, Alert, CircularProgress,
} from '@mui/material';
import { examinationService } from '../../services/examinationService';

// Reads a File as raw base64 (no data: prefix).
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Central per-school branding: the logo printed on admit cards + the office stamp on the
// footer. Uploaded once, reused everywhere.
export default function BrandingDialog({ open, onClose }) {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try { setBranding(await examinationService.getBranding()); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load branding'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open]);

  const upload = async (kind, file) => {
    if (!file) return;
    setBusy(kind); setErr('');
    try {
      const b64 = await toBase64(file);
      setBranding(await examinationService.setBranding(kind, b64, file.type || 'image/png', file.name));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Upload failed');
    } finally { setBusy(''); }
  };

  const Slot = ({ kind, label, uri }) => (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <Box sx={{ height: 90, border: '1px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, bgcolor: 'action.hover' }}>
        {uri ? <img src={uri} alt="" style={{ maxHeight: 82, maxWidth: '100%' }} /> : <Typography variant="caption" color="text.secondary">none</Typography>}
      </Box>
      <Button component="label" size="small" variant="outlined" disabled={busy === kind}>
        {busy === kind ? 'Uploading…' : (uri ? 'Replace' : 'Upload')}
        <input hidden type="file" accept="image/*" onChange={(e) => upload(kind, e.target.files?.[0])} />
      </Button>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>School branding</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The logo prints on every admit card's header; the office stamp prints on the footer. School-wide — set once.
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Stack direction="row" spacing={3}>
            <Slot kind="logo" label="Logo" uri={branding?.logoDataUri} />
            <Slot kind="stamp" label="Office stamp" uri={branding?.stampDataUri} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
