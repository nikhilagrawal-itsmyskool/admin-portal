import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Autocomplete, TextField, Button, Alert, Chip, Stack, CircularProgress,
} from '@mui/material';
import { Print as PrintIcon, MenuBook as RegisterIcon, Search as SearchIcon } from '@mui/icons-material';
import { classService } from '../../services/classService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { attendanceService } from '../../services/attendanceService';

// status -> { letter, bg } — consistent with the student attendance panel.
const CODE = {
  present: { letter: 'P', bg: '#dcfce7', fg: '#15803d' },
  absent: { letter: 'A', bg: '#fee2e2', fg: '#b91c1c' },
  leave: { letter: 'L', bg: '#fef3c7', fg: '#b45309' },
  late: { letter: 'Lt', bg: '#dbeafe', fg: '#1d4ed8' },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStartISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const dayNum = (iso) => iso.slice(8, 10);
const monthOf = (iso) => MONTHS[+iso.slice(5, 7) - 1];

export default function AttendanceRegister() {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [cls, setCls] = useState(null);
  const [year, setYear] = useState(null);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null); // { dates, students }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [c, y] = await Promise.allSettled([classService.getClasses(), academicCalendarService.getAcademicYears()]);
      if (c.status === 'fulfilled') setClasses(Array.isArray(c.value) ? c.value : c.value?.classes || []);
      if (y.status === 'fulfilled') { const yy = y.value || []; setYears(yy); setYear(yy.find((r) => r.isCurrent) || yy[0] || null); }
    })();
  }, []);

  const load = async () => {
    if (!cls || !year) { setError('Pick a class and academic year'); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const res = await attendanceService.getClassRegister({ classId: cls.uuid, academicYearId: year.uuid, from, to });
      setData(res);
      if (!res.dates?.length) setError('No finalized attendance in this range for this class.');
    } catch {
      setError('Failed to load register');
    } finally {
      setLoading(false);
    }
  };

  // month groupings for the super-header
  const monthGroups = useMemo(() => {
    if (!data?.dates) return [];
    const groups = [];
    for (const d of data.dates) {
      const m = monthOf(d);
      const last = groups[groups.length - 1];
      if (last && last.month === m) last.count++;
      else groups.push({ month: m, count: 1 });
    }
    return groups;
  }, [data]);

  const printRegister = () => {
    if (!data?.dates?.length) return;
    const title = `${cls?.name || ''} — Attendance Register`;
    const sub = `${year?.name || ''} · ${from} to ${to}`;
    const th = data.dates.map((d) => `<th class="d">${dayNum(d)}</th>`).join('');
    const monthRow = monthGroups.map((g) => `<th colspan="${g.count}" class="mh">${g.month}</th>`).join('');
    const rows = data.students.map((s, i) => {
      const cells = data.dates.map((d) => {
        const st = s.marks[d];
        const c = CODE[st];
        return c ? `<td class="c" style="background:${c.bg};color:${c.fg}">${c.letter}</td>` : `<td class="c"></td>`;
      }).join('');
      return `<tr>
        <td class="rn">${s.rollNumber ?? i + 1}</td>
        <td class="nm">${s.name || ''}<div class="adm">${s.admissionNumber || ''}</div></td>
        ${cells}
        <td class="tot">${s.present}</td><td class="tot">${s.absent}</td><td class="tot">${s.leave}</td><td class="tot pc">${s.percent}%</td>
      </tr>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; margin: 0; }
        h1 { font-size: 15px; margin: 0; } .sub { font-size: 11px; color: #555; margin: 2px 0 8px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #999; font-size: 9px; text-align: center; padding: 1px 2px; }
        .mh { background:#f1f5f9; } .d { width: 14px; }
        .rn { width: 22px; } .nm { text-align: left; white-space: nowrap; font-size: 9px; max-width: 130px; }
        .adm { color:#777; font-size: 7px; } .c { width: 14px; font-weight: 600; }
        .tot { font-weight: 700; width: 22px; } .pc { background:#f8fafc; }
        thead th { background:#f8fafc; }
      </style></head><body>
      <h1>${title}</h1><div class="sub">${sub} · Strength ${data.students.length}</div>
      <table><thead>
        <tr><th rowspan="2" class="rn">R#</th><th rowspan="2" class="nm">Name</th>${monthRow}<th colspan="4">Totals</th></tr>
        <tr>${th}<th class="tot">P</th><th class="tot">A</th><th class="tot">L</th><th class="tot">%</th></tr>
      </thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { setError('Popup blocked — allow popups to print.'); return; }
    w.document.write(html); w.document.close();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <RegisterIcon color="primary" />
          <Typography variant="h4">Attendance Register</Typography>
        </Stack>
        {data?.dates?.length > 0 && (
          <Button variant="contained" startIcon={<PrintIcon />} onClick={printRegister}>Print</Button>
        )}
      </Stack>

      {error && <Alert severity="info" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Autocomplete options={classes} getOptionLabel={(o) => o.name || ''} value={cls}
                onChange={(e, v) => setCls(v)} isOptionEqualToValue={(o, v) => o.uuid === v?.uuid}
                renderInput={(p) => <TextField {...p} label="Class" size="small" />} />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Autocomplete options={years} getOptionLabel={(o) => o.name || ''} value={year}
                onChange={(e, v) => setYear(v)} isOptionEqualToValue={(o, v) => o.uuid === v?.uuid} disableClearable
                renderInput={(p) => <TextField {...p} label="Academic Year" size="small" />} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth type="date" label="From" size="small" InputLabelProps={{ shrink: true }}
                value={from} onChange={(e) => setFrom(e.target.value)} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth type="date" label="To" size="small" InputLabelProps={{ shrink: true }}
                value={to} onChange={(e) => setTo(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={load} disabled={loading}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {data?.dates?.length > 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${cls?.name} · ${data.students.length} students · ${data.dates.length} days`} color="primary" variant="outlined" />
              {Object.values(CODE).map((c) => (
                <Stack key={c.letter} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 16, height: 16, borderRadius: '3px', bgcolor: c.bg, color: c.fg, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.letter}</Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{c.letter === 'Lt' ? 'late' : c.letter === 'P' ? 'present' : c.letter === 'A' ? 'absent' : 'leave'}</Typography>
                </Stack>
              ))}
            </Stack>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{
                borderCollapse: 'collapse', fontSize: 11,
                '& th, & td': { border: '1px solid #e2e8f0', p: '2px 4px', textAlign: 'center', whiteSpace: 'nowrap' },
                '& .nm': { textAlign: 'left', position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1 },
              }}>
                <thead>
                  <tr>
                    <th rowSpan={2}>#</th>
                    <th rowSpan={2} className="nm">Name</th>
                    {monthGroups.map((g, i) => <th key={i} colSpan={g.count} style={{ background: '#f1f5f9' }}>{g.month}</th>)}
                    <th colSpan={4} style={{ background: '#f8fafc' }}>Totals</th>
                  </tr>
                  <tr>
                    {data.dates.map((d) => <th key={d} style={{ color: '#64748b', fontWeight: 500 }}>{dayNum(d)}</th>)}
                    <th>P</th><th>A</th><th>L</th><th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, i) => (
                    <tr key={s.studentId}>
                      <td>{s.rollNumber ?? i + 1}</td>
                      <td className="nm">{s.name}<div style={{ fontSize: 9, color: '#94a3b8' }}>{s.admissionNumber}</div></td>
                      {data.dates.map((d) => {
                        const c = CODE[s.marks[d]];
                        return <td key={d} style={c ? { background: c.bg, color: c.fg, fontWeight: 600 } : undefined}>{c?.letter || ''}</td>;
                      })}
                      <td style={{ fontWeight: 700 }}>{s.present}</td>
                      <td style={{ fontWeight: 700 }}>{s.absent}</td>
                      <td style={{ fontWeight: 700 }}>{s.leave}</td>
                      <td style={{ fontWeight: 700, background: '#f8fafc' }}>{s.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
