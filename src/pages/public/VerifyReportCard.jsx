import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, CircularProgress, Divider } from '@mui/material';
import { Verified as VerifiedIcon, HelpOutline as UnknownIcon } from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// PUBLIC page (no login) — reached by scanning a report card's QR. Confirms the card is genuine and
// shows ONLY the celebratory summary already printed on it (school, student name + class, result).
// No parents / DOB / admission no / contacts / attendance / remark — nothing beyond the card.
export default function VerifyReportCard() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: false });

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/examination/verify/report/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, data: d, error: false }))
      .catch(() => alive && setState({ loading: false, data: null, error: true }));
    return () => { alive = false; };
  }, [token]);

  const { loading, data, error } = state;
  const ok = data?.found && data?.verified;
  const notFound = !loading && (error || !data?.found);
  const navy = '#37407e';
  const green = '#15803d';

  const Crest = ({ uri }) => (
    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {uri ? <img src={uri} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null}
    </Box>
  );
  const Row = ({ k, v }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, fontSize: 14 }}>
      <span style={{ color: '#64748b' }}>{k}</span><b style={{ color: '#0f172a', textAlign: 'right' }}>{v}</b>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eef1f6', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, fontFamily: "'Segoe UI', Roboto, Arial, sans-serif" }}>
      <Card sx={{ width: '100%', maxWidth: 400, borderRadius: 3, overflow: 'hidden', boxShadow: '0 12px 44px rgba(15,23,42,.18)' }}>
        {loading ? (
          <CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={30} /><Typography sx={{ mt: 2, color: '#64748b' }}>Verifying…</Typography></CardContent>
        ) : notFound ? (
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <UnknownIcon sx={{ fontSize: 56, color: '#94a3b8' }} />
            <Typography sx={{ fontWeight: 800, fontSize: 18, mt: 1 }}>Cannot verify</Typography>
            <Typography sx={{ color: '#64748b', fontSize: 14, mt: 0.5 }}>No matching report card found in the system.</Typography>
          </CardContent>
        ) : (
          <>
            <Box sx={{ bgcolor: navy, color: '#f3f2ea', px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Crest uri={data.boardLogoDataUri || data.logoDataUri} />
              <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#e7c869', lineHeight: 1.15 }}>{data.schoolName || 'Report Card'}</Typography>
                {data.affiliationNo && <Typography sx={{ fontSize: 11, opacity: 0.9 }}>Affiliation No. {data.affiliationNo}</Typography>}
              </Box>
              <Crest uri={data.logoDataUri || data.boardLogoDataUri} />
            </Box>

            <Box sx={{ bgcolor: '#f0fdf4', textAlign: 'center', py: 2.5, borderBottom: `1px solid ${green}22` }}>
              <VerifiedIcon sx={{ fontSize: 54, color: green }} />
              <Typography sx={{ fontWeight: 800, fontSize: 19, color: green, mt: 0.5 }}>Genuine Report Card</Typography>
              <Typography sx={{ color: '#475569', fontSize: 12.5 }}>Verified as issued by the school</Typography>
            </Box>

            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#0f172a' }}>{data.studentName || '—'}</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 14 }}>
                  {[data.className ? `Class ${data.className}` : null, data.academicYear, data.term ? `Term ${data.term}` : null].filter(Boolean).join(' · ')}
                </Typography>
              </Box>

              {data.percentage != null && (
                <Box sx={{ display: 'flex', gap: 1.25, mb: 1 }}>
                  <Box sx={{ flex: 1, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Percentage</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 26, color: navy }}>{data.percentage}%</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Marks</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 26, color: navy }}>{data.total}<span style={{ fontSize: 15, color: '#94a3b8' }}>/{data.max}</span></Typography>
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>
                Verified against the ItsMySkool system · {new Date().getFullYear()}
              </Typography>
            </CardContent>
          </>
        )}
      </Card>
    </Box>
  );
}
