import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Payments as PaymentsIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { inr, errMsg, FEE_COLORS } from '../fees/feesUi';

// Read-only fees summary for the student 360° view (admin/god gated by the caller).
export default function StudentFeesPanel({ studentId }) {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const [sm, led] = await Promise.all([
          feesService.getStudentSummary(studentId, academicYearId).catch(() => null),
          feesService.getStudentLedger(studentId, academicYearId),
        ]);
        if (!alive) return;
        setSummary(sm);
        setLines(led?.lines || []);
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load fees')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [studentId, academicYearId]);

  const due = lines.filter((l) => l.remaining > 0).slice(0, 6);
  const paidLines = lines.filter((l) => l.remaining <= 0 && l.paid > 0).slice(0, 2);
  const rows = [...due, ...paidLines];

  const kpi = (label, value, color) => (
    <Card variant="outlined" sx={{ borderLeft: `4px solid ${color}` }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentsIcon fontSize="small" sx={{ color: FEE_COLORS.primary }} /> Fees &amp; Dues
        </Typography>
        <Button size="small" variant="outlined" onClick={() => navigate('/fees/collect')}>Collect →</Button>
      </CardContent>

      <CardContent sx={{ pt: 0 }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={4}>{kpi('Paid this year', inr(summary?.paid || 0), FEE_COLORS.success)}</Grid>
              <Grid item xs={4}>{kpi('Outstanding', inr(summary?.outstanding || 0), FEE_COLORS.danger)}</Grid>
              <Grid item xs={4}>{kpi('Advance held', inr(summary?.advance || 0), FEE_COLORS.warning)}</Grid>
            </Grid>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Status</TableCell><TableCell>Cycle</TableCell><TableCell>Head</TableCell><TableCell align="right">Due</TableCell></TableRow></TableHead>
                <TableBody>
                  {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No fee activity this year.</TableCell></TableRow>}
                  {rows.map((l) => (
                    <TableRow key={l.chargeId} hover>
                      <TableCell>
                        {l.remaining <= 0
                          ? <Chip size="small" color="success" label="Paid" />
                          : l.status === 'partial'
                            ? <Chip size="small" color="warning" label="Part-paid" />
                            : <Chip size="small" color="error" label="Due" />}
                      </TableCell>
                      <TableCell>{l.cycleLabel || '—'}</TableCell>
                      <TableCell>{l.headLabel}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: l.remaining > 0 ? FEE_COLORS.danger : FEE_COLORS.muted }}>{inr(l.remaining)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
              <Typography sx={{ fontSize: 11, color: FEE_COLORS.muted }}>Read-only summary · fines pulled into the ledger.</Typography>
              <Typography sx={{ fontWeight: 700 }}>Outstanding: <span style={{ color: FEE_COLORS.danger }}>{inr(summary?.outstanding || 0)}</span></Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
