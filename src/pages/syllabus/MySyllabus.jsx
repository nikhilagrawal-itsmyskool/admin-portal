import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardActionArea, CardContent, Alert, LinearProgress, Chip, CircularProgress,
} from '@mui/material';
import { ChevronRight as ChevronIcon } from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';

// Teacher PWA: the plans (per section) this teacher is assigned to. Tap one to
// view its month timeline and mark coverage.
export default function MySyllabus() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setPlans((await syllabusService.getMyPlans()) || []);
      } catch {
        setError('Failed to load your syllabus plans');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>My Syllabus</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : plans.length === 0 ? (
        <Alert severity="info">You’re not assigned to any syllabus yet. Ask your admin to add you as a teacher on a plan.</Alert>
      ) : (
        plans.map((p) => {
          const pct = p.totalTopics > 0 ? Math.round((p.coveredTopics / p.totalTopics) * 100) : 0;
          return (
            <Card key={p.assignmentId} sx={{ mb: 1.5 }}>
              <CardActionArea onClick={() => navigate(`/syllabus/my/${p.syllabusId}/${p.classId}`)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {p.subjectName || 'Syllabus'} · {p.className}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Grade {p.grade} · {p.coveredTopics} / {p.totalTopics} topics covered
                      </Typography>
                      <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 6, borderRadius: 1 }} />
                    </Box>
                    <Chip size="small" color="success" label={`${pct}%`} />
                    <ChevronIcon color="action" />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })
      )}
    </Box>
  );
}
