import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Button, TextField, Alert, CircularProgress, Divider,
} from '@mui/material';
import { Image as BrandingIcon } from '@mui/icons-material';
import { useCan } from '../../permissions/can';
import { examinationService } from '../../services/examinationService';

// Read a File as raw base64 (no data: prefix).
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const EMPTY = { schoolName: '', motto: '', address: '', affiliationNo: '', schoolCode: '', contact: '', email: '', website: '' };

// School branding — the printed header for the datesheet, admit cards and report cards: the two
// crests, office stamp, school name / motto / address and the report-card masthead line
// (affiliation no, school code, contact, e-mail, website). Set once, school-wide.
export default function BrandingPage() {
  const canManage = useCan()('exam.schedule.manage');
  const [branding, setBranding] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const b = await examinationService.getBranding();
      setBranding(b);
      setForm({
        schoolName: b.schoolName || '', motto: b.motto || '', address: b.address || '',
        affiliationNo: b.affiliationNo || '', schoolCode: b.schoolCode || '',
        contact: b.contact || '', email: b.email || '', website: b.website || '',
      });
      setDirty(false);
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load branding'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upd = (k, v) => { setDirty(true); setForm((f) => ({ ...f, [k]: v })); };

  const saveText = async () => {
    setBusy('text'); setErr(''); setMsg('');
    try { setBranding(await examinationService.setBrandingText(form)); setDirty(false); setMsg('Saved school details.'); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to save'); }
    finally { setBusy(''); }
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setBusy(kind); setErr('');
    try {
      const b64 = await toBase64(file);
      setBranding(await examinationService.setBranding(kind, b64, file.type || 'image/png', file.name));
    } catch (e) { setErr(e.response?.data?.error?.description || 'Upload failed'); }
    finally { setBusy(''); }
  };

  const Slot = ({ kind, label, uri }) => (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <Box sx={{ height: 120, border: '1px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, bgcolor: 'action.hover' }}>
        {uri ? <img src={uri} alt="" style={{ maxHeight: 108, maxWidth: '100%' }} /> : <Typography variant="caption" color="text.secondary">none</Typography>}
      </Box>
      {canManage && (
        <Button component="label" size="small" variant="outlined" disabled={busy === kind}>
          {busy === kind ? 'Uploading…' : (uri ? 'Replace' : 'Upload')}
          <input hidden type="file" accept="image/*" onChange={(e) => upload(kind, e.target.files?.[0])} />
        </Button>
      )}
    </Box>
  );

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <BrandingIcon color="primary" />
        <Typography variant="h4">Branding</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The header printed on the datesheet, admit cards and report cards. Set once for the whole school.
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>School details</Typography>
          <Stack spacing={2}>
            <TextField label="School name" fullWidth value={form.schoolName} disabled={!canManage}
              onChange={(e) => upd('schoolName', e.target.value)} placeholder="Dr. B. P. Agrawal Shiksha Niketan" />
            <TextField label="Motto" fullWidth value={form.motto} disabled={!canManage}
              onChange={(e) => upd('motto', e.target.value)} placeholder="Chariot of Knowledge" />
            <TextField label="Address" fullWidth multiline minRows={1} value={form.address} disabled={!canManage}
              onChange={(e) => upd('address', e.target.value)} placeholder="Kalyankunj, Kanpur Road (Farrukhabad)" />
          </Stack>

          <Divider sx={{ my: 2 }}><Typography variant="caption" color="text.secondary">REPORT-CARD MASTHEAD</Typography></Divider>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Affiliation No." fullWidth value={form.affiliationNo} disabled={!canManage}
                onChange={(e) => upd('affiliationNo', e.target.value)} placeholder="2133499" />
              <TextField label="School Code" fullWidth value={form.schoolCode} disabled={!canManage}
                onChange={(e) => upd('schoolCode', e.target.value)} placeholder="71638" />
            </Stack>
            <TextField label="Contact No(s)." fullWidth value={form.contact} disabled={!canManage}
              onChange={(e) => upd('contact', e.target.value)} placeholder="9565467882, 9129298033" />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="E-mail" fullWidth value={form.email} disabled={!canManage}
                onChange={(e) => upd('email', e.target.value)} placeholder="admin@dbpasn.com" />
              <TextField label="Website" fullWidth value={form.website} disabled={!canManage}
                onChange={(e) => upd('website', e.target.value)} placeholder="www.dbpasn.com" />
            </Stack>
          </Stack>

          {canManage && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button variant={dirty ? 'contained' : 'outlined'} onClick={saveText} disabled={busy === 'text' || !dirty}>
                {dirty ? 'Save details' : 'No changes'}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Crests &amp; stamp</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Slot kind="boardLogo" label="Board logo (left crest)" uri={branding?.boardLogoDataUri} />
            <Slot kind="logo" label="School crest (right)" uri={branding?.logoDataUri} />
            <Slot kind="stamp" label="Office stamp" uri={branding?.stampDataUri} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
