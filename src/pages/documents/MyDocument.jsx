import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Chip, Stack,
  TextField, Checkbox, FormControlLabel, ToggleButtonGroup, ToggleButton, Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Print as PrintIcon, UploadFile as UploadIcon,
  Download as DownloadIcon, CheckCircle as SignedIcon,
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import DocumentBody, { printDocument } from './DocumentBody';
import SignaturePad from '../examination/SignaturePad';
import { fmtDate } from '../../utils/date';

function readB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function MyDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resigning, setResigning] = useState(false);

  // digital form
  const [method, setMethod] = useState('digital');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [empId, setEmpId] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  // upload form
  const [file, setFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await documentService.myGet(id);
      setDoc(d);
      setName(d.ack?.declaredName || d.prefill?.name || '');
      setDesignation(d.ack?.declaredDesignation || '');
      setEmpId(d.ack?.declaredEmpId || '');
      setMethod(d.signModes === 'upload' ? 'upload' : 'digital');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const submitDigital = async (signatureBase64) => {
    if (!agree) { setError('Please tick "I have read and agree" first.'); return; }
    if (!name.trim()) { setError('Your name is required on the declaration.'); return; }
    setBusy(true); setError('');
    try {
      await documentService.acknowledge(id, {
        declaredName: name.trim(), declaredDesignation: designation.trim() || undefined,
        declaredEmpId: empId.trim() || undefined, agreed: true, signatureBase64,
      });
      setResigning(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not submit your signature');
    } finally {
      setBusy(false);
    }
  };

  const submitUpload = async () => {
    if (!file) { setError('Choose the signed page (photo or PDF) first.'); return; }
    setBusy(true); setError('');
    try {
      const base64Data = await readB64(file);
      await documentService.uploadSigned(id, {
        fileName: file.name, mimeType: file.type || 'application/octet-stream', base64Data,
        declaredName: name.trim() || undefined, declaredDesignation: designation.trim() || undefined,
        declaredEmpId: empId.trim() || undefined, agreed: true,
      });
      setResigning(false); setFile(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not upload the signed page');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const p = await documentService.myDocPdf(id);
      if (p?.dataUri) window.open(p.dataUri, '_blank');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'No PDF available — use Print instead');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error && !doc) return <Box sx={{ maxWidth: 820, mx: 'auto' }}><Alert severity="error" sx={{ mt: 3 }}>{error}</Alert></Box>;
  if (!doc) return null;

  const canDigital = doc.signModes === 'digital' || doc.signModes === 'both';
  const canUpload = doc.signModes === 'upload' || doc.signModes === 'both';
  const showForm = doc.requiresAck && (!doc.signed || resigning);

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', pb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<BackIcon />} color="inherit" onClick={() => navigate('/me/documents')} sx={{ minWidth: 0 }}>Back</Button>
        <Box sx={{ flex: 1 }} />
        <Chip size="small" label={`v${doc.version}`} sx={{ fontWeight: 700 }} />
        {doc.effectiveFrom && <Chip size="small" variant="outlined" label={`Effective ${fmtDate(doc.effectiveFrom)}`} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {doc.signed && !resigning && (
        <Alert
          icon={<SignedIcon fontSize="inherit" />} severity="success" sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={() => setResigning(true)}>Re-sign</Button>}
        >
          You signed this on {fmtDate(doc.ack?.acknowledgedAt)} · {doc.ack?.method === 'upload' ? 'uploaded signed page' : 'signed digitally'}.
        </Alert>
      )}

      {/* The document itself */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ px: { xs: 2, sm: 4 }, py: 3 }}>
          <DocumentBody html={doc.bodyHtml} />
        </CardContent>
      </Card>

      {!doc.requiresAck && (
        <Alert severity="info">This is a reference document — no signature needed.</Alert>
      )}

      {/* Sign block — the declaration continues straight from the document */}
      {showForm && (
        <Card variant="outlined" sx={{ borderColor: '#3366ff' }}>
          <CardContent>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#222b45', mb: 0.5 }}>Sign the declaration</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
              By signing you confirm you have read and agree to comply with this policy.
            </Typography>

            {doc.signModes === 'both' && (
              <ToggleButtonGroup
                exclusive size="small" value={method} onChange={(_, v) => v && setMethod(v)} sx={{ mb: 2 }}
              >
                <ToggleButton value="digital">Sign digitally</ToggleButton>
                <ToggleButton value="upload">Print &amp; upload</ToggleButton>
              </ToggleButtonGroup>
            )}

            <Stack spacing={1.5} sx={{ mb: 2, maxWidth: 460 }}>
              <TextField label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} required />
              <TextField label="Designation" size="small" value={designation} onChange={(e) => setDesignation(e.target.value)} />
              <TextField label="Employee ID (optional)" size="small" value={empId} onChange={(e) => setEmpId(e.target.value)} />
            </Stack>

            {method === 'digital' && canDigital && (
              <>
                <FormControlLabel
                  control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />}
                  label="I have read and agree to this policy."
                  sx={{ mb: 1, '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Draw your signature</Typography>
                <Box sx={{ maxWidth: 460 }}>
                  <SignaturePad onSave={submitDigital} saving={busy} label="Sign in the box, then press Save to submit" />
                </Box>
              </>
            )}

            {method === 'upload' && canUpload && (
              <Box sx={{ maxWidth: 520 }}>
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  Print the document, sign the last page by hand, then upload a photo or scan of it.
                </Alert>
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => printDocument(doc)}>Print</Button>
                  {doc.hasPdf && <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadPdf}>Download PDF</Button>}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Button component="label" variant="outlined" startIcon={<UploadIcon />} fullWidth sx={{ mb: 1.5 }}>
                  {file ? file.name : 'Choose signed page (photo / PDF)'}
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </Button>
                <Button variant="contained" onClick={submitUpload} disabled={busy || !file}>
                  {busy ? 'Uploading…' : 'Submit signed page'}
                </Button>
              </Box>
            )}

            {resigning && (
              <Button color="inherit" size="small" sx={{ mt: 2 }} onClick={() => setResigning(false)}>Cancel re-sign</Button>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
