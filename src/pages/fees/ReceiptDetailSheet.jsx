import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, CircularProgress, Chip, Button, Alert,
} from '@mui/material';
import { Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { feesService } from '../../services/feesService';
import { inr, fmtDate, errMsg, openReceipt, PAYMENT_MODE_LABELS, FEE_COLORS } from './feesUi';

// Slide-up sheet showing a receipt's breakdown in-app (no print tab needed). Reused by the
// dashboard "Recent receipts" list and the Receipts search list. Loads the line items lazily
// via getReceiptById (head · cycle · amount, concessions, waiver, total) on open.
export default function ReceiptDetailSheet({ receiptId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [r, setR] = useState(null);

  useEffect(() => {
    if (!open || !receiptId) return;
    let alive = true;
    setLoading(true); setError(''); setR(null);
    feesService.getReceiptById(receiptId)
      .then((d) => { if (alive) setR(d); })
      .catch((err) => { if (alive) setError(errMsg(err, 'Could not load the receipt')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, receiptId]);

  const lines = (r?.lines || []);
  const charges = lines.filter((l) => !l.isConcession);
  const concessions = lines.filter((l) => l.isConcession);
  const cancelled = r?.status === 'cancelled';

  const Row = ({ label, sub, value, color, strong }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, py: 0.6 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: strong ? 700 : 500 }} noWrap>{label}</Typography>
        {sub && <Typography sx={{ fontSize: 11.5, color: FEE_COLORS.muted }} noWrap>{sub}</Typography>}
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: strong ? 700 : 600, color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );

  return (
    <Drawer
      anchor="bottom" open={open} onClose={onClose}
      PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh' } }}
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        {/* grab handle */}
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={26} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : r ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }} noWrap>
                  {r.payerName || '—'}{r.payerClassSnapshot ? <Typography component="span" sx={{ color: FEE_COLORS.muted, fontWeight: 500, fontSize: 13 }}> · {r.payerClassSnapshot}</Typography> : null}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted }}>
                  #{r.receiptNo || r.legacyReceiptNo || '—'} · {r.receiptDate ? fmtDate(r.receiptDate) : '—'} · {PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}
                  {r.admissionNoSnapshot ? ` · ${r.admissionNoSnapshot}` : ''}
                </Typography>
              </Box>
              <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            </Box>

            {cancelled && (
              <Chip size="small" color="error" sx={{ mt: 1 }}
                label={r.cancelReason ? `Cancelled · ${r.cancelReason}` : 'Cancelled'} />
            )}

            <Divider sx={{ my: 1.5 }} />

            {charges.length === 0 && concessions.length === 0 && (
              <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted, py: 1 }}>No line-item breakdown recorded for this receipt.</Typography>
            )}

            {charges.map((l, i) => (
              <Row key={`c${i}`} label={l.headLabel || 'Fee'} sub={l.cycleLabel || undefined} value={inr(l.amount)} />
            ))}

            {concessions.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                {concessions.map((l, i) => (
                  <Row key={`d${i}`} label={l.headLabel || 'Concession'} sub={l.cycleLabel || undefined}
                    value={`− ${inr(Math.abs(l.amount))}`} color={FEE_COLORS.success} />
                ))}
              </>
            )}

            {Number(r.waiverTotal) > 0 && (
              <Row label="Waived" value={`− ${inr(r.waiverTotal)}`} color={FEE_COLORS.success} />
            )}
            {Number(r.advanceApplied) > 0 && (
              <Row label="Advance applied" value={`− ${inr(r.advanceApplied)}`} color={FEE_COLORS.primary} />
            )}

            <Divider sx={{ my: 1 }} />
            <Row label="Total paid" value={inr(r.totalPaid)} strong
              color={cancelled ? FEE_COLORS.muted : 'inherit'} />

            <Button fullWidth variant="outlined" startIcon={<PrintIcon />} sx={{ mt: 2 }}
              onClick={() => openReceipt(r.uuid)}>
              Print receipt
            </Button>
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}
