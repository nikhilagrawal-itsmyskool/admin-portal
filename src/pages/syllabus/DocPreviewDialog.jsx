import React, { useRef, useState, useEffect } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  useMediaQuery, useTheme, IconButton,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon, Description as WordIcon, Download as DownloadIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { renderAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { syllabusService } from '../../services/syllabusService';

// pdf.js renders in a web worker; point it at the bundled worker (Vite emits a URL).
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

export function b64toBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}
function b64toBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Render every page of a PDF (given as base64) to canvases inside `container`.
// Uses pdf.js so it renders on every browser — mobile Safari/Chrome won't show a
// PDF in an <iframe>, which is why the old inline preview came up blank on phones.
async function renderPdf(base64, container, isCancelled) {
  const bytes = b64toBytes(base64);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.min((container.clientWidth || 800) - 8, 1100);
  for (let n = 1; n <= pdf.numPages; n += 1) {
    if (isCancelled()) break;
    const page = await pdf.getPage(n); // eslint-disable-line no-await-in-loop
    const base = page.getViewport({ scale: 1 });
    const scale = targetW / base.width;
    const viewport = page.getViewport({ scale: scale * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.cssText = `width:100%;max-width:${targetW}px;height:auto;display:block;margin:8px auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);`;
    container.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; // eslint-disable-line no-await-in-loop
  }
}

// Full-page inline document viewer — renders a model-paper .docx (docx-preview) or
// PDF (pdf.js) straight in the app, full-screen on phones, so staff read a paper
// without leaving the page. `target` = { docId, format, title } or null.
export default function DocPreviewDialog({ target, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const bodyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const open = Boolean(target);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const isCancelled = () => cancelled;
    setLoading(true); setError('');
    (async () => {
      try {
        const r = await syllabusService.getModelPaperFile(target.docId, target.format);
        if (cancelled) return;
        const container = bodyRef.current;
        if (!container) return;
        container.innerHTML = '';
        if (target.format === 'docx') {
          const blob = b64toBlob(r.base64Data, r.mimeType);
          await renderAsync(blob, container, null, {
            className: 'docx-render', inWrapper: true, ignoreWidth: false,
            ignoreHeight: false, breakPages: true, renderHeaders: true, renderFooters: true,
          });
        } else {
          await renderPdf(r.base64Data, container, isCancelled);
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
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: fullScreen ? undefined : { height: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        {target?.format === 'docx' ? <WordIcon fontSize="small" /> : <PdfIcon fontSize="small" />}
        <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 0 }} noWrap>{target?.title}</Typography>
        <Button size="small" startIcon={<DownloadIcon />} onClick={download}>Download</Button>
        {fullScreen && <IconButton size="small" onClick={onClose} edge="end"><CloseIcon /></IconButton>}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#e9ecef', position: 'relative' }}>
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        <Box ref={bodyRef} sx={{ height: '100%', overflow: 'auto', p: 1, '& .docx-render': { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 } }} />
      </DialogContent>
      {!fullScreen && (
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
