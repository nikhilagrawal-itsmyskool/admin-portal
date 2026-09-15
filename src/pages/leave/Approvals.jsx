import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, Chip, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Collapse, Tooltip,
} from '@mui/material';
import {
  Check as ApproveIcon, Close as RejectIcon, AttachFile as AttachIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  CheckCircle as PassIcon, Cancel as FailIcon,
} from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate, fmtMonth, fmtDateTime, todayIso } from '../../utils/date';

const dateRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);
const HALF_LABEL = { first_half: '½ day (1st half)', second_half: '½ day (2nd half)' };
const daysLabel = (a) => (
  a.dayPortion === 'first_half' || a.dayPortion === 'second_half'
    ? HALF_LABEL[a.dayPortion]
    : (a.workingDays == null ? '—' : `${a.workingDays} day${a.workingDays === 1 ? '' : 's'}`)
);
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n) => String(n).padStart(2, '0');
const passes = (a) => !(a.evaluation && a.evaluation.passes === false); // default green when unknown

// Rule checklist (green tick pass / red tick fail) for one application's evaluation.
function RuleChecklist({ evaluation }) {
  if (!evaluation) return null;
  return (
    <Stack spacing={0.5}>
      {evaluation.checks.map((c) => (
        <Box key={c.key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {c.passed
            ? <PassIcon sx={{ fontSize: 18, color: '#00b887', mt: '1px' }} />
            : <FailIcon sx={{ fontSize: 18, color: '#e5396b', mt: '1px' }} />}
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.passed ? '#2e3a59' : '#c42a56' }}>{c.label}</Typography>
            {c.detail && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{c.detail}</Typography>}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// Compact month calendar showing how many staff are on leave each day, with this request's
// date(s) highlighted — so the approver sees clashes without leaving the screen.
function MiniMonth({ month, byDate, fromDate, toDate, loading }) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>;
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: lastDay }, (_, i) => `${month}-${pad(i + 1)}`)];
  const today = todayIso();
  const border = '1px solid #eef2f8';
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', mb: 0.75 }}>
        Who's on leave — {fmtMonth(month)}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: border, borderLeft: border, maxWidth: 420 }}>
        {DOW.map((d) => (
          <Box key={d} sx={{ px: 0.5, py: 0.4, borderRight: border, borderBottom: border, textAlign: 'center', bgcolor: '#f7f9fc' }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.secondary' }}>{d}</Typography>
          </Box>
        ))}
        {cells.map((date, i) => {
          if (!date) return <Box key={`x${i}`} sx={{ borderRight: border, borderBottom: border, bgcolor: '#fafbfc' }} />;
          const people = byDate[date] || [];
          const inReq = date >= fromDate && date <= toDate;
          const isToday = date === today;
          return (
            <Tooltip key={date} arrow disableInteractive
              title={people.length ? people.map((p) => `${p.name} (${p.status})`).join(', ') : ''}>
              <Box sx={{
                minHeight: 38, px: 0.5, py: 0.4, borderRight: border, borderBottom: border,
                bgcolor: inReq ? '#eaf0ff' : '#fff', boxShadow: inReq ? 'inset 0 0 0 2px #3366ff' : 'none',
              }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: isToday ? 800 : 600, color: isToday ? '#274bdb' : '#2e3a59', fontVariantNumeric: 'tabular-nums' }}>{date.slice(8)}</Typography>
                {people.length > 0 && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, mt: 0.25, bgcolor: '#fff5e0', color: '#8a6400', borderRadius: 1, px: 0.4 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{people.length}</Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.75 }}>Blue = this request's date(s). Number = staff on leave that day (hover for names).</Typography>
    </Box>
  );
}

export default function Approvals() {
  const isMobile = useIsMobile();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [note, setNote] = useState('');
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [months, setMonths] = useState({}); // 'YYYY-MM' -> { loading, byDate }

  const load = async () => {
    setLoading(true); setError('');
    try {
      // FIFO queue: oldest submission first, so requests are approved in the order received.
      const list = await leaveService.listApplications({ status: 'pending', withEvaluation: 1 }) || [];
      list.sort((a, b) => String(a.appliedAt || '').localeCompare(String(b.appliedAt || '')));
      setApps(list);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Lazy-load the month's leaves (approved + pending) for the inline calendar, cached by month.
  const loadMonth = async (month) => {
    if (months[month]) return;
    setMonths((m) => ({ ...m, [month]: { loading: true, byDate: {} } }));
    try {
      const first = `${month}-01`;
      const [y, mm] = month.split('-').map(Number);
      const last = `${month}-${pad(new Date(Date.UTC(y, mm, 0)).getUTCDate())}`;
      const list = await leaveService.listApplications({ from: first, to: last }) || [];
      const byDate = {};
      for (const a of list.filter((x) => x.status === 'approved' || x.status === 'pending')) {
        const lo = a.fromDate < first ? first : a.fromDate;
        const hi = a.toDate > last ? last : a.toDate;
        const s = new Date(`${lo}T00:00:00Z`); const e = new Date(`${hi}T00:00:00Z`);
        for (let cur = new Date(s); cur <= e; cur.setUTCDate(cur.getUTCDate() + 1)) {
          const d = cur.toISOString().slice(0, 10);
          (byDate[d] = byDate[d] || []).push({ name: a.employeeName || a.employeeId, status: a.status, code: a.leaveTypeCode });
        }
      }
      setMonths((m) => ({ ...m, [month]: { loading: false, byDate } }));
    } catch {
      setMonths((m) => ({ ...m, [month]: { loading: false, byDate: {} } }));
    }
  };

  const toggleExpand = (a) => {
    const next = expandedId === a.uuid ? null : a.uuid;
    setExpandedId(next);
    if (next) loadMonth(a.fromDate.slice(0, 7));
  };

  const approve = async (a) => {
    setBusyId(a.uuid); setError(''); setSuccess('');
    try {
      const res = await leaveService.approve(a.uuid);
      if (res?.needsConfirmation) {
        setOverrideTarget({ app: a, warnings: res.warnings || [] });
        setOverrideReason('');
      } else {
        setSuccess(`Approved ${a.employeeName || 'request'}`);
        setApps((prev) => prev.filter((x) => x.uuid !== a.uuid));
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const doOverride = async () => {
    const a = overrideTarget.app;
    setBusyId(a.uuid); setError(''); setSuccess('');
    try {
      await leaveService.approve(a.uuid, true, overrideReason.trim() || undefined);
      setSuccess(`Approved ${a.employeeName || 'request'} (exception)`);
      setApps((prev) => prev.filter((x) => x.uuid !== a.uuid));
      setOverrideTarget(null); setOverrideReason('');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    const a = rejectTarget;
    setBusyId(a.uuid); setError(''); setSuccess('');
    try {
      await leaveService.reject(a.uuid, note.trim() || undefined);
      setSuccess(`Rejected ${a.employeeName || 'request'}`);
      setApps((prev) => prev.filter((x) => x.uuid !== a.uuid));
      setRejectTarget(null); setNote('');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not reject');
    } finally {
      setBusyId(null);
    }
  };

  const openDoc = async (a) => {
    setError('');
    try {
      const att = await leaveService.getAttachment(a.uuid);
      if (att?.dataUri) {
        const w = window.open('', '_blank');
        if (w) w.document.write(`<title>${a.employeeName || 'Document'}</title><iframe src="${att.dataUri}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not open document');
    }
  };

  // The expanded detail (checklist + mini calendar), shared by desktop + mobile.
  const ExpandedDetail = ({ a }) => {
    const month = a.fromDate.slice(0, 7);
    const md = months[month] || { loading: true, byDate: {} };
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, py: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', mb: 1 }}>Approval checks</Typography>
          <RuleChecklist evaluation={a.evaluation} />
          {!passes(a) && (
            <Typography sx={{ fontSize: 12, color: '#8a6400', mt: 1 }}>A red check means approving needs an exception (you'll be asked to confirm + give a reason).</Typography>
          )}
        </Box>
        <MiniMonth month={month} byDate={md.byDate} fromDate={a.fromDate} toDate={a.toDate} loading={md.loading} />
      </Box>
    );
  };

  const approveButton = (a, extraSx) => (
    <Button size="small" variant="contained" color={passes(a) ? 'success' : 'warning'} startIcon={<ApproveIcon />}
      onClick={() => approve(a)} disabled={busyId === a.uuid} sx={{ minWidth: 116, ...extraSx }}>
      {passes(a) ? 'Approve' : 'Approve…'}
    </Button>
  );

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Leave Approvals</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : apps.length === 0 ? (
        <Alert severity="success">No pending leave requests. All clear. 🎉</Alert>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {apps.map((a) => (
            <Card key={a.uuid} variant="outlined" sx={{ borderColor: passes(a) ? undefined : '#f0c14b' }}>
              <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{a.employeeName || a.employeeId}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{dateRange(a.fromDate, a.toDate)} · {daysLabel(a)}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Submitted {fmtDateTime(a.appliedAt)}</Typography>
                    {a.reason && <Typography sx={{ fontSize: 12.5, color: 'text.disabled', mt: 0.25 }}>{a.reason}</Typography>}
                  </Box>
                  <Chip size="small" label={a.leaveTypeName || a.leaveTypeCode} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  {approveButton(a)}
                  <Button size="small" variant="outlined" color="error" startIcon={<RejectIcon />}
                    onClick={() => { setRejectTarget(a); setNote(''); }} disabled={busyId === a.uuid}>Reject</Button>
                  {a.hasAttachment && <Button size="small" color="inherit" startIcon={<AttachIcon />} onClick={() => openDoc(a)}>Doc</Button>}
                  <Button size="small" color="inherit" endIcon={expandedId === a.uuid ? <CollapseIcon /> : <ExpandIcon />} onClick={() => toggleExpand(a)}>Checks</Button>
                </Stack>
                <Collapse in={expandedId === a.uuid} unmountOnExit><ExpandedDetail a={a} /></Collapse>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['', 'Staff', 'Type', 'Dates', 'Days', 'Reason', 'Submitted', 'Action'].map((c, i) => (
                  <TableCell key={c || i} align={i === 7 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((a) => (
                <React.Fragment key={a.uuid}>
                  <TableRow hover sx={{ '& > td': { borderBottom: expandedId === a.uuid ? 'none' : undefined } }}>
                    <TableCell sx={{ width: 36 }}>
                      <Tooltip title={passes(a) ? 'All checks pass' : 'Needs an exception — expand to see'}>
                        <IconButton size="small" onClick={() => toggleExpand(a)}>
                          {expandedId === a.uuid ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" sx={{ color: passes(a) ? '#c3cad9' : '#e5396b' }} />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{a.employeeName || a.employeeId}</TableCell>
                    <TableCell><Chip size="small" label={a.leaveTypeName || a.leaveTypeCode} color="primary" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateRange(a.fromDate, a.toDate)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{daysLabel(a)}</TableCell>
                    <TableCell sx={{ maxWidth: 300, color: 'text.secondary' }}>
                      {a.reason || '—'}
                      {a.hasAttachment && <Button size="small" color="inherit" startIcon={<AttachIcon />} onClick={() => openDoc(a)} sx={{ ml: 0.5, minWidth: 0 }}>Doc</Button>}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12, color: 'text.secondary' }}>{fmtDateTime(a.appliedAt)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {approveButton(a, { mr: 1 })}
                      <Button size="small" variant="outlined" color="error" startIcon={<RejectIcon />}
                        onClick={() => { setRejectTarget(a); setNote(''); }} disabled={busyId === a.uuid}>Reject</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0, borderBottom: expandedId === a.uuid ? undefined : 'none' }}>
                      <Collapse in={expandedId === a.uuid} unmountOnExit>
                        <Box sx={{ px: 2, pb: 1 }}><ExpandedDetail a={a} /></Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 2 }}>
        Green “Approve” = all checks pass. Amber “Approve…” = a check fails (daily cap, annual balance, or a 0-working-day date) —
        it doesn't block you; you'll confirm an exception, and the leave still counts against the teacher's balance. Expand a row to see the checks and the month's leave calendar.
      </Typography>

      {/* Soft-threshold override */}
      <Dialog open={Boolean(overrideTarget)} onClose={() => setOverrideTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Approve as an exception?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Approving {overrideTarget?.app?.employeeName || 'this request'} crosses a policy limit:
          </Alert>
          <Box component="ul" sx={{ mt: 0, mb: 2, pl: 3 }}>
            {(overrideTarget?.warnings || []).map((w, i) => (
              <Typography key={i} component="li" sx={{ fontSize: 13.5, color: '#c42a56', mb: 0.5 }}>{w}</Typography>
            ))}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
            You can approve it anyway for exceptional cases. The leave will still be counted against the teacher's balance.
          </Typography>
          <TextField fullWidth margin="dense" label="Reason for the exception (recorded in the audit)"
            multiline minRows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideTarget(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={doOverride} disabled={busyId === overrideTarget?.app?.uuid}>Approve anyway</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject {rejectTarget?.employeeName || 'request'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth margin="dense" label="Reason (optional — shown to the applicant)"
            multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doReject} disabled={busyId === rejectTarget?.uuid}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
