import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, Chip, LinearProgress, CircularProgress, Button,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import { useCan } from '../../permissions/can';
import CoverageTree from './CoverageTree';

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
  const [mySections, setMySections] = useState([]); // this teacher's sections for this plan
  const [alsoMark, setAlsoMark] = useState(() => new Set()); // extra sections to co-mark

  useEffect(() => {
    setAlsoMark(new Set());
    (async () => {
      setLoading(true); setError('');
      try {
        const [r, mine] = await Promise.all([
          syllabusService.getProgressRoster(syllabusId, classId),
          syllabusService.getMyPlans().catch(() => []),
        ]);
        setRoster(r);
        setMySections((mine || [])
          .filter((p) => p.syllabusId === syllabusId)
          .map((p) => ({ classId: p.classId, className: p.className })));
      } catch {
        setError('Failed to load coverage');
      } finally {
        setLoading(false);
      }
    })();
  }, [syllabusId, classId]);

  const others = mySections.filter((s) => s.classId !== classId);
  const currentMonth = CAL_TO_MONTH[new Date().getMonth()];

  const toggle = async (entry) => {
    if (!canMark) return;
    const next = !entry.covered;
    setSaving((s) => ({ ...s, [entry.uuid]: true }));
    // Optimistic: flip this leaf and adjust the leaf-based count by one.
    const adjust = (r, cov) => {
      const entries = r.entries.map((e) => (e.uuid === entry.uuid ? { ...e, covered: cov } : e));
      const covered = r.counts.covered + (cov ? 1 : -1);
      return { ...r, entries, counts: { total: r.counts.total, covered, pending: r.counts.total - covered } };
    };
    setRoster((r) => adjust(r, next));
    const targets = [classId, ...Array.from(alsoMark)];
    try {
      await Promise.all(targets.map((cid) => syllabusService.markProgress({ entryId: entry.uuid, classId: cid, status: next ? 'covered' : 'pending' })));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update');
      setRoster((r) => adjust(r, !next));
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

      {/* Batch marking: co-mark the same item in the teacher's other sections */}
      {canMark && others.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Also mark in:</Typography>
          {others.map((s) => {
            const on = alsoMark.has(s.classId);
            return (
              <Chip key={s.classId} size="small" label={s.className} clickable
                color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                onClick={() => setAlsoMark((prev) => {
                  const n = new Set(prev);
                  if (n.has(s.classId)) n.delete(s.classId); else n.add(s.classId);
                  return n;
                })} />
            );
          })}
          {alsoMark.size > 0 && (
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
              ticks apply to {alsoMark.size + 1} sections
            </Typography>
          )}
        </Box>
      )}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <CoverageTree entries={roster.entries} monthLabel={LABEL} canMark={canMark}
            savingIds={saving} onToggle={toggle} currentMonth={currentMonth} />
        </CardContent>
      </Card>
    </Box>
  );
}
