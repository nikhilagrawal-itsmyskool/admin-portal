import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, CircularProgress, Alert,
} from '@mui/material';
import {
  PinDrop as StopIcon,
  AirportShuttle as VehicleIcon,
  AltRoute as RouteIcon,
  AssignmentInd as AssignmentIcon,
  EditCalendar as MarkIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { transportService } from '../../services/transportService';

export default function TransportDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ stops: 0, vehicles: 0, routes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [stops, vehicles, routes] = await Promise.all([
          transportService.getStops(),
          transportService.getVehicles(),
          transportService.getRoutes(),
        ]);
        setStats({
          stops: (stops || []).length,
          vehicles: (vehicles || []).length,
          routes: (routes || []).length,
        });
      } catch {
        setError('Failed to load transport statistics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { title: 'Stops', value: stats.stops, icon: StopIcon, color: '#3366ff', path: '/transport/stops' },
    { title: 'Vehicles', value: stats.vehicles, icon: VehicleIcon, color: '#00d68f', path: '/transport/vehicles' },
    { title: 'Routes', value: stats.routes, icon: RouteIcon, color: '#ff9f43', path: '/transport/routes' },
  ];

  const quickLinks = [
    { title: 'Stops', description: 'Maintain the stop master (grid bulk entry, km)', icon: StopIcon, path: '/transport/stops' },
    { title: 'Vehicles', description: 'Buses & vans, drivers and conductors', icon: VehicleIcon, path: '/transport/vehicles' },
    { title: 'Routes', description: 'Morning/evening routes with ordered stops & staff', icon: RouteIcon, path: '/transport/routes' },
    { title: 'Student Assignments', description: 'Assign students to a route & stop', icon: AssignmentIcon, path: '/transport/assignments' },
    { title: 'Take Attendance', description: 'Mark who boarded on a route', icon: MarkIcon, path: '/transport/attendance/mark' },
    { title: 'Attendance History', description: 'Review past bus attendance sessions', icon: HistoryIcon, path: '/transport/attendance/sessions' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Transport Module</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
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
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, backgroundColor: '#fff4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <link.icon sx={{ color: '#ff6f00' }} />
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
