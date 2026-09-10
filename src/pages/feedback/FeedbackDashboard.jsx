import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, CircularProgress, Stack,
  TextField, MenuItem, Autocomplete, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { feedbackService, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../../services/feedbackService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate, fmtDateTime } from '../../utils/date';

const STATUS_OPTIONS = [
  { key: 'open', label: 'Open (not completed)' },
  { key: 'assigned', label: 'Awaiting teacher' },
  { key: 'responded', label: 'Awaiting review' },
  { key: 'reopened', label: 'Reopened' },
  { key: 'completed', label: 'Completed' },
  { key: '', label: 'All' },
];

export default function FeedbackDashboard() {
  const { academicYearId } = useAcademicYear();
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Applied filters (drive the list fetch).
  const [status, setStatus] = useState('open');
  const [assignedTo, setAssignedTo] = useState('');
  const [sort, setSort] = useState('oldest');
  // Search-form (draft) filters — applied to the above on Search.
  const [fStatus, setFStatus] = useState('open');
  const [fTeacher, setFTeacher] = useState(''); // employeeId
  const [fSort, setFSort] = useState('oldest');

  const [detail, setDetail] = useState(null); // full feedback + audit
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rows, sum] = await Promise.all([
        feedbackService.list({
          status: status || undefined,
          assignedTo: assignedTo || undefined,
          academicYearId: academicYearId || undefined,
          sort,
        }),
        feedbackService.summary(academicYearId),
      ]);
      setItems(rows || []);
      setSummary(sum);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [status, assignedTo, sort, academicYearId]);

  useEffect(() => { loadList(); }, [loadList]);

  const doSearch = () => { setStatus(fStatus); setAssignedTo(fTeacher); setSort(fSort); };
  const doReset = () => {
    setFStatus('open'); setFTeacher(''); setFSort('oldest');
    setStatus('open'); setAssignedTo(''); setSort('oldest');
  };
  const teacherOptions = summary?.byTeacher || [];
  const selectedTeacher = teacherOptions.find((t) => t.employeeId === fTeacher) || null;

  const openDetail = async (id) => {
    setError('');
    try {
      setDetail(await feedbackService.getById(id));
      setReviewNote('');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to open feedback');
    }
  };

  const act = async (kind) => {
    setBusy(true); setError('');
    try {
      if (kind === 'complete') await feedbackService.complete(detail.uuid, reviewNote.trim() || undefined);
      else await feedbackService.reopen(detail.uuid, reviewNote.trim() || undefined);
      setDetail(null);
      setSuccess(kind === 'complete' ? 'Feedback marked completed.' : 'Feedback reopened for the teacher.');
      loadList();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const s = summary?.byStatus;

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Feedback</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Summary */}
      {summary && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{summary.open}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Open</Typography>
              </Grid>
              <Grid item xs={6} sm={9}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: { xs: 0, sm: 1 } }}>
                  <Chip label={`${s.assigned} awaiting teacher`} color="info" variant="outlined" />
                  <Chip label={`${s.reopened} reopened`} color="warning" variant="outlined" />
                  <Chip label={`${s.responded} awaiting review`} color="primary" variant="outlined" />
                  <Chip label={`${s.completed} completed`} color="success" variant="outlined" />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Teacher-wise breakup */}
      {summary && summary.byTeacher.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>BY TEACHER</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Teacher', 'Open', 'Awaiting review', 'Completed', 'Total'].map((c, i) => (
                    <TableCell key={c || i} align={i === 0 ? 'left' : 'center'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.byTeacher.map((t) => (
                  <TableRow key={t.employeeId} hover selected={assignedTo === t.employeeId}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.employeeName || '—'}</TableCell>
                    <TableCell align="center">{t.open}</TableCell>
                    <TableCell align="center">{t.responded}</TableCell>
                    <TableCell align="center">{t.completed}</TableCell>
                    <TableCell align="center">{t.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Search form */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth size="small" label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Autocomplete
                size="small"
                options={teacherOptions}
                value={selectedTeacher}
                getOptionLabel={(o) => o.employeeName || '—'}
                isOptionEqualToValue={(o, v) => o.employeeId === v.employeeId}
                onChange={(e, v) => setFTeacher(v?.employeeId || '')}
                renderInput={(params) => <TextField {...params} label="Teacher" placeholder="All teachers" />}
              />
            </Grid>
            <Grid item xs={7} sm={2}>
              <TextField select fullWidth size="small" label="Sort" value={fSort} onChange={(e) => setFSort(e.target.value)}>
                <MenuItem value="oldest">Oldest first</MenuItem>
                <MenuItem value="newest">Newest first</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={5} sm={2}>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={doSearch}>Search</Button>
                <Button onClick={doReset}>Reset</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No feedback for this filter.</Alert>
      ) : isMobile ? (
        <Stack spacing={1.25}>
          {items.map((f) => (
            <Card key={f.uuid} variant="outlined" onClick={() => openDetail(f.uuid)} sx={{ cursor: 'pointer' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{f.studentName}{f.className ? ` · ${f.className}` : ''}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      {f.categoryName || 'Feedback'}{f.visitDate ? ` · ${fmtDate(f.visitDate)}` : ''} · {f.assignedToName || '—'}
                    </Typography>
                  </Box>
                  <Chip size="small" label={FEEDBACK_STATUS_LABEL[f.status] || f.status} color={FEEDBACK_STATUS_COLOR[f.status] || 'default'} sx={{ fontWeight: 700 }} />
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {f.feedbackText}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Visit', 'Student', 'Category', 'Teacher', 'Status', ''].map((c, i) => (
                  <TableCell key={c || i} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((f) => (
                <TableRow key={f.uuid} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{f.visitDate ? fmtDate(f.visitDate) : '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{f.studentName}{f.className ? <Typography component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}> · {f.className}</Typography> : null}</TableCell>
                  <TableCell>{f.categoryName || '—'}</TableCell>
                  <TableCell>{f.assignedToName || '—'}</TableCell>
                  <TableCell><Chip size="small" label={FEEDBACK_STATUS_LABEL[f.status] || f.status} color={FEEDBACK_STATUS_COLOR[f.status] || 'default'} sx={{ fontWeight: 700 }} /></TableCell>
                  <TableCell align="right"><Button size="small" variant="outlined" onClick={() => openDetail(f.uuid)}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail + review */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        {detail && (
          <>
            <DialogTitle sx={{ pb: 0.5 }}>
              {detail.studentName}{detail.className ? ` · ${detail.className}` : ''}
              <Chip size="small" label={FEEDBACK_STATUS_LABEL[detail.status] || detail.status} color={FEEDBACK_STATUS_COLOR[detail.status] || 'default'} sx={{ ml: 1, fontWeight: 700 }} />
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                {detail.categoryName || 'Feedback'}{detail.visitDate ? ` · visit ${fmtDate(detail.visitDate)}` : ''}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                Recorded by {detail.recordedByName || 'office'} · assigned to {detail.assignedToName || '—'}
              </Typography>
              <Typography sx={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{detail.feedbackText}</Typography>

              {detail.teacherComment && (
                <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
                    TEACHER RESPONSE{detail.respondedAt ? ` · ${fmtDateTime(detail.respondedAt)}` : ''}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{detail.teacherComment}</Typography>
                </Box>
              )}

              {/* Review action */}
              {detail.status === 'responded' && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <TextField fullWidth size="small" label="Review note (optional)" multiline minRows={2} value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)} />
                </>
              )}

              {/* Audit trail */}
              {Array.isArray(detail.audit) && detail.audit.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>HISTORY</Typography>
                  <Stack spacing={0.5}>
                    {detail.audit.map((a) => (
                      <Typography key={a.uuid} sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {a.changedAt ? fmtDateTime(a.changedAt) : ''} · <b>{a.action}</b>
                        {a.changedbyName ? ` by ${a.changedbyName}` : ''}{a.detail ? ` — ${a.detail}` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetail(null)}>Close</Button>
              {(detail.status === 'responded' || detail.status === 'completed') && (
                <Button color="warning" onClick={() => act('reopen')} disabled={busy}>Reopen</Button>
              )}
              {detail.status === 'responded' && (
                <Button variant="contained" color="success" onClick={() => act('complete')} disabled={busy}>Mark completed</Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
