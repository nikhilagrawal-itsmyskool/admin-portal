import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Divider, CircularProgress } from '@mui/material';
import { CheckCircle as OkIcon, Cancel as CancelledIcon, HelpOutline as UnknownIcon, QrCodeScanner as ScanIcon, Replay as AgainIcon } from '@mui/icons-material';
import { feesService } from '../../services/feesService';
import { errMsg, inr, FEE_COLORS } from './feesUi';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); if (isNaN(d)) return String(s); return `${String(d.getUTCDate()).padStart(2, '0')}-${MON[d.getUTCMonth()]}-${d.getUTCFullYear()}`; };
// Pull the receipt uuid out of whatever the QR held: a public verify URL, an imsk:<type>:<uuid> token, or a bare uuid.
const extractUuid = (text) => {
  const s = String(text || '').trim();
  const m = s.match(/imsk:[^:]+:([a-z0-9]{6,16})/i) || s.match(/verify\/receipt\/([a-z0-9]{6,16})/i) || s.match(/^([a-z0-9]{6,16})$/i);
  return m ? m[1] : null;
};

// Staff Scan & Verify (admin/god) — camera-scan a receipt QR (any type incl transport) to confirm it
// came from our system. Uses the native BarcodeDetector (Android Chrome); phone-only by nature.
export default function ScanVerify() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null; setScanning(false);
  }, []);

  const onCode = useCallback(async (raw) => {
    stop();
    const uuid = extractUuid(raw);
    if (!uuid) { setError('That QR isn’t a receipt code.'); return; }
    setBusy(true); setError('');
    try { setResult(await feesService.verifyReceiptStaff(uuid)); }
    catch (e) { setError(errMsg(e, 'Could not verify — try again.')); }
    finally { setBusy(false); }
  }, [stop]);

  const start = useCallback(async () => {
    setError(''); setResult(null);
    if (!supported) { setError('This browser can’t scan in-app. Open in Chrome on Android.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setScanning(true);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try { const codes = await detector.detect(videoRef.current); if (codes && codes.length) return onCode(codes[0].rawValue); } catch { /* frame skip */ }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch { setError('Camera access denied or unavailable.'); }
  }, [supported, onCode]);

  useEffect(() => { start(); return stop; /* eslint-disable-next-line */ }, []);

  const genuine = result?.found && result?.genuine;
  const cancelled = result?.found && result?.cancelled;
  const notFound = result && !result.found;
  const accent = genuine ? '#15803d' : cancelled ? '#b91c1c' : '#64748b';

  const Row = ({ k, v }) => <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, fontSize: 14 }}><span style={{ color: '#64748b' }}>{k}</span><b>{v}</b></Box>;

  return (
    <Box sx={{ maxWidth: 460, mx: 'auto', p: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 0.5 }}>Scan &amp; Verify</Typography>
      <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13, mb: 2 }}>Point the camera at a receipt’s QR to confirm it’s genuine.</Typography>

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {!result && (
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ position: 'relative', bgcolor: '#0f172a', aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
            {!scanning && !busy && <Box sx={{ textAlign: 'center', color: '#94a3b8' }}><ScanIcon sx={{ fontSize: 56 }} /><Typography sx={{ mt: 1 }}>Camera off</Typography></Box>}
            {busy && <CircularProgress sx={{ color: '#fff' }} />}
            {scanning && <Box sx={{ position: 'absolute', inset: '18% 16%', border: '3px solid rgba(255,255,255,.85)', borderRadius: 3, boxShadow: '0 0 0 100vmax rgba(0,0,0,.25)' }} />}
          </Box>
          <CardContent sx={{ textAlign: 'center' }}>
            {scanning ? <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Scanning… hold the QR steady</Typography>
              : <Button variant="contained" startIcon={<ScanIcon />} onClick={start} disabled={busy}>Start camera</Button>}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ textAlign: 'center', py: 3, bgcolor: genuine ? '#f0fdf4' : cancelled ? '#fef2f2' : '#f8fafc' }}>
            {notFound ? <UnknownIcon sx={{ fontSize: 58, color: accent }} /> : genuine ? <OkIcon sx={{ fontSize: 58, color: accent }} /> : <CancelledIcon sx={{ fontSize: 58, color: accent }} />}
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: accent, mt: 1 }}>
              {notFound ? 'Not found' : genuine ? 'Genuine receipt' : 'Cancelled receipt'}
            </Typography>
            {result.schoolName && <Typography sx={{ color: '#475569', fontSize: 13 }}>{result.schoolName}</Typography>}
          </Box>
          {result.found && (
            <CardContent>
              <Row k="Type" v={(result.type || 'fee').replace(/^\w/, (c) => c.toUpperCase())} />
              <Row k="Receipt No" v={result.receiptNo || '—'} />
              <Row k="Date" v={fmtDate(result.date)} />
              <Row k="Amount paid" v={inr(result.amount)} />
              <Row k="Status" v={cancelled ? 'Cancelled' : result.fullyPaid ? 'Fully paid' : `Balance ${inr(result.balance)}`} />
              <Divider sx={{ my: 1 }} />
              <Row k="Student" v={[result.studentName, result.className].filter(Boolean).join(' · ') || '—'} />
              {result.admissionNo && <Row k="Admission" v={result.admissionNo} />}
            </CardContent>
          )}
          <CardContent sx={{ pt: 0, textAlign: 'center' }}>
            <Button startIcon={<AgainIcon />} onClick={start}>Scan another</Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
