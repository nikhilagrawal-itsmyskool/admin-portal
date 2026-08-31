import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Alert, Divider, CircularProgress } from '@mui/material';
import { CheckCircle as OkIcon, Cancel as CancelledIcon, HelpOutline as UnknownIcon, QrCodeScanner as ScanIcon, Replay as AgainIcon } from '@mui/icons-material';
import jsQR from 'jsqr';
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

// Staff Scan & Verify (admin/god) — camera-scan a receipt QR (any type incl transport). Decodes with
// jsQR (pure-JS). Video is always mounted (a hidden video can pause and starve the decoder).
export default function ScanVerify() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [dbg, setDbg] = useState(''); // small diagnostic line: camera size + frames tried

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null; setScanning(false);
  }, []);

  const onCode = useCallback(async (raw) => {
    stop();
    // Admit-card QR (imsk:admit:<id>) → hand off to the examination verify page.
    const admit = String(raw || '').match(/imsk:admit:([a-z0-9]{6,16})/i);
    if (admit) { navigate(`/examinations/verify/${admit[1]}`); return; }
    const uuid = extractUuid(raw);
    if (!uuid) { setError(`Scanned "${String(raw).slice(0, 40)}" — not a receipt code.`); return; }
    setBusy(true); setError('');
    try { setResult(await feesService.verifyReceiptStaff(uuid)); }
    catch (e) { setError(errMsg(e, 'Could not verify — try again.')); }
    finally { setBusy(false); }
  }, [stop]);

  const framesRef = useRef(0);
  const scan = useCallback(() => {
    const v = videoRef.current;
    if (!streamRef.current || !v) return;
    if (v.readyState >= 2 && v.videoWidth) {
      const c = canvasRef.current || (canvasRef.current = document.createElement('canvas'));
      // Decode at full camera resolution (don't downscale to 1024) — small/dense QRs like the
      // admit-card code need every pixel for jsQR to resolve the modules.
      const W = Math.min(v.videoWidth, 1920), s = W / v.videoWidth, H = Math.round(v.videoHeight * s);
      c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, W, H);
      const img = ctx.getImageData(0, 0, W, H);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      framesRef.current += 1;
      if (framesRef.current % 5 === 0) setDbg(`cam ${v.videoWidth}×${v.videoHeight} · frames ${framesRef.current}`);
      if (code && code.data) { onCode(code.data); return; }
    } else {
      setDbg(`waiting for camera… (readyState ${v.readyState}, ${v.videoWidth}×${v.videoHeight})`);
    }
    timerRef.current = setTimeout(scan, 90);
  }, [onCode]);

  const start = useCallback(async () => {
    setError(''); setResult(null); setDbg('starting camera…'); framesRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setScanning(true);
      const v = videoRef.current;
      if (v) { v.srcObject = stream; v.setAttribute('playsinline', 'true'); try { await v.play(); } catch { /* muted autoplay */ } }
      timerRef.current = setTimeout(scan, 250);
    } catch (e) { setError('Camera access denied or unavailable — allow camera for this site.'); setScanning(false); setDbg(String(e?.name || e)); }
  }, [scan]);

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
          <Box sx={{ position: 'relative', bgcolor: '#0f172a', aspectRatio: '3 / 4' }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {!scanning && !busy && <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><ScanIcon sx={{ fontSize: 56 }} /><Typography sx={{ mt: 1 }}>Camera off</Typography></Box>}
            {busy && <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,.3)' }}><CircularProgress sx={{ color: '#fff' }} /></Box>}
            {scanning && <Box sx={{ position: 'absolute', inset: '18% 14%', border: '3px solid rgba(255,255,255,.9)', borderRadius: 3 }} />}
          </Box>
          <CardContent sx={{ textAlign: 'center' }}>
            {scanning ? <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Hold the QR steady, fairly close, inside the box</Typography>
              : <Button variant="contained" startIcon={<ScanIcon />} onClick={start} disabled={busy}>Start camera</Button>}
            {dbg && <Typography sx={{ color: '#cbd5e1', fontSize: 10, mt: 0.5 }}>{dbg}</Typography>}
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
