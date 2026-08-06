import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip, Tooltip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Button, Stack,
} from '@mui/material';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';

// Syllabus readiness board: one row per plan (year+grade+subject). The subject
// cell carries content + the model-paper matrix (exam × Paper/Blueprint/Answer key);
// the coverage column draws one timeline per section against the Apr→Mar calendar
// with a "now" marker. On/behind is PLAN-WEIGHTED: covered leaves are mapped onto
// the calendar via the plan's per-month schedule, so a subject with few early-month
// topics isn't wrongly flagged behind. Teacher filter scopes to that teacher's own
// sections. Read-only; links out to Plan / Offerings / Model Papers.
const MONTH_ABBR = ['A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M'];
const EXAMS = [{ key: 'half_yearly', label: 'HY' }, { key: 'annual', label: 'Annual' }];
const DOCS = [{ key: 'hasPaper', label: 'Paper' }, { key: 'hasBlueprint', label: 'B-print' }, { key: 'hasKey', label: 'Key' }];

// Map covered leaves onto the academic calendar (0..1) using the plan's monthly
// schedule: how far along the year the covered work reaches if done in order.
function frontierFrac(monthly, covered, total) {
  if (total <= 0 || covered <= 0) return 0;
  if (covered >= total) return 1;
  let running = 0;
  for (let m = 0; m < 12; m++) {
    const s = monthly[m] || 0;
    if (s === 0) continue;
    if (covered <= running + s) return (m + (covered - running) / s) / 12;
    running += s;
  }
  return 1;
}

export default function Overview() {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [data, setData] = useState({ currentMonthIndex: 0, rows: [] });
  const [f, setF] = useState({ grade: '', subject: '', teacherId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        setAcademicYearId(cur?.uuid || '');
      } catch {
        setError('Failed to load academic years');
      }
    })();
  }, []);

  useEffect(() => {
    if (!academicYearId) { setData({ currentMonthIndex: 0, rows: [] }); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await syllabusService.getOverview({ academicYearId });
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setError('Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [academicYearId]);

  const rows = data.rows || [];
  const nowFrac = ((data.currentMonthIndex ?? 0) + 0.5) / 12;
  const nowPct = nowFrac * 100;

  // Filter option lists derived from the loaded data.
  const gradeOpts = useMemo(() => [...new Set(rows.map((r) => r.grade))], [rows]);
  const subjectOpts = useMemo(() => [...new Set(rows.map((r) => r.subjectName))].sort((a, b) => a.localeCompare(b)), [rows]);
  const teacherOpts = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => r.sections.forEach((s) => s.teachers.forEach((t) => m.set(t.teacherId, t.teacherName))));
    return [...m.entries()].map(([teacherId, teacherName]) => ({ teacherId, teacherName }))
      .sort((a, b) => (a.teacherName || '').localeCompare(b.teacherName || ''));
  }, [rows]);

  // Apply filters. Teacher filter also narrows each row's visible sections.
  const visible = useMemo(() => {
    return rows
      .filter((r) => (!f.grade || r.grade === f.grade) && (!f.subject || r.subjectName === f.subject))
      .map((r) => {
        if (!f.teacherId) return r;
        const sections = r.sections.filter((s) => s.teachers.some((t) => t.teacherId === f.teacherId));
        return sections.length ? { ...r, sections } : null;
      })
      .filter(Boolean);
  }, [rows, f]);

  const paperCell = (row, examKey, docKey) => {
    const p = (row.papers || []).find((x) => x.exam === examKey);
    if (!p || !p[docKey]) return <span className="mk no" title="Not uploaded">✗</span>;
    if (docKey === 'hasKey') {
      return p.answerKeyReleased
        ? <span className="mk key" title="Answer key uploaded · released">✓</span>
        : <span className="mk yes" title="Answer key uploaded · not released">✓</span>;
    }
    return <span className="mk yes" title="Uploaded">✓</span>;
  };

  const sectionTimeline = (row, sec) => {
    const total = row.contentLeaves;
    const front = frontierFrac(row.monthlyScheduled || [], sec.coveredCount, total);
    const pct = total > 0 ? Math.round((sec.coveredCount / total) * 100) : 0;
    const behind = nowFrac - front; // >0 = behind
    let cls = 'good'; let st = front > nowFrac + 0.02 ? 'ahead' : 'on track';
    if (behind > 0.01) {
      const wks = Math.max(1, Math.round(behind * 52));
      if (behind <= 0.06) { cls = 'warn'; st = `~${wks} wk behind`; }
      else { cls = 'crit'; st = wks >= 8 ? 'well behind' : `~${wks} wk behind`; }
    }
    if (sec.coveredCount === 0) { cls = 'crit'; st = 'not started'; }
    const noPlan = total === 0;
    return (
      <div className="secrow" key={sec.classId}>
        <span className="seclab">{sec.className}</span>
        {noPlan ? (
          <span className="cov-empty">—</span>
        ) : (
          <>
            <div className="tl">
              <div className="tl-track" />
              <div className={`tl-fill ${cls}`} style={{ width: `${front * 100}%` }} />
              {behind > 0.01 && <div className="tl-gap" style={{ left: `${front * 100}%`, width: `${behind * 100}%` }} />}
              <div className="tl-now" style={{ left: `${nowPct}%` }} />
            </div>
            <span className="tl-meta">
              <b>{pct}%</b><span className={`st ${cls}`}>{st}</span>
            </span>
          </>
        )}
      </div>
    );
  };

  let lastGrade = null;

  return (
    <Box>
      <style>{`
        .mk{display:inline-flex;align-items:center;justify-content:center;width:26px;height:19px;border-radius:5px;font-size:11px;font-weight:700}
        .mk.yes{background:rgba(23,147,90,.14);color:#17935a}
        .mk.key{background:rgba(79,70,229,.14);color:#4f46e5}
        .mk.no{color:#9aa4b8;border:1px solid rgba(140,150,170,.35)}
        .papers{margin-top:10px;display:grid;grid-template-columns:auto 26px 26px 26px;gap:3px 6px;align-items:center;width:max-content}
        .papers .ph{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#8a93a6;text-align:center}
        .papers .rl{font-size:11px;color:#5b6577;font-weight:600;padding-right:4px}
        .cov{display:flex;flex-direction:column;gap:9px;min-width:380px}
        .secrow{display:flex;align-items:center}
        .seclab{width:52px;font-size:11.5px;font-weight:700;color:#5b6577;font-variant-numeric:tabular-nums}
        .tl{position:relative;flex:1;height:22px}
        .tl-track{position:absolute;inset:4px 0;border-radius:6px;background:rgba(140,150,170,.16);
          background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(8.3333% - 1px),rgba(140,150,170,.28) calc(8.3333% - 1px),rgba(140,150,170,.28) 8.3333%)}
        .tl-fill{position:absolute;top:4px;bottom:4px;left:0;border-radius:6px}
        .tl-fill.good{background:#17935a}.tl-fill.warn{background:#bd7710}.tl-fill.crit{background:#cf473d}
        .tl-gap{position:absolute;top:4px;bottom:4px;border-radius:0 6px 6px 0;background-image:repeating-linear-gradient(45deg,rgba(207,71,61,.28) 0 5px,transparent 5px 10px)}
        .tl-now{position:absolute;top:-1px;bottom:-1px;width:2px;background:#4f46e5;border-radius:2px}
        .tl-now::after{content:"";position:absolute;top:-3px;left:-3px;width:8px;height:8px;border-radius:50%;background:#4f46e5}
        .tl-meta{width:94px;padding-left:10px;font-size:11px;font-variant-numeric:tabular-nums;line-height:1.25}
        .tl-meta .st{display:block;font-size:10px;margin-top:1px}
        .st.good{color:#17935a}.st.warn{color:#bd7710}.st.crit{color:#cf473d}
        .cov-empty{color:#8a93a6;font-style:italic;font-size:12px;padding-left:2px}
        .ruler{position:relative;height:14px;margin-left:52px;margin-right:94px}
        .ruler .ml{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,1fr)}
        .ruler .ml span{font-size:9.5px;color:#8a93a6;text-align:center;font-variant-numeric:tabular-nums}
        .nowlab{position:absolute;top:-1px;transform:translateX(-50%);font-size:9.5px;font-weight:700;color:#4f46e5;white-space:nowrap}
        .grade-band td{background:rgba(140,150,170,.09);font-weight:700;font-size:12.5px}
      `}</style>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Syllabus Overview</Typography>
        <Typography variant="body2" color="text.secondary">
          Readiness at a glance — content, model papers, and section-by-section coverage against the calendar.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth select size="small" label="Grade" value={f.grade}
                onChange={(e) => setF({ ...f, grade: e.target.value })}>
                <MenuItem value="">All grades</MenuItem>
                {gradeOpts.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select size="small" label="Subject" value={f.subject}
                onChange={(e) => setF({ ...f, subject: e.target.value })}>
                <MenuItem value="">All subjects</MenuItem>
                {subjectOpts.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField fullWidth select size="small" label="Teacher" value={f.teacherId}
                onChange={(e) => setF({ ...f, teacherId: e.target.value })}>
                <MenuItem value="">All teachers</MenuItem>
                {teacherOpts.map((t) => <MenuItem key={t.teacherId} value={t.teacherId}>{t.teacherName}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 54, fontWeight: 600 }}>Grade</TableCell>
                    <TableCell sx={{ width: 300, fontWeight: 600 }}>Subject &amp; materials</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Coverage by section{f.teacherId ? ' (this teacher)' : ''}</span>
                        <div className="ruler">
                          <div className="ml">{MONTH_ABBR.map((m, i) => <span key={i}>{m}</span>)}</div>
                          <span className="nowlab" style={{ left: `${nowPct}%` }}>now</span>
                        </div>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: 200, fontWeight: 600 }} align="right">Open</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      {rows.length === 0 ? 'No plans for this year.' : 'Nothing matches these filters.'}
                    </TableCell></TableRow>
                  ) : visible.flatMap((row) => {
                    const band = row.grade !== lastGrade;
                    lastGrade = row.grade;
                    const els = [];
                    if (band) {
                      els.push(
                        <TableRow key={`band-${row.grade}`} className="grade-band">
                          <TableCell colSpan={4} sx={{ py: 0.8 }}>Grade {row.grade}</TableCell>
                        </TableRow>,
                      );
                    }
                    els.push(
                      <TableRow key={row.syllabusId} hover>
                        <TableCell sx={{ verticalAlign: 'top', fontWeight: 700, color: 'text.secondary' }}>{row.grade}</TableCell>
                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <Typography sx={{ fontWeight: 650, fontSize: 14.5 }}>{row.subjectName}</Typography>
                          {row.hasContent ? (
                            <Tooltip title={row.hasSource ? 'Source .docx attached' : 'No source file attached'}>
                              <Typography variant="caption" sx={{ color: 'success.main', display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                ● {row.contentLeaves} topics{row.hasSource ? ' · .docx' : ''}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>● No plan uploaded</Typography>
                          )}
                          <div className="papers">
                            <span className="ph" />{DOCS.map((d) => <span key={d.key} className="ph">{d.label}</span>)}
                            {EXAMS.map((ex) => (
                              <React.Fragment key={ex.key}>
                                <span className="rl">{ex.label}</span>
                                {DOCS.map((d) => <React.Fragment key={d.key}>{paperCell(row, ex.key, d.key)}</React.Fragment>)}
                              </React.Fragment>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <div className="cov">
                            {row.sections.length === 0
                              ? <span className="cov-empty">No sections</span>
                              : row.sections.map((sec) => sectionTimeline(row, sec))}
                          </div>
                        </TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" onClick={() => navigate(`/syllabus/plans/${row.syllabusId}`)}>Plan</Button>
                            <Button size="small" onClick={() => navigate(`/syllabus/offerings?academicYearId=${academicYearId}&grade=${encodeURIComponent(row.grade)}`)}>Teachers</Button>
                            <Button size="small" onClick={() => navigate(`/syllabus/model-papers?academicYearId=${academicYearId}&grade=${encodeURIComponent(row.grade)}`)}>Papers</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>,
                    );
                    return els;
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Each section's bar maps covered topics onto the Apr→Mar calendar using the plan's month schedule; the marker is today.
        A bar ending left of the marker (hatched) is behind. Coverage comes from teachers marking topics.
      </Typography>
    </Box>
  );
}
