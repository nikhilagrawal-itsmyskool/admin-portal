import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Alert, Chip, CircularProgress, Stack,
  TextField, MenuItem, Autocomplete, Table, TableHead, TableRow, TableCell, TableBody,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { PersonSearch as StudentSearchIcon, Clear as ClearIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { feedbackService, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../../services/feedbackService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import usePersistedState from '../../hooks/usePersistedState';
import { fmtDate } from '../../utils/date';
import StudentAvatar from '../../components/common/StudentAvatar';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';

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
const GROUP_OPTIONS = [
  { key: 'none', label: 'List' },
  { key: 'student', label: 'By student' },
  { key: 'class', label: 'By class' },
  { key: 'teacher', label: 'By teacher' },
  { key: 'date', label: 'By date' },
];
const GROUP_FIELD = { student: 'studentId', class: 'classId', teacher: 'assignedTo', date: 'date' };

const DEFAULT_VIEW = {
  groupBy: 'none', status: 'open', owner: '', assignedTo: '', categoryId: '', sort: 'oldest',
  studentId: '', classId: '', date: '', drillLabel: '', drillFrom: '',
};

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
  // View state persists across list -> ticket -> back, so you land where you left off.
  const [view, setViewRaw] = usePersistedState('feedback.dashboard', DEFAULT_VIEW);
  const setView = useCallback((patch) => setViewRaw((v) => ({ ...v, ...patch })), [setViewRaw]);

  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);

  const { groupBy, status, owner, assignedTo, categoryId, sort, studentId, classId, date, drillLabel, drillFrom } = view;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const sum = await feedbackService.summary(academicYearId);
      setSummary(sum);
      if (groupBy !== 'none') {
        setGroups((await feedbackService.grouped({ by: groupBy, academicYearId: academicYearId || undefined })) || []);
      } else {
        setItems((await feedbackService.list({
          status: status || undefined,
          owner: owner || undefined,
          assignedTo: assignedTo || undefined,
          studentId: studentId || undefined,
          classId: classId || undefined,
          date: date || undefined,
          categoryId: categoryId || undefined,
          academicYearId: academicYearId || undefined,
          sort,
        })) || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [groupBy, status, owner, assignedTo, studentId, classId, date, categoryId, sort, academicYearId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { feedbackService.categories().then(setCategories).catch(() => {}); }, []);

  // Stat tile → quick filter (drops grouping + any drill).
  const quick = (patch) => setView({ ...DEFAULT_VIEW, sort, ...patch });
  // Drill into a group row → list that group across all statuses. Remember which group we
  // came from so we can offer a "back to <group>" affordance.
  const drill = (g) => {
    const field = GROUP_FIELD[groupBy];
    const label = groupBy === 'date' ? fmtDate(g.key) : (g.label || '—');
    setView({
      groupBy: 'none', status: '', owner: '', assignedTo: '', studentId: '', classId: '', date: '',
      [field]: g.key, drillLabel: `${GROUP_OPTIONS.find((o) => o.key === groupBy).label}: ${label}`, drillFrom: groupBy,
    });
  };
  // Return to the group list we drilled from (or the flat list if the drill came from a
  // student search rather than a group).
  const backToGroup = () => setView({ groupBy: drillFrom || 'none', studentId: '', classId: '', date: '', drillLabel: '', drillFrom: '', status: 'open' });

  const teacherOptions = summary?.byTeacher || [];
  const selectedTeacher = teacherOptions.find((t) => t.employeeId === assignedTo) || null;
  const s = summary?.byStatus;
  const activeFilterLabel = [
    (STATUS_OPTIONS.find((o) => o.key === status) || {}).label || 'All',
    owner ? (OWNER_OPTIONS.find((o) => o.key === owner) || {}).label : null,
    !drillLabel && assignedTo ? ((teacherOptions.find((t) => t.employeeId === assignedTo) || {}).employeeName || 'teacher') : null,
    categoryId ? (categories.find((c) => c.uuid === categoryId) || {}).name : null,
  ].filter(Boolean).join(' · ');

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Feedback</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stat tiles */}
      {summary && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={2.4}><Stat n={summary.open} label="Open" color="#0288d1" active={groupBy === 'none' && status === 'open' && !owner && !drillLabel} onClick={() => quick({ status: 'open' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={summary.awaitingDirector} label="Awaiting me" color="#5c6bc0" active={owner === 'director'} onClick={() => quick({ status: 'open', owner: 'director' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={summary.outWithTeachers} label="With teachers" color="#f57c00" active={owner === 'teachers'} onClick={() => quick({ status: 'open', owner: 'teachers' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={s?.completed} label="Completed" color="#2e7d32" active={groupBy === 'none' && status === 'completed'} onClick={() => quick({ status: 'completed' })} /></Grid>
          <Grid item xs={6} sm={2.4}><Stat n={s?.cancelled} label="Cancelled" color="#9e9e9e" active={groupBy === 'none' && status === 'cancelled'} onClick={() => quick({ status: 'cancelled' })} /></Grid>
        </Grid>
      )}

      {/* View controls: group-by + student search */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }} alignItems="center">
        {drillFrom && (
          <Button size="small" variant="outlined" startIcon={<BackIcon />} onClick={backToGroup}>
            Back to {GROUP_OPTIONS.find((o) => o.key === drillFrom)?.label || 'groups'}
          </Button>
        )}
        <ToggleButtonGroup size="small" exclusive value={groupBy}
          onChange={(e, v) => v !== null && setView({ groupBy: v, studentId: '', classId: '', date: '', drillLabel: '', drillFrom: '' })}>
          {GROUP_OPTIONS.map((o) => <ToggleButton key={o.key} value={o.key}>{o.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Button size="small" variant="outlined" startIcon={<StudentSearchIcon />} onClick={() => setStudentSearchOpen(true)}>
          Find student
        </Button>
        {drillLabel && (
          <Chip color="primary" label={drillLabel} onDelete={backToGroup} deleteIcon={<ClearIcon />} />
        )}
      </Stack>

      {/* Filters (only meaningful in list mode) */}
      {groupBy === 'none' && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={6} sm={2}>
                <TextField select fullWidth size="small" label="Status" value={status} onChange={(e) => setView({ status: e.target.value })}>
                  {STATUS_OPTIONS.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField select fullWidth size="small" label="Owner" value={owner} onChange={(e) => setView({ owner: e.target.value })}>
                  {OWNER_OPTIONS.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete size="small" options={teacherOptions} value={selectedTeacher}
                  getOptionLabel={(o) => o.employeeName || '—'}
                  isOptionEqualToValue={(o, v) => o.employeeId === v.employeeId}
                  onChange={(e, v) => setView({ assignedTo: v?.employeeId || '', drillLabel: '' })}
                  renderInput={(params) => <TextField {...params} label="Teacher" placeholder="All" />} />
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField select fullWidth size="small" label="Category" value={categoryId} onChange={(e) => setView({ categoryId: e.target.value })}>
                  <MenuItem value="">All</MenuItem>
                  {categories.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField select fullWidth size="small" label="Sort" value={sort} onChange={(e) => setView({ sort: e.target.value })}>
                  <MenuItem value="oldest">Oldest first</MenuItem>
                  <MenuItem value="newest">Newest first</MenuItem>
                  <MenuItem value="activity">Recent activity</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : groupBy !== 'none' ? (
        // ── Grouped view ─────────────────────────────────────────────────────────
        groups.length === 0 ? <Alert severity="info">Nothing to group.</Alert> : (
          <Stack spacing={1}>
            {groups.map((g) => (
              <Card key={g.key || 'none'} variant="outlined" onClick={() => drill(g)} sx={{ cursor: 'pointer' }}>
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {groupBy === 'student' && <StudentAvatar studentId={g.key} name={g.label} size={36} />}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      {groupBy === 'date' ? fmtDate(g.key) : (g.label || '—')}
                    </Typography>
                    {g.sublabel && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{g.sublabel}</Typography>}
                  </Box>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {g.open > 0 && <Chip size="small" color="info" variant="outlined" label={`${g.open} open`} />}
                    {g.completed > 0 && <Chip size="small" color="success" variant="outlined" label={`${g.completed} done`} />}
                    {g.cancelled > 0 && <Chip size="small" variant="outlined" label={`${g.cancelled} cancelled`} />}
                    <Chip size="small" label={`${g.total} total`} sx={{ fontWeight: 700 }} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )
      ) : (
        // ── List view ────────────────────────────────────────────────────────────
        <>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
            Showing <b>{items.length}</b>{drillLabel ? ` · ${drillLabel}` : (activeFilterLabel ? ` · ${activeFilterLabel}` : '')}
          </Typography>
          {items.length === 0 ? (
            <Alert severity="info">No feedback for this filter.</Alert>
          ) : isMobile ? (
            <Stack spacing={1.25}>
              {items.map((f) => (
                <Card key={f.uuid} variant="outlined" onClick={() => navigate(`/feedback/t/${f.uuid}`)} sx={{ cursor: 'pointer' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, minWidth: 0 }}>
                        <StudentAvatar studentId={f.studentId} name={f.studentName} size={40} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{f.studentName}{f.className ? ` · ${f.className}` : ''}</Typography>
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                            {f.categoryName || 'Feedback'}{f.visitDate ? ` · ${fmtDate(f.visitDate)}` : ''} · {f.assignedToName || '—'}
                          </Typography>
                        </Box>
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
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StudentAvatar studentId={f.studentId} name={f.studentName} size={30} />
                          <span style={{ fontWeight: 600 }}>{f.studentName}{f.className ? <Typography component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}> · {f.className}</Typography> : null}</span>
                        </Box>
                      </TableCell>
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
        </>
      )}

      <StudentSearchDialog open={studentSearchOpen} onClose={() => setStudentSearchOpen(false)}
        onSelect={(stu) => {
          setStudentSearchOpen(false);
          setView({
            groupBy: 'none', status: '', owner: '', assignedTo: '', classId: '', date: '',
            studentId: stu.uuid, drillLabel: `Student: ${stu.name}${stu.className ? ` · ${stu.className}` : ''}`,
          });
        }} />
    </Box>
  );
}
