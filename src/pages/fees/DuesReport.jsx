import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button, Chip, Slider,
  Table, TableHead, TableBody, TableRow, TableCell, TableFooter, TextField, MenuItem,
  ToggleButtonGroup, ToggleButton, FormControlLabel, Switch, Link, Tooltip,
} from '@mui/material';
import { PersonSearch as PersonSearchIcon, Download as DownloadIcon, Clear as ClearIcon, Print as PrintIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { classService } from '../../services/classService';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import FollowupDialog from './FollowupDialog';
import { errMsg, inr, classRank, FEE_COLORS } from './feesUi';

const FOLLOWUPS = [
  { v: '', label: '—' },
  { v: 'called', label: 'Called', color: 'info' },
  { v: 'promised', label: 'Promised', color: 'warning' },
  { v: 'unreachable', label: 'Unreachable', color: 'default' },
  { v: 'settled', label: 'Settled', color: 'success' },
];
const fLabel = (v) => FOLLOWUPS.find((f) => f.v === (v || ''))?.label || '—';
const fColor = (v) => FOLLOWUPS.find((f) => f.v === (v || ''))?.color || 'default';

export default function DuesReport() {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const [mode, setMode] = useState('due'); // due | all
  const [classId, setClassId] = useState('');
  const [student, setStudent] = useState(null);
  const [pick, setPick] = useState(false);
  const [classes, setClasses] = useState([]);
  const [data, setData] = useState({ rows: [], totals: {}, quarterLabel: 'This quarter' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [includePrev, setIncludePrev] = useState(false);
  const [sortBy, setSortBy] = useState('dueNow'); // dueNow | prevYears | fullYear | class
  const [fFilter, setFFilter] = useState(''); // follow-up filter
  const [band, setBand] = useState([0, 0]); // due-now slider range
  const [followStudent, setFollowStudent] = useState(null); // open timeline dialog for this row

  useEffect(() => {
    classService.getClasses({ academicYearId }).then((c) => setClasses((c?.value || c || []).filter(Boolean))).catch(() => setClasses([]));
  }, [academicYearId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await feesService.getDues({ academicYearId, mode, ...(classId ? { classId } : {}), ...(student ? { studentId: student.uuid } : {}) });
        if (alive) { setData(res || { rows: [], totals: {} }); }
      } catch (err) { if (alive) setError(errMsg(err, 'Failed to load dues')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [academicYearId, mode, classId, student]);

  // effective amounts = current due + (prior years when the toggle is on). Tiers are cumulative.
  const eff = (r) => Number(r.dueNow || 0) + (includePrev ? Number(r.prevYears || 0) : 0);
  const effQ = (r) => Number(r.dueQuarter || 0) + (includePrev ? Number(r.prevYears || 0) : 0);
  const effFull = (r) => Number(r.fullYear || 0) + (includePrev ? Number(r.prevYears || 0) : 0);
  const maxDue = useMemo(() => Math.max(1, ...((data.rows || []).map(eff))), [data.rows, includePrev]);
  useEffect(() => { setBand([0, maxDue]); }, [maxDue]);

  const rows = useMemo(() => {
    let r = (data.rows || []).slice();
    if (fFilter) r = r.filter((x) => (x.followupStatus || '') === (fFilter === 'none' ? '' : fFilter));
    r = r.filter((x) => eff(x) >= band[0] && eff(x) <= band[1]);
    const cmp = {
      dueNow: (a, b) => eff(b) - eff(a),
      prevYears: (a, b) => Number(b.prevYears || 0) - Number(a.prevYears || 0),
      fullYear: (a, b) => Number(b.fullYear || 0) - Number(a.fullYear || 0),
      class: (a, b) => (classRank(a.className) - classRank(b.className)) || (a.name || '').localeCompare(b.name || ''),
    }[sortBy];
    return r.sort(cmp);
  }, [data.rows, fFilter, band, sortBy, includePrev]);

  const t = data.totals || {};
  const monthEndLabel = data.monthEndLabel || '';
  const quarterEndLabel = data.quarterEndLabel || '';
  const yearEndLabel = data.yearEndLabel || '';
  const shownTotals = rows.reduce((a, r) => ({
    dueNow: a.dueNow + Number(r.dueNow || 0), dueQuarter: a.dueQuarter + Number(r.dueQuarter || 0),
    prevYears: a.prevYears + Number(r.prevYears || 0), fullYear: a.fullYear + Number(r.fullYear || 0),
  }), { dueNow: 0, dueQuarter: 0, prevYears: 0, fullYear: 0 });

  // band summary: counts + totals in ₹ pools (on effective due-now)
  const bands = useMemo(() => {
    const defs = [[0, 5000], [5000, 15000], [15000, Infinity]];
    return defs.map(([lo, hi]) => {
      const inRange = (data.rows || []).filter((r) => eff(r) > lo && eff(r) <= (hi === Infinity ? 1e12 : hi));
      return { lo, hi, n: inRange.length, sum: inRange.reduce((s, r) => s + eff(r), 0) };
    });
  }, [data.rows, includePrev]);

  const qLabel = data.quarterLabel || 'This quarter';
  const reload = () => feesService.getDues({ academicYearId, mode, ...(classId ? { classId } : {}), ...(student ? { studentId: student.uuid } : {}) }).then((res) => setData(res || { rows: [], totals: {} })).catch(() => {});
  const exportCsv = () => {
    const head = ['Class', 'Admission', 'Student', 'Father mobile', 'Due now', qLabel, 'Prev years', 'Full year', 'Follow-up'];
    const lines = rows.map((r) => [r.className || '', r.admissionNumber || '', r.name || '', r.fatherMobile || '', Math.round(r.dueNow || 0), Math.round(r.thisQuarter || 0), Math.round(r.prevYears || 0), Math.round(r.fullYear || 0), fLabel(r.followupStatus)]);
    const csv = [head, ...lines].map((a) => a.map((v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `dues-${mode}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const printList = () => {
    const rowsHtml = rows.map((r) => `<tr><td>${r.className || ''}</td><td>${r.admissionNumber || ''}</td><td>${r.name || ''}</td><td>${r.fatherMobile || ''}</td><td style="text-align:right">${inr(eff(r))}</td><td style="text-align:right">${inr(r.fullYear)}</td><td></td></tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Call list</title><style>body{font:13px system-ui;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:5px 7px}th{background:#f3f4f6;text-align:left}h3{margin:0 0 8px}</style></head><body><h3>Dues call list · ${new Date().toLocaleDateString('en-IN')} · ${rows.length} students</h3><table><thead><tr><th>Class</th><th>Adm#</th><th>Student</th><th>Father mobile</th><th>Due now</th><th>Full year</th><th>Note</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Dues Report</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>Collection console · <b>Due now</b> = through end of this month · <b>{qLabel}</b> = rest of the quarter.</Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="due" sx={{ textTransform: 'none' }}>Due now</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: 'none' }}>All outstanding</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* band summary strip */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        {bands.map((b, i) => (
          <Card key={i} variant="outlined" sx={{ flex: '1 1 180px', cursor: 'pointer' }} onClick={() => setBand([b.lo, b.hi === Infinity ? maxDue : b.hi])}>
            <CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
              <Typography sx={{ fontSize: 12, color: FEE_COLORS.muted }}>{b.hi === Infinity ? `> ${inr(b.lo)}` : `${inr(b.lo)}–${inr(b.hi)}`}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{b.n} students · {inr(b.sum)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${FEE_COLORS.border}` }}>
          <TextField size="small" select label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setStudent(null); }} sx={{ minWidth: 150 }} disabled={!!student}>
            <MenuItem value="">All classes</MenuItem>
            {classes.slice().sort((a, b) => classRank(a.name) - classRank(b.name)).map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
          </TextField>
          {student
            ? <Chip label={`${student.name}${student.admissionNumber ? ' · ' + student.admissionNumber : ''}`} onDelete={() => setStudent(null)} deleteIcon={<ClearIcon />} />
            : <Button size="small" variant="outlined" startIcon={<PersonSearchIcon />} onClick={() => setPick(true)}>By student</Button>}
          <TextField size="small" select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="dueNow">Due now</MenuItem><MenuItem value="prevYears">Prev years</MenuItem>
            <MenuItem value="fullYear">Full year</MenuItem><MenuItem value="class">Class</MenuItem>
          </TextField>
          <TextField size="small" select label="Follow-up" value={fFilter} onChange={(e) => setFFilter(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem><MenuItem value="none">Not contacted</MenuItem>
            {FOLLOWUPS.filter((f) => f.v).map((f) => <MenuItem key={f.v} value={f.v}>{f.label}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Switch size="small" checked={includePrev} onChange={(e) => setIncludePrev(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>+ prev-year dues</span>} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<PrintIcon />} onClick={printList} disabled={!rows.length}>Call list</Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!rows.length}>CSV</Button>
        </CardContent>

        {/* due-now range slider */}
        <CardContent sx={{ py: 1, borderBottom: `1px solid ${FEE_COLORS.border}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: 12.5, color: FEE_COLORS.muted, whiteSpace: 'nowrap' }}>Due-now range</Typography>
          <Slider size="small" value={band} min={0} max={maxDue} onChange={(_, v) => setBand(v)} valueLabelDisplay="auto" valueLabelFormat={(v) => inr(v)} sx={{ mx: 1 }} />
          <Typography sx={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{inr(band[0])} – {inr(band[1])}</Typography>
        </CardContent>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Class</TableCell><TableCell>Adm#</TableCell><TableCell>Student</TableCell><TableCell>Father mobile</TableCell>
                  <TableCell align="right">Due now{includePrev ? ' +prev' : ''}<Box component="span" sx={{ display: 'block', fontWeight: 400, fontSize: 10, color: FEE_COLORS.muted }}>{monthEndLabel}</Box></TableCell>
                  <TableCell align="right">Due qtr<Box component="span" sx={{ display: 'block', fontWeight: 400, fontSize: 10, color: FEE_COLORS.muted }}>{quarterEndLabel}</Box></TableCell>
                  <TableCell align="right">Prev yrs</TableCell>
                  <TableCell align="right">Full year<Box component="span" sx={{ display: 'block', fontWeight: 400, fontSize: 10, color: FEE_COLORS.muted }}>{yearEndLabel}</Box></TableCell>
                  <TableCell>Follow-up</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ color: FEE_COLORS.success, py: 4 }}>No students match this filter. 🎉</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.studentId} hover>
                    <TableCell>{r.className || '—'}</TableCell>
                    <TableCell>{r.admissionNumber || '—'}</TableCell>
                    <TableCell><Link component="button" underline="hover" onClick={() => navigate(`/students/${r.studentId}`)} sx={{ textAlign: 'left' }}>{r.name}</Link></TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.fatherMobile || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.danger }}>{inr(eff(r))}</TableCell>
                    <TableCell align="right" sx={{ color: FEE_COLORS.muted }}>{inr(effQ(r))}</TableCell>
                    <TableCell align="right" sx={{ color: r.prevYears > 0 ? FEE_COLORS.warning : FEE_COLORS.muted }}>{r.prevYears > 0 ? inr(r.prevYears) : '—'}</TableCell>
                    <TableCell align="right">{inr(effFull(r))}</TableCell>
                    <TableCell>
                      <Chip size="small" variant={r.followupStatus ? 'filled' : 'outlined'} color={r.followupStatus ? fColor(r.followupStatus) : 'default'}
                        label={r.followupStatus ? `${fLabel(r.followupStatus)}${r.followupCount > 1 ? ` ·${r.followupCount}` : ''}` : 'log…'}
                        onClick={() => setFollowStudent(r)} sx={{ cursor: 'pointer' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 700, color: 'text.primary' }}>{rows.length} students {rows.length !== (data.rows || []).length ? `(of ${(data.rows || []).length})` : ''}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: FEE_COLORS.danger, fontSize: 15 }}>{inr(shownTotals.dueNow + (includePrev ? shownTotals.prevYears : 0))}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: FEE_COLORS.muted }}>{inr(shownTotals.dueQuarter + (includePrev ? shownTotals.prevYears : 0))}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: FEE_COLORS.warning }}>{inr(shownTotals.prevYears)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 15 }}>{inr(shownTotals.fullYear + (includePrev ? shownTotals.prevYears : 0))}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Box>
        )}
      </Card>

      <StudentSearchDialog open={pick} onClose={() => setPick(false)} onSelect={(s) => { setPick(false); setStudent(s); setClassId(''); }} />
      <FollowupDialog open={!!followStudent} onClose={() => setFollowStudent(null)} onChanged={reload}
        studentId={followStudent?.studentId} academicYearId={academicYearId} studentName={followStudent?.name} />
    </Box>
  );
}
