import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea, Stack, Chip, Alert, Divider,
} from '@mui/material';
import { Groups as HouseIcon, Grading as GradeIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';

const fmt = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const STATUS_COLOR = { draft: 'default', submitted: 'warning', approved: 'success', 'not-created': 'default' };

// Teacher PWA home: the weeks where my house is on duty (I'm the in-charge), plus
// my evaluator status. Backed by /me/assembly/duties (derived from house_teacher).
export default function MyAssemblyDuties() {
  const navigate = useNavigate();
  const [duties, setDuties] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { setDuties(await assemblyService.myDuties()); }
      catch (err) { setError(err.response?.data?.error?.description || 'Failed to load your duties'); }
    })();
  }, []);

  const roster = duties?.rosterDuties || [];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>My Assembly Duties</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Rosters to author (my house on duty)</Typography>
      <Stack spacing={1.5}>
        {roster.map((d) => {
          const openable = Boolean(d.weekId);
          const card = (
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <HouseIcon color="action" />
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography sx={{ fontWeight: 600 }}>Week of {fmt(d.weekStart)}</Typography>
                  <Typography variant="body2" color="text.secondary">{d.planName}{d.houseName ? ` · ${d.houseName}` : ''}</Typography>
                </Box>
                <Chip size="small" label={d.status === 'not-created' ? 'Not started' : d.status}
                  color={STATUS_COLOR[d.status] || 'default'} variant={d.status === 'not-created' ? 'outlined' : 'filled'} />
              </Stack>
              {!openable && <Typography variant="caption" color="text.secondary">Not started yet — ask an admin to open this week.</Typography>}
            </CardContent>
          );
          return (
            <Card key={`${d.planId}-${d.weekStart}`} variant="outlined">
              {openable
                ? <CardActionArea onClick={() => navigate(`/assembly/my-weeks/${d.weekId}`)}>{card}</CardActionArea>
                : card}
            </Card>
          );
        })}
        {roster.length === 0 && duties && <Typography variant="body2" color="text.secondary">No roster duties assigned to you.</Typography>}
      </Stack>

      {duties?.isEvaluator && (
        <>
          <Divider sx={{ my: 3 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <GradeIcon color="action" />
            <Typography variant="body2" color="text.secondary">
              You are an assembly evaluator{duties.evaluatorRanges?.[0]?.startDate ? ` (${duties.evaluatorRanges[0].startDate} → ${duties.evaluatorRanges[0].endDate || '…'})` : ''}.
              Open a week you can grade to enter scores.
            </Typography>
          </Stack>
        </>
      )}
    </Box>
  );
}
