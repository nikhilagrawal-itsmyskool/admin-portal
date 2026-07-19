import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, Chip, Checkbox, LinearProgress, CircularProgress,
  Button, List, ListItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import { useCan } from '../../permissions/can';

// April→March teaching order and calendar-month → academic-month anchor.
const MONTHS = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
const LABEL = { april: 'Apr', may: 'May', june: 'Jun', july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec', january: 'Jan', february: 'Feb', march: 'Mar' };
const CAL_TO_MONTH = MONTHS.reduce((acc, m, i) => { acc[[3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2][i]] = m; return acc; }, {});

export default function TeacherCoverage() {
  const { syllabusId, classId } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canMark = can('syllabus.progress.mark');

  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState({});
  const [month, setMonth] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        setRoster(await syllabusService.getProgressRoster(syllabusId, classId));
      } catch {
        setError('Failed to load coverage');
      } finally {
        setLoading(false);
      }
    })();
  }, [syllabusId, classId]);

  const months = useMemo(() => {
    if (!roster) return [];
    return MONTHS
      .map((m) => ({ month: m, entries: roster.entries.filter((e) => e.month === m) }))
      .filter((g) => g.entries.length > 0);
  }, [roster]);

  useEffect(() => {
    if (months.length === 0) { setMonth(null); return; }
    const anchor = CAL_TO_MONTH[new Date().getMonth()];
    setMonth((prev) => prev || (months.some((g) => g.month === anchor) ? anchor : months[0].month));
  }, [months]);

  const current = months.find((g) => g.month === month);

  const toggle = async (entry) => {
    if (!canMark) return;
    const next = !entry.covered;
    setSaving((s) => ({ ...s, [entry.uuid]: true }));
    setRoster((r) => {
      const entries = r.entries.map((e) => (e.uuid === entry.uuid ? { ...e, covered: next } : e));
      const covered = entries.filter((e) => e.entryType === 'topic' && e.covered).length;
      return { ...r, entries, counts: { total: r.counts.total, covered, pending: r.counts.total - covered } };
    });
    try {
      await syllabusService.markProgress({ entryId: entry.uuid, classId, status: next ? 'covered' : 'pending' });
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update');
      setRoster((r) => {
        const entries = r.entries.map((e) => (e.uuid === entry.uuid ? { ...e, covered: !next } : e));
        const covered = entries.filter((e) => e.entryType === 'topic' && e.covered).length;
        return { ...r, entries, counts: { total: r.counts.total, covered, pending: r.counts.total - covered } };
      });
    } finally {
      setSaving((s) => { const n = { ...s }; delete n[entry.uuid]; return n; });
    }
  };

  const pct = roster && roster.counts.total > 0 ? Math.round((roster.counts.covered / roster.counts.total) * 100) : 0;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!roster) return <Alert severity="error">Not found. <Button onClick={() => navigate('/syllabus/my')}>Back</Button></Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<BackIcon />} size="small" onClick={() => navigate('/syllabus/my')}>Back</Button>
        <Typography variant="h6">{roster.className}</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip size="small" color="success" label={`${roster.counts.covered} done`} />
            <Chip size="small" variant="outlined" label={`${roster.counts.pending} left`} />
            <Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1 }} /></Box>
            <Typography variant="body2" color="text.secondary">{pct}%</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Month pager */}
      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 1 }}>
        {months.map((g) => {
          const isNow = g.month === CAL_TO_MONTH[new Date().getMonth()];
          return (
            <Chip key={g.month} label={LABEL[g.month]} clickable color={g.month === month ? 'primary' : 'default'}
              variant={g.month === month ? 'filled' : 'outlined'} onClick={() => setMonth(g.month)}
              sx={{ fontWeight: 700, ...(isNow && g.month !== month ? { borderColor: 'error.main', color: 'error.main' } : {}) }} />
          );
        })}
      </Box>

      <Card>
        <List dense disablePadding>
          {(current?.entries ?? []).map((e, i) => {
            const isTopic = e.entryType === 'topic';
            return (
              <React.Fragment key={e.uuid}>
                {i > 0 && <Divider component="li" />}
                <ListItem sx={{ bgcolor: e.covered ? 'action.hover' : 'inherit' }}
                  secondaryAction={!isTopic ? <Chip size="small" variant="outlined" label={e.entryType} /> : null}>
                  {isTopic && (
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox edge="start" checked={Boolean(e.covered)} disabled={!canMark || Boolean(saving[e.uuid])}
                        onChange={() => toggle(e)} />
                    </ListItemIcon>
                  )}
                  <ListItemText
                    inset={!isTopic}
                    primary={`${e.topicNo ? `${e.topicNo}. ` : ''}${e.title}`}
                    secondary={[e.theme, e.pageRef ? `p. ${e.pageRef}` : null].filter(Boolean).join(' · ') || null}
                    primaryTypographyProps={{ fontWeight: isTopic ? 500 : 700, fontSize: 14 }}
                  />
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Card>
    </Box>
  );
}
