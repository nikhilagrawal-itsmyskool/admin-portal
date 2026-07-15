import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, CircularProgress, Alert,
} from '@mui/material';
import {
  Subject as SubjectIcon,
  GridOn as GridIcon,
  Groups as ClassSetupIcon,
  Rule as ConstraintIcon,
  AutoAwesome as GenerateIcon,
  EventAvailable as PublishedIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { timetableService } from '../../services/timetableService';

export default function TimetableDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ subjects: 0, configs: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [subjectsData, configsData] = await Promise.all([
        timetableService.getSubjects(),
        timetableService.getConfigs(),
      ]);
      setStats({
        subjects: (subjectsData.subjects || []).length,
        configs: (configsData.configs || []).length,
      });
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Subjects', value: stats.subjects, icon: SubjectIcon, color: '#3366ff', path: '/timetable/subjects' },
    { title: 'Grid Configs', value: stats.configs, icon: GridIcon, color: '#00d68f', path: '/timetable/configs' },
  ];

  const quickLinks = [
    { title: 'Subjects', description: 'Manage subjects (academic, games, library, activity)', icon: SubjectIcon, path: '/timetable/subjects' },
    { title: 'Grid Config', description: 'Build the day-varying bell schedule (assembly, 0th/registration, periods, breaks), then lock it for generation', icon: GridIcon, path: '/timetable/configs' },
    { title: 'Class Setup', description: 'Class teacher, subjects, teaching assignments, elective bands', icon: ClassSetupIcon, path: '/timetable/setup' },
    { title: 'Teacher Constraints', description: 'Day-offs, unavailable slots, weekly maximums', icon: ConstraintIcon, path: '/timetable/constraints' },
    { title: 'Generate Timetable', description: 'Run feasibility, generate candidates, review and publish', icon: GenerateIcon, path: '/timetable/generate' },
    { title: 'Published', description: 'View the active published master timetable', icon: PublishedIcon, path: '/timetable/published' },
    { title: 'Seasons & Bell Timings', description: 'Summer/winter period times over the same grid, and when each applies (drives the app’s "happening now")', icon: ScheduleIcon, path: '/timetable/seasons' },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Timetable Module</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card sx={{ borderLeft: `4px solid ${card.color}` }}>
              <CardActionArea onClick={() => navigate(card.path)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#8f9bb3' }}>{card.title}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>{card.value}</Typography>
                    </Box>
                    <card.icon sx={{ fontSize: 40, color: card.color, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>Quick Links</Typography>
      <Grid container spacing={3}>
        {quickLinks.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.title}>
            <Card>
              <CardActionArea onClick={() => navigate(link.path)}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, backgroundColor: '#f0f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <link.icon sx={{ color: '#3366ff' }} />
                  </Box>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>{link.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#8f9bb3' }}>{link.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
