import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Chip, Stack, IconButton, Divider, Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon, NotificationsActive as RemindIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import DocumentBody from './DocumentBody';
import { fmtDate } from '../../utils/date';

// God document detail — a full in-app screen (not a popup) that reads the policy and shows
// who has signed / who is pending, with Back returning to the Staff Documents list.
export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [acks, setAcks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [d, a] = await Promise.all([documentService.get(id), documentService.acks(id)]);
      setDoc(d); setAcks(a);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load document');
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const remind = async () => {
    try { const r = await documentService.remind(id); setToast(`Reminder sent to ${r.notified} staff`); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not send reminder'); }
  };

  const viewArtifact = async (row) => {
    const which = row.hasSignedPage ? 'page' : 'signature';
    try {
      const art = await documentService.ackArtifact(row.ackId, which);
      if (art?.dataUri) {
        const w = window.open('', '_blank');
        if (w) w.document.write(`<title>${row.employeeName}</title><iframe src="${art.dataUri}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`);
      }
    } catch (err) { setError(err.response?.data?.error?.description || 'Could not open'); }
  };

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', pb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<BackIcon />} color="inherit" onClick={() => navigate('/documents')} sx={{ minWidth: 0 }}>Staff Documents</Button>
        <Box sx={{ flex: 1 }} />
        {doc && <Chip size="small" label={`v${doc.version}`} sx={{ fontWeight: 700 }} />}
        {doc?.effectiveFrom && <Chip size="small" variant="outlined" label={`Effective ${fmtDate(doc.effectiveFrom)}`} />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !doc ? null : (
        <>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#222b45', mb: 2 }}>{doc.title}</Typography>

          {/* Compliance */}
          {doc.requiresAck && acks && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Chip label={`${acks.signedCount} signed`} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
                  <Chip label={`${acks.pendingCount} pending`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />
                  <Box sx={{ flex: 1 }} />
                  {acks.pendingCount > 0 && <Button size="small" variant="outlined" startIcon={<RemindIcon />} onClick={remind}>Remind pending</Button>}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Pending</Typography>
                    <Stack spacing={0.5}>
                      {acks.pending.map((r) => (
                        <Box key={r.employeeId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eef2f8' }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#222b45' }}>{r.employeeName}</Typography>
                          <Chip size="small" label="not signed" sx={{ bgcolor: '#fff5e0', color: '#8a6400' }} />
                        </Box>
                      ))}
                      {acks.pending.length === 0 && <Typography sx={{ fontSize: 12.5, color: '#00916e' }}>Everyone has signed. 🎉</Typography>}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Signed</Typography>
                    <Stack spacing={0.5}>
                      {acks.signed.map((r) => (
                        <Box key={r.ackId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eef2f8' }}>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#222b45' }}>{r.employeeName}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.method === 'upload' ? 'Uploaded page' : 'Digital'} · {fmtDate(r.acknowledgedAt)}</Typography>
                          </Box>
                          {(r.hasSignature || r.hasSignedPage) && <IconButton size="small" title="View signature" onClick={() => viewArtifact(r)}><ViewIcon fontSize="small" /></IconButton>}
                        </Box>
                      ))}
                      {acks.signed.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Nobody yet.</Typography>}
                    </Stack>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          <Divider sx={{ mb: 2 }}><Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '.06em' }}>Document</Typography></Divider>

          {/* The policy itself, read in-app */}
          <Card variant="outlined">
            <CardContent sx={{ px: { xs: 2, sm: 4 }, py: 3 }}>
              <DocumentBody html={doc.bodyHtml} />
            </CardContent>
          </Card>
        </>
      )}

      <Snackbar open={!!toast} autoHideDuration={2800} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
