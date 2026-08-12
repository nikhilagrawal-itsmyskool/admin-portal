import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, CircularProgress, Divider } from '@mui/material';
import { CheckCircle as OkIcon, Cancel as CancelledIcon, HelpOutline as UnknownIcon } from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s); if (isNaN(d)) return String(s);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')}-${M[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
};

// PUBLIC page (no login) — reached by scanning a fee receipt's QR. Confirms the receipt is genuine
// against our system, keyed on the unguessable receipt uuid.
export default function VerifyReceipt() {
  const { uuid } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: false });

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/fees/verify/receipt/${encodeURIComponent(uuid)}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, data: d, error: false }))
      .catch(() => alive && setState({ loading: false, data: null, error: true }));
    return () => { alive = false; };
  }, [uuid]);

  const { loading, data, error } = state;
  const genuine = data?.found && data?.genuine;
  const cancelled = data?.found && data?.cancelled;
  const notFound = !loading && (error || !data?.found);

  const accent = genuine ? '#15803d' : cancelled ? '#b91c1c' : '#64748b';
  const bg = genuine ? '#f0fdf4' : cancelled ? '#fef2f2' : '#f8fafc';

  const Row = ({ k, v }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, fontSize: 14 }}>
      <span style={{ color: '#64748b' }}>{k}</span><b style={{ color: '#0f172a' }}>{v}</b>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eef1f6', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, fontFamily: "'Segoe UI', Roboto, Arial, sans-serif" }}>
      <Card sx={{ width: '100%', maxWidth: 380, borderRadius: 3, overflow: 'hidden', boxShadow: '0 10px 40px rgba(15,23,42,.15)' }}>
        {loading ? (
          <CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={30} /><Typography sx={{ mt: 2, color: '#64748b' }}>Verifying…</Typography></CardContent>
        ) : notFound ? (
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <UnknownIcon sx={{ fontSize: 56, color: '#94a3b8' }} />
            <Typography sx={{ fontWeight: 800, fontSize: 18, mt: 1 }}>Cannot verify</Typography>
            <Typography sx={{ color: '#64748b', fontSize: 14, mt: 0.5 }}>
              {data?.restricted ? 'This receipt can only be verified by school staff.' : 'No matching receipt found in the system.'}
            </Typography>
          </CardContent>
        ) : (
          <>
            <Box sx={{ bgcolor: bg, textAlign: 'center', py: 3, borderBottom: `1px solid ${accent}22` }}>
              {genuine ? <OkIcon sx={{ fontSize: 60, color: accent }} /> : <CancelledIcon sx={{ fontSize: 60, color: accent }} />}
              <Typography sx={{ fontWeight: 800, fontSize: 20, color: accent, mt: 1 }}>
                {genuine ? 'Genuine receipt' : 'Cancelled receipt'}
              </Typography>
              <Typography sx={{ color: '#475569', fontSize: 13 }}>{data.schoolName || ''}</Typography>
            </Box>
            <CardContent>
              <Row k="Receipt No" v={data.receiptNo || '—'} />
              <Row k="Date" v={fmtDate(data.date)} />
              <Row k="Amount paid" v={inr(data.amount)} />
              <Row k="Status" v={cancelled ? 'Cancelled' : data.fullyPaid ? 'Fully paid' : 'Part paid'} />
              <Divider sx={{ my: 1 }} />
              <Row k="Student" v={[data.studentName, data.className].filter(Boolean).join(' · ') || '—'} />
              <Typography sx={{ color: '#94a3b8', fontSize: 11, mt: 2, textAlign: 'center' }}>
                Verified against the ItsMySkool system · {new Date().getFullYear()}
              </Typography>
            </CardContent>
          </>
        )}
      </Card>
    </Box>
  );
}
