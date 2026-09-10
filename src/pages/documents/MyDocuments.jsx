import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Chip, Stack,
} from '@mui/material';
import { ChevronRight as ChevronIcon, Description as DocIcon } from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import { fmtDate } from '../../utils/date';

export default function MyDocuments() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    documentService.myList()
      .then((d) => { if (alive) setDocs(d || []); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load documents'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const statusChip = (d) => {
    if (!d.signatureRequiredForMe) {
      return <Chip size="small" label={d.exemptForMe ? 'No signature needed' : 'Read only'} sx={{ bgcolor: '#eef1f7', color: '#5b6684', fontWeight: 700 }} />;
    }
    if (d.signed) return <Chip size="small" label={`Signed · ${fmtDate(d.ack?.acknowledgedAt)}`} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />;
    return <Chip size="small" label="Signature required" sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />;
  };

  const pending = docs.filter((d) => d.signatureRequiredForMe && !d.signed).length;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>My Documents</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3 }}>
        School policies and documents. {pending > 0 ? `${pending} need${pending === 1 ? 's' : ''} your signature.` : 'You are all caught up.'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : docs.length === 0 ? (
        <Alert severity="info">No documents shared with you yet.</Alert>
      ) : (
        <Stack spacing={1.25}>
          {docs.map((d) => (
            <Card
              key={d.uuid} variant="outlined"
              sx={{ cursor: 'pointer', '&:hover': { borderColor: '#3366ff' } }}
              onClick={() => navigate(`/me/documents/${d.uuid}`)}
            >
              <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DocIcon sx={{ color: d.signed ? '#00b887' : '#8f9bb3' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#222b45' }}>{d.title}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {d.effectiveFrom ? `Effective ${fmtDate(d.effectiveFrom)} · ` : ''}v{d.version}
                    </Typography>
                    <Box sx={{ mt: 0.75 }}>{statusChip(d)}</Box>
                  </Box>
                  <ChevronIcon sx={{ color: '#c3cad9' }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
