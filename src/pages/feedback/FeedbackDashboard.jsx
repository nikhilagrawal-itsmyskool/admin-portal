import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, CircularProgress, Stack,
  TextField, MenuItem, Autocomplete, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { feedbackService, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../../services/feedbackService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate } from '../../utils/date';

const STATUS_OPTIONS = [
  { key: 'open', label: 'Open' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: '', label: 'All' },
];
const OWNER_OPTIONS = [
  { key: '', label: 'Anyone' },
  { key: 'teachers', label: 'Out with teachers' },
  { key: 'director', label: 'Awaiting director' },
];

// A stat tile that applies a filter when clicked.
function Stat({ n, label, active, onClick, color }) {
  return (
    <Card variant={active ? 'elevation' : 'outlined'} onClick={onClick}
      sx={{ cursor: 'pointer', borderColor: active ? color : undefined, borderWidth: active ? 2 : 1, minWidth: 0 }}>
      <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color }}>{n ?? 0}</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function FeedbackDashboard() {
  const { academicYearId } = useAcademicYear();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Applied filters (drive the fetch).
  const [status, setStatus] = useState('open');
  const [owner, setOwner] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('oldest');
  // Draft filters (applied on Search).
  const [fStatus, setFStatus] = useState('open');
  const [fOwner, setFOwner] = useState('');
  const [fTeacher, setFTeacher] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fSort, setFSort] = useState('oldest');

  const loadList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rows, sum] = await Promise.all([
        feedbackService.list({
          status: status || undefined,
          owner: owner || undefined,
          assignedTo: assignedTo || undefined,
          categoryId: categoryId || undefined,
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
  }, [status, owner, assignedTo, categoryId, sort, academicYearId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { feedbackService.categories().then(setCategories).catch(() => {}); }, []);

  const doSearch = () => { setStatus(fStatus); setOwner(fOwner); setAssignedTo(fTeacher); setCategoryId(fCategory); setSort(fSort); };
  const doReset = () => {
    setFStatus('open'); setFOwner(''); setFTeacher(''); setFCategory(''); setFSort('oldest');
    setStatus('open'); setOwner(''); setAssignedTo(''); setCategoryId(''); setSort('oldest');
  };
  // Clicking a stat tile applies a quick filter.
  const quick = (patch) => {
    setStatus(patch.status ?? ''); setOwner(patch.owner ?? ''); setAssignedTo('');
    setFStatus(patch.status ?? ''); setFOwner(patch.owner ?? ''); setFTeacher('');
  };

  const teacherOptions = summary?.byTeacher || [];
  const selectedTeacher = teacherOptions.find((t) => t.employeeId === fTeacher) || null;
  const s = summary?.byStatus;

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Feedback</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stat tiles */}
      {summary && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={2.4}><Stat n={summary.open} label="Open" color="#0288d1" active={status === 'open' && !owner} onClick={() => quick({ status: 'open' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={summary.awaitingDirector} label="Awaiting me" color="#5c6bc0" active={owner === 'director'} onClick={() => quick({ status: 'open', owner: 'director' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={summary.outWithTeachers} label="With teachers" color="#f57c00" active={owner === 'teachers'} onClick={() => quick({ status: 'open', owner: 'teachers' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={s?.completed} label="Completed" color="#2e7d32" active={status === 'completed'} onClick={() => quick({ status: 'completed' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={s?.cancelled} label="Cancelled" color="#9e9e9e" active={status === 'cancelled'} onClick={() => quick({ status: 'cancelled' })} /></Grid>
        </Grid>
      )}

      {/* Teacher-wise breakup */}
      {summary && summary.byTeacher.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>BY TEACHER</Typography>
            {isMobile ? (
              <Stack spacing={1}>
                {summary.byTeacher.map((t) => (
                  <Box key={t.employeeId} onClick={() => { setAssignedTo(t.employeeId); setFTeacher(t.employeeId); }}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 1, cursor: 'pointer', bgcolor: assignedTo === t.employeeId ? 'action.selected' : 'transparent' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{t.employeeName || '—'}</Typography>
                    <Stack direction="row" spacing={0.75}>
                      <Chip size="small" color="info" variant="outlined" label={`${t.open} open`} />
                      <Chip size="small" color="success" variant="outlined" label={`${t.completed} done`} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Teacher', 'Open', 'Completed', 'Total'].map((c, i) => (
                      <TableCell key={c} align={i === 0 ? 'left' : 'center'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.byTeacher.map((t) => (
                    <TableRow key={t.employeeId} hover selected={assignedTo === t.employeeId} sx={{ cursor: 'pointer' }}
                      onClick={() => { setAssignedTo(t.employeeId); setFTeacher(t.employeeId); }}>
                      <TableCell sx={{ fontWeight: 600 }}>{t.employeeName || '—'}</TableCell>
                      <TableCell align="center">{t.open}</TableCell>
                      <TableCell align="center">{t.completed}</TableCell>
                      <TableCell align="center">{t.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={6} sm={2}>
              <TextField select fullWidth size="small" label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField select fullWidth size="small" label="Owner" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
                {OWNER_OPTIONS.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Autocomplete size="small" options={teacherOptions} value={selectedTeacher}
                getOptionLabel={(o) => o.employeeName || '—'}
                isOptionEqualToValue={(o, v) => o.employeeId === v.employeeId}
                onChange={(e, v) => setFTeacher(v?.employeeId || '')}
                renderInput={(params) => <TextField {...params} label="Teacher" placeholder="All" />} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField select fullWidth size="small" label="Category" value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {categories.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <TextField select fullWidth size="small" label="Sort" value={fSort} onChange={(e) => setFSort(e.target.value)}>
                <MenuItem value="oldest">Oldest first</MenuItem>
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="activity">Recent activity</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={1.5}>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={doSearch}>Go</Button>
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
            <Card key={f.uuid} variant="outlined" onClick={() => navigate(`/feedback/t/${f.uuid}`)} sx={{ cursor: 'pointer' }}>
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
                {['Visit', 'Student', 'Category', 'Owner', 'Status', ''].map((c, i) => (
                  <TableCell key={c || i} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((f) => (
                <TableRow key={f.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/feedback/t/${f.uuid}`)}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{f.visitDate ? fmtDate(f.visitDate) : '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{f.studentName}{f.className ? <Typography component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}> · {f.className}</Typography> : null}</TableCell>
                  <TableCell>{f.categoryName || '—'}</TableCell>
                  <TableCell>{f.assignedToName || '—'}{f.awaitingDirector ? <Chip size="small" variant="outlined" color="primary" label="me" sx={{ ml: 0.5, height: 18, fontSize: 10 }} /> : null}</TableCell>
                  <TableCell><Chip size="small" label={FEEDBACK_STATUS_LABEL[f.status] || f.status} color={FEEDBACK_STATUS_COLOR[f.status] || 'default'} sx={{ fontWeight: 700 }} /></TableCell>
                  <TableCell align="right"><Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); navigate(`/feedback/t/${f.uuid}`); }}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
}
