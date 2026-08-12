import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, InputAdornment, CircularProgress, Alert, FormControlLabel, Switch, Chip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { errMsg, inr, FEE_COLORS } from './feesUi';
import { fmtDate } from '../../utils/date';

export default function FineExemptions() {
  const { academicYearId } = useAcademicYear();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [allYears, setAllYears] = useState(false);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, search, allYears]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = { search: search.trim() || undefined };
      if (!allYears) params.academicYearId = academicYearId; // active search spans all years too
      setRows(await feesService.getFineExemptions(params));
    } catch (e) { setError(errMsg(e, 'Failed to load fine exemptions')); }
    finally { setLoading(false); }
  };

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 20 }}>Fine Exemptions</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Late fees waived at the counter or via import — who, when, and why.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControlLabel control={<Switch size="small" checked={allYears} onChange={(e) => setAllYears(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>All years</span>} />
          <TextField size="small" placeholder="Name or admission no…" value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: 260 }} />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted }}>{rows.length} exemption{rows.length === 1 ? '' : 's'}</Typography>
          <Chip label={`Total exempted ${inr(total)}`} color="primary" variant="outlined" />
        </CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Adm #</TableCell><TableCell>Student</TableCell><TableCell>Class</TableCell>
              {allYears && <TableCell>Year</TableCell>}
              <TableCell>Cycle</TableCell><TableCell align="right">Amount</TableCell>
              <TableCell>Reason</TableCell><TableCell>Exempted by</TableCell><TableCell>On</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={allYears ? 9 : 8} align="center" sx={{ py: 4 }}><CircularProgress size={22} /></TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={allYears ? 9 : 8} align="center" sx={{ py: 3, color: FEE_COLORS.muted }}>No fine exemptions{search ? ' match your search' : ' yet'}.</TableCell></TableRow>}
              {!loading && rows.map((r) => (
                <TableRow key={r.uuid} hover>
                  <TableCell>{r.admissionNumber || '—'}</TableCell>
                  <TableCell>{r.studentName || '—'}</TableCell>
                  <TableCell>{r.className || '—'}</TableCell>
                  {allYears && <TableCell>{r.yearName || '—'}</TableCell>}
                  <TableCell>{r.cycleLabel || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{inr(r.amount)}</TableCell>
                  <TableCell sx={{ color: FEE_COLORS.muted }}>{r.reason || '—'}</TableCell>
                  <TableCell>{r.exemptedBy || '—'}</TableCell>
                  <TableCell>{fmtDate(r.exemptedOn)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
