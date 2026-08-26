import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

// Draw-on-canvas signature pad (finger / mouse via Pointer Events). Calls onSave with the
// raw base64 PNG (no data: prefix). Self-contained; used on the invigilator PWA.
export default function SignaturePad({ onSave, saving, height = 170, label = 'Sign in the box below' }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.max(1, rect.width) * ratio;
    c.height = height * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
    ctxRef.current = ctx;
  }, [height]);

  useEffect(() => {
    setup();
    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setup]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => { e.preventDefault(); drawing.current = true; const { x, y } = pos(e); const ctx = ctxRef.current; ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const { x, y } = pos(e); const ctx = ctxRef.current; ctx.lineTo(x, y); ctx.stroke(); if (empty) setEmpty(false); };
  const up = () => { drawing.current = false; };

  const clear = () => { const c = canvasRef.current; ctxRef.current.clearRect(0, 0, c.width, c.height); setEmpty(true); };
  const save = () => {
    if (empty) return;
    onSave(canvasRef.current.toDataURL('image/png').split(',')[1]);
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Box
        component="canvas"
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        sx={{
          display: 'block', width: '100%', height, mt: 0.5,
          border: '1px dashed', borderColor: 'divider', borderRadius: 1,
          bgcolor: '#fff', touchAction: 'none', cursor: 'crosshair',
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" onClick={clear} disabled={saving}>Clear</Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" onClick={save} disabled={empty || saving}>
          {saving ? 'Saving…' : 'Save signature'}
        </Button>
      </Stack>
    </Box>
  );
}
