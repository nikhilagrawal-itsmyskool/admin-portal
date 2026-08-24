import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { SwapHoriz as ChangeIcon } from '@mui/icons-material';
import { feesService } from '../../services/feesService';
import { inr, errMsg, FEE_COLORS } from './feesUi';
import ChangeConcessionDialog from './ChangeConcessionDialog';

const stateChip = (s) => {
  if (s === 'advance') return <Chip size="small" color="secondary" variant="outlined" label="advance" />;
  if (s === 'due') return <Chip size="small" color="error" label="due" />;
  if (s === 'partial') return <Chip size="small" color="warning" label="part-paid" />;
  return <Chip size="small" color="success" variant="outlined" label="covered" />;
};

// Per-student concession timeline + the mid-year "Change concession" action (via ChangeConcessionDialog).
export default function ConcessionTimeline({ studentId, academicYearId, canManage, studentName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [data, setData] = useState({ cycles: [], changes: [], currentSchemes: [] });
  const [cycleName, setCycleName] = useState({}); // uuid -> name, for change markers
  const [changeOpen, setChangeOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!studentId || !academicYearId) return;
      setLoading(true); setError('');
      try {
        const [tl, cyc] = await Promise.all([
          feesService.getConcessionTimeline(studentId, academicYearId),
          feesService.getCycles(academicYearId).catch(() => []),
        ]);
        if (!alive) return;
        setData(tl || { cycles: [] });
        const m = {}; (cyc || []).forEach((c) => { m[c.uuid] = c.name; }); setCycleName(m);
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load concession timeline')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [studentId, academicYearId, refresh]);

  const markerByCycle = useMemo(() => {
    const m = {};
    (data.changes || []).forEach((ch) => { const nm = cycleName[ch.effectiveFromCycle]; if (nm) (m[nm] ||= []).push(ch); });
    return m;
  }, [data.changes, cycleName]);

  const onApplied = (r) => {
    const parts = [];
    if (r.totalDue) parts.push(`${inr(r.totalDue)} more due`);
    if (r.totalReduced) parts.push(`${inr(r.totalReduced)} less due`);
    if (r.totalAdvance) parts.push(`${inr(r.totalAdvance)} advance`);
    setOk(`${r.transition} from ${r.fromCycle} — ${parts.join(', ') || 'no change'}.`);
    setRefresh((k) => k + 1);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setOk('')}>{ok}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {(data.currentSchemes || []).length === 0
            ? <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted }}>No active concession scheme.</Typography>
            : (data.currentSchemes || []).map((s) => (
              <Chip key={s.name} size="small" variant="outlined" label={`${s.name}${s.heads?.length ? ` · ${[...new Set(s.heads)].join(', ')}` : ''}`} />
            ))}
        </Box>
        {canManage && (
          <Button size="small" variant="outlined" startIcon={<ChangeIcon />} onClick={() => setChangeOpen(true)}>
            Change concession
          </Button>
        )}
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Cycle</TableCell><TableCell>Scheme(s)</TableCell>
            <TableCell align="right">Fee</TableCell><TableCell align="right">Conc.</TableCell>
            <TableCell align="right">Net</TableCell><TableCell align="right">Paid</TableCell><TableCell>State</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {(data.cycles || []).length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ color: FEE_COLORS.muted, py: 2 }}>No fee cycles charged this year.</TableCell></TableRow>
            )}
            {(data.cycles || []).map((c) => (
              <React.Fragment key={c.cycle}>
                {(markerByCycle[c.cycle] || []).map((ch, i) => (
                  <TableRow key={`m-${c.cycle}-${i}`}>
                    <TableCell colSpan={7} sx={{ bgcolor: 'action.hover', color: FEE_COLORS.warning, fontSize: 12, fontWeight: 600, py: 0.5 }}>
                      ▲ change · from {c.cycle} · &quot;{ch.changeReason}&quot;
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow hover>
                  <TableCell>{c.cycle}</TableCell>
                  <TableCell sx={{ color: c.schemes?.length ? 'inherit' : FEE_COLORS.muted, fontStyle: c.schemes?.length ? 'normal' : 'italic' }}>
                    {c.schemes?.length ? c.schemes.join(' + ') : '— none —'}
                  </TableCell>
                  <TableCell align="right">{inr(c.fee)}</TableCell>
                  <TableCell align="right">{c.concession ? '−' + inr(c.concession) : '0'}</TableCell>
                  <TableCell align="right">{inr(c.net)}</TableCell>
                  <TableCell align="right" sx={{ color: FEE_COLORS.success }}>{inr(c.paid)}</TableCell>
                  <TableCell>{stateChip(c.state)}</TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>

      <ChangeConcessionDialog
        open={changeOpen}
        studentId={studentId}
        studentName={studentName}
        academicYearId={academicYearId}
        onClose={() => setChangeOpen(false)}
        onApplied={onApplied}
      />
    </Box>
  );
}
