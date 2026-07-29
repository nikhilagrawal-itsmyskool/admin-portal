import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton, Stack, Alert, CircularProgress, Tooltip,
} from '@mui/material';
import {
  UploadFile as UploadIcon, Download as DownloadIcon, Delete as DeleteIcon, Description as DocIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';

const ACCEPT = '.doc,.docx,.pdf,.xlsx,.xls,.odt,.txt';

function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function b64toBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}
function fmtSize(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(s) {
  if (!s) return '';
  try { return new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

// The source reference document (Word/PDF the assembly was built from) for one kind
// ('plan' | 'checklist' | 'grading'). Upload/replace, download, delete. Self-contained:
// fetches the school's docs and shows the one for `kind`.
export default function ReferenceDocCard({ kind, title, hint, canManage }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (list) => (list || []).find((d) => d.kind === kind) || null;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try { const list = await assemblyService.getDocuments(); if (alive) setDoc(pick(list)); }
      catch { if (alive) setError('Failed to load the reference document'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [kind]);

  const onUpload = async (file) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const base64Data = await readFileB64(file);
      const list = await assemblyService.uploadDocument({ kind, fileName: file.name, mimeType: file.type || undefined, base64Data });
      setDoc(pick(list));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (!doc) return;
    setError('');
    try {
      const r = await assemblyService.getDocumentFile(doc.uuid);
      const url = URL.createObjectURL(b64toBlob(r.base64Data, r.mimeType));
      const a = document.createElement('a');
      a.href = url; a.download = r.fileName || doc.fileName || 'document';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Download failed');
    }
  };

  const onDelete = async () => {
    if (!doc) return;
    setBusy(true); setError('');
    try { const list = await assemblyService.deleteDocument(doc.uuid); setDoc(pick(list)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Delete failed'); }
    finally { setBusy(false); }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{hint}</Typography>}
        {error && <Alert severity="error" sx={{ my: 1 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Box sx={{ py: 1 }}><CircularProgress size={20} /></Box>
        ) : doc ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
            <DocIcon color="action" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{doc.fileName || 'document'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {[fmtSize(doc.sizeBytes), doc.uploadedAt && `uploaded ${fmtDate(doc.uploadedAt)}`, doc.uploadedByName && `by ${doc.uploadedByName}`].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" startIcon={<DownloadIcon />} onClick={onDownload}>Download</Button>
              {canManage && (
                <Button size="small" component="label" startIcon={<UploadIcon />} disabled={busy}>
                  Replace
                  <input hidden type="file" accept={ACCEPT} onChange={(e) => onUpload(e.target.files?.[0])} />
                </Button>
              )}
              {canManage && (
                <Tooltip title="Remove document">
                  <IconButton size="small" color="error" onClick={onDelete} disabled={busy}><DeleteIcon fontSize="small" /></IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        ) : canManage ? (
          <Button component="label" variant="outlined" startIcon={<UploadIcon />} disabled={busy} sx={{ mt: 1 }}>
            {busy ? 'Uploading…' : 'Upload document'}
            <input hidden type="file" accept={ACCEPT} onChange={(e) => onUpload(e.target.files?.[0])} />
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No document uploaded yet.</Typography>
        )}
      </CardContent>
    </Card>
  );
}
