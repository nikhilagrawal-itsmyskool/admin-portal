import React, { useRef, useState, useEffect } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon, Description as WordIcon, Download as DownloadIcon,
} from '@mui/icons-material';
import { renderAsync } from 'docx-preview';
import { syllabusService } from '../../services/syllabusService';

export function b64toBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

// Inline document viewer — renders a model-paper .docx straight in the browser
// (docx-preview) so staff read a paper without leaving the page; a ready PDF
// shows via an iframe. `target` = { docId, format, title } or null.
export default function DocPreviewDialog({ target, onClose }) {
  const bodyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const open = Boolean(target);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true); setError('');
    (async () => {
      try {
        const r = await syllabusService.getModelPaperFile(target.docId, target.format);
        if (cancelled) return;
        const blob = b64toBlob(r.base64Data, r.mimeType);
        const container = bodyRef.current;
        if (!container) return;
        container.innerHTML = '';
        if (target.format === 'docx') {
          await renderAsync(blob, container, null, {
            className: 'docx-render', inWrapper: true, ignoreWidth: false,
            ignoreHeight: false, breakPages: true, renderHeaders: true, renderFooters: true,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const frame = document.createElement('iframe');
          frame.src = url;
          frame.style.cssText = 'width:100%;height:100%;min-height:70vh;border:0;';
          container.appendChild(frame);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error?.description || 'Failed to load document');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, target?.docId, target?.format]);

  const download = async () => {
    try {
      const r = await syllabusService.getModelPaperFile(target.docId, target.format);
      const url = URL.createObjectURL(b64toBlob(r.base64Data, r.mimeType));
      const a = document.createElement('a');
      a.href = url; a.download = r.fileName || 'document';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { /* ignore */ }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        {target?.format === 'docx' ? <WordIcon fontSize="small" /> : <PdfIcon fontSize="small" />}
        <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 0 }} noWrap>{target?.title}</Typography>
        <Button size="small" startIcon={<DownloadIcon />} onClick={download}>Download</Button>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#e9ecef', position: 'relative' }}>
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        <Box ref={bodyRef} sx={{ height: '100%', overflow: 'auto', '& .docx-render': { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 } }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
