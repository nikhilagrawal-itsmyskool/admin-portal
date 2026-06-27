import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import {
  EditCalendar as MarkIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

const links = [
  { title: 'Take Attendance', desc: 'Mark a class roll-call for a date', icon: MarkIcon, path: '/attendance/mark' },
  { title: 'History', desc: 'Browse and correct past sessions', icon: HistoryIcon, path: '/attendance/sessions' },
];

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Attendance</Typography>
      <Grid container spacing={3}>
        {links.map((l) => (
          <Grid item xs={12} sm={6} md={4} key={l.path}>
            <Card>
              <CardActionArea onClick={() => navigate(l.path)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                  <l.icon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6">{l.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{l.desc}</Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
