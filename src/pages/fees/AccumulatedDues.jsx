import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Chip, Link,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, InputAdornment,
  FormControlLabel, Switch, Button,
} from '@mui/material';
import { Search as SearchIcon, Print as PrintIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { feesService } from '../../services/feesService';
import { inr, errMsg, FEE_COLORS } from './feesUi';
import { fmtDate } from '../../utils/date';

const REL_LABEL = { father: 'Father', mother: 'Mother', guardian: 'Guardian' };
const relLabel = (r) => REL_LABEL[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Contact');
const contactLine = (c) => `${relLabel(c.relation)}: ${c.name || '—'}${c.mobile ? ` · ${c.mobile}` : ''}`;
const colLabel = (col, monthLabel) => `${col.name}${col.isCurrent ? ` (${monthLabel || 'till date'})` : ''}`;
const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

export default function AccumulatedDues() {
  const { academicYearId, years } = useAcademicYear();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [hideLeft, setHideLeft] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await feesService.getTopDues(academicYearId)); }
    catch (err) { setError(errMsg(err, 'Failed to load report')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const columns = data?.columns || [];
  const ayName = useMemo(() => (years || []).find((y) => y.uuid === academicYearId)?.name || '', [years, academicYearId]);

  const rows = useMemo(() => {
    let r = data?.rows || [];
    if (hideLeft) r = r.filter((x) => !x.hasLeft);
    const term = q.trim().toLowerCase();
    if (term) r = r.filter((x) => (x.name || '').toLowerCase().includes(term)
      || (x.className || '').toLowerCase().includes(term)
      || (x.admissionNumber || '').toLowerCase().includes(term)
      || (x.contacts || []).some((c) => (c.name || '').toLowerCase().includes(term) || (c.mobile || '').includes(term)));
    return r;
  }, [data, hideLeft, q]);

  const shownTotal = useMemo(() => rows.reduce((a, r) => a + Number(r.total || 0), 0), [rows]);

  const exportCsv = () => {
    const head = ['Rank', 'Student', 'Admission', 'Class', 'Status', 'Contacts', ...columns.map((c) => colLabel(c, data?.monthLabel)), 'Total'];
    const lines = [head.map(esc).join(',')];
    rows.forEach((r, i) => {
      const contacts = (r.contacts || []).map(contactLine).join(' | ');
      const cells = [i + 1, r.name, r.admissionNumber || '', r.className || '', r.hasLeft ? 'Left' : 'On roll', contacts,
        ...columns.map((c) => Math.round(Number(r.byYear?.[c.academicYearId] || 0)) || ''), Math.round(r.total)];
      lines.push(cells.map(esc).join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `accumulated-dues-${ayName || 'report'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const thYears = columns.map((c) => `<th class="num">${colLabel(c, data?.monthLabel)}</th>`).join('');
    const body = rows.map((r, i) => {
      const contacts = (r.contacts || []).map((c) => `<div>${relLabel(c.relation)}: ${c.name || '—'}${c.mobile ? ` · ${c.mobile}` : ''}</div>`).join('');
      const yr = columns.map((c) => `<td class="num">${r.byYear?.[c.academicYearId] ? inr(r.byYear[c.academicYearId]) : '—'}</td>`).join('');
      return `<tr><td>${i + 1}</td><td><b>${r.name}</b>${r.hasLeft ? ' <span class="left">(left)</span>' : ''}${r.admissionNumber ? `<div class="sub">${r.admissionNumber}</div>` : ''}</td><td>${r.className || '—'}</td><td class="contacts">${contacts || '—'}</td>${yr}<td class="num total">${inr(r.total)}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Accumulated Dues</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:16px;font-size:11px}
        h1{font-size:16px;margin:0 0 2px} .meta{color:#555;font-size:11px;margin-bottom:10px}
        table{border-collapse:collapse;width:100%} th,td{border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;text-align:left}
        th{background:#f1f5f9;font-size:10px;text-transform:uppercase;letter-spacing:.3px}
        .num{text-align:right;white-space:nowrap} .total{font-weight:bold;color:#b91c1c}
        .sub{color:#64748b;font-size:9px} .contacts div{font-size:10px} .left{color:#b45309;font-weight:normal;font-size:9px}
        tfoot td{font-weight:bold;background:#f8fafc}
        @page{size:A4 landscape;margin:10mm}
      </style></head><body>
      <h1>Accumulated Dues${ayName ? ` — ${ayName}` : ''}</h1>
      <div class="meta">${rows.length} student(s) · Total ${inr(shownTotal)} · Current year shown ${data?.monthLabel || 'till date'} · Generated ${fmtDate(data?.generatedAt) || ''}</div>
      <table><thead><tr><th>#</th><th>Student</th><th>Class</th><th>Father / Mother / Guardian</th>${thYears}<th class="num">Total</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td colspan="4">Total (${rows.length})</td>${columns.map((c) => `<td class="num">${inr(rows.reduce((a, r) => a + Number(r.byYear?.[c.academicYearId] || 0), 0))}</td>`).join('')}<td class="num total">${inr(shownTotal)}</td></tr></tfoot>
      </table></body></html>`;
    const frame = document.createElement('iframe');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document; doc.open(); doc.write(html); doc.close();
    frame.contentWindow.focus();
    setTimeout(() => { frame.contentWindow.print(); setTimeout(() => document.body.removeChild(frame), 1500); }, 350);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Accumulated Dues</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>
            Students ranked by total dues across all years. Past years show the full outstanding; the current year shows only what is due {data?.monthLabel || 'till this month'} (not the whole year).
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={!rows.length} onClick={exportCsv}>CSV</Button>
          <Button size="small" variant="contained" startIcon={<PrintIcon />} disabled={!rows.length} onClick={printReport}>Print</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1.5 }}>
          <TextField size="small" placeholder="Filter by name, class, admission or phone…" value={q} onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControlLabel control={<Switch size="small" checked={hideLeft} onChange={(e) => setHideLeft(e.target.checked)} />} label={<span style={{ fontSize: 13 }}>Hide left students</span>} />
          {data && <Typography sx={{ fontSize: 13, color: FEE_COLORS.muted }}>{rows.length} student{rows.length === 1 ? '' : 's'} · <b style={{ color: FEE_COLORS.danger || '#b91c1c' }}>{inr(shownTotal)}</b></Typography>}
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !rows.length ? (
        <Card><CardContent><Typography sx={{ textAlign: 'center', color: FEE_COLORS.muted, py: 3 }}>No dues to show. 🎉</Typography></CardContent></Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Father / Mother / Guardian</TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.academicYearId} align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: c.isCurrent ? '#f0fdfa' : undefined }}>
                      {c.name}{c.isCurrent && <Typography component="div" sx={{ fontSize: 10, color: FEE_COLORS.muted, fontWeight: 600 }}>{data?.monthLabel || 'till date'}</Typography>}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.studentId} hover sx={r.hasLeft ? { bgcolor: 'rgba(180,83,9,.06)' } : undefined}>
                    <TableCell sx={{ color: FEE_COLORS.muted }}>{i + 1}</TableCell>
                    <TableCell>
                      <Link component="button" underline="hover" onClick={() => navigate(`/students/${r.studentId}`)} sx={{ textAlign: 'left', fontWeight: 600 }}>{r.name}</Link>
                      {r.hasLeft && <Chip size="small" label="left" color="warning" variant="outlined" sx={{ ml: 0.75, height: 18, fontSize: 10 }} />}
                      {r.admissionNumber && <Typography sx={{ fontSize: 11, color: FEE_COLORS.muted }}>{r.admissionNumber}</Typography>}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.className || '—'}</TableCell>
                    <TableCell>
                      {(r.contacts || []).length === 0 && <span style={{ color: FEE_COLORS.muted }}>—</span>}
                      {(r.contacts || []).map((c, k) => (
                        <Typography key={k} sx={{ fontSize: 12, lineHeight: 1.5 }}>
                          <span style={{ color: FEE_COLORS.muted }}>{relLabel(c.relation)}:</span> {c.name || '—'}{c.mobile ? <span style={{ color: FEE_COLORS.muted }}> · {c.mobile}</span> : ''}
                        </Typography>
                      ))}
                    </TableCell>
                    {columns.map((c) => {
                      const v = Number(r.byYear?.[c.academicYearId] || 0);
                      return <TableCell key={c.academicYearId} align="right" sx={{ whiteSpace: 'nowrap', bgcolor: c.isCurrent ? 'rgba(15,118,110,.04)' : undefined }}>{v > 0 ? inr(v) : <span style={{ color: '#cbd5e1' }}>—</span>}</TableCell>;
                    })}
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#b91c1c', whiteSpace: 'nowrap' }}>{inr(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </Box>
  );
}
