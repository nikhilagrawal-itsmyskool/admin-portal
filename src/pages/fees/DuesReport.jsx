import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, TableFooter, TextField, MenuItem,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { PersonSearch as PersonSearchIcon, Download as DownloadIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { classService } from '../../services/classService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import { errMsg, inr, classRank, FEE_COLORS } from './feesUi';

export default function DuesReport() {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const [mode, setMode] = useState('due'); // 'due' = due-now only | 'all' = any outstanding
  const [classId, setClassId] = useState('');
  const [student, setStudent] = useState(null);
  const [pick, setPick] = useState(false);
  const [classes, setClasses] = useState([]);
  const [data, setData] = useState({ rows: [], totals: { dueNow: 0, upcoming: 0, fullYear: 0, students: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    classService.getClasses({ academicYearId }).then((c) => setClasses((c?.value || c || []).filter(Boolean))).catch(() => setClasses([]));
  }, [academicYearId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await feesService.getDues({ academicYearId, mode, ...(classId ? { classId } : {}), ...(student ? { studentId: student.uuid } : {}) });
        if (alive) setData(res || { rows: [], totals: {} });
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load dues')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [academicYearId, mode, classId, student]);

  const rows = useMemo(() => (data.rows || []).slice().sort((a, b) =>
    (classRank(a.className) - classRank(b.className)) || (a.name || '').localeCompare(b.name || '')), [data.rows]);
  const t = data.totals || {};

  const exportCsv = () => {
    const head = ['Class', 'Admission', 'Student', 'Due now', 'Upcoming', 'Full year'];
    const lines = rows.map((r) => [r.className || '', r.admissionNumber || '', r.name || '', Math.round(r.dueNow || 0), Math.round(r.upcoming || 0), Math.round(r.fullYear || 0)]);
    const csv = [head, ...lines].map((a) => a.map((v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `dues-${mode}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Dues Report</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Outstanding by student, class-wise. &quot;Due now&quot; = cycles whose due date has passed.</Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="due" sx={{ textTransform: 'none' }}>Due now</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: 'none' }}>All outstanding</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${FEE_COLORS.border}` }}>
          <TextField size="small" select label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setStudent(null); }} sx={{ minWidth: 160 }} disabled={!!student}>
            <MenuItem value="">All classes</MenuItem>
            {classes.slice().sort((a, b) => classRank(a.name) - classRank(b.name)).map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
          </TextField>
          {student
            ? <Chip label={`${student.name}${student.admissionNumber ? ' · ' + student.admissionNumber : ''}`} onDelete={() => setStudent(null)} deleteIcon={<ClearIcon />} />
            : <Button size="small" variant="outlined" startIcon={<PersonSearchIcon />} onClick={() => setPick(true)}>Filter by student</Button>}
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
        </CardContent>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Class</TableCell><TableCell>Adm#</TableCell><TableCell>Student</TableCell>
                  <TableCell align="right">Due now</TableCell><TableCell align="right">Upcoming</TableCell><TableCell align="right">Full year</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: FEE_COLORS.success, py: 4 }}>Nothing outstanding for this filter. 🎉</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.studentId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/students/${r.studentId}`)}>
                    <TableCell>{r.className || '—'}</TableCell>
                    <TableCell>{r.admissionNumber || '—'}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: FEE_COLORS.danger }}>{inr(r.dueNow)}</TableCell>
                    <TableCell align="right" sx={{ color: FEE_COLORS.muted }}>{inr(r.upcoming)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{inr(r.fullYear)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} sx={{ fontWeight: 700, color: 'text.primary' }}>{t.students} student{t.students === 1 ? '' : 's'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.danger, fontSize: 15 }}>{inr(t.dueNow)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.muted }}>{inr(t.upcoming)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15 }}>{inr(t.fullYear)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Box>
        )}
      </Card>

      <StudentSearchDialog open={pick} onClose={() => setPick(false)} onSelect={(s) => { setPick(false); setStudent(s); setClassId(''); }} />
    </Box>
  );
}
