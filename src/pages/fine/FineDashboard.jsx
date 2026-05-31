import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as CollectedIcon,
  Warning as OutstandingIcon,
  ReportProblem as IncidentIcon,
} from '@mui/icons-material';
import { fineService } from '../../services/fineService';

const STATUS_COLORS = {
  open: '#ff3d71',
  under_review: '#ffaa00',
  decision_made: '#3366ff',
  closed: '#00d68f',
};

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  decision_made: 'Decision Made',
  closed: 'Closed',
};

const formatCurrency = (amount) =>
  `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function FineDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await fineService.getStats();
      setStats(data);
    } catch {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const inProgress = (stats?.byStatus?.open || 0) + (stats?.byStatus?.under_review || 0);
  const outstandingColor = stats?.totalOutstandingAmount > 0 ? '#ff3d71' : '#00d68f';

  const cards = [
    {
      title: 'Total Incidents',
      value: stats?.totalIncidents || 0,
      icon: IncidentIcon,
      color: '#3366ff',
      path: '/fine/incidents',
    },
    {
      title: 'Open / In Progress',
      value: inProgress,
      icon: PendingIcon,
      color: inProgress > 0 ? '#ffaa00' : '#00d68f',
      path: '/fine/incidents?status=open,under_review',
    },
    {
      title: 'Fine Collected',
      value: formatCurrency(stats?.totalCollectedAmount),
      icon: CollectedIcon,
      color: '#00d68f',
      path: '/fine/incidents?status=closed',
    },
    {
      title: 'Fine Outstanding',
      value: formatCurrency(stats?.totalOutstandingAmount),
      icon: OutstandingIcon,
      color: outstandingColor,
      path: '/fine/incidents?status=decision_made',
    },
  ];

  const totalForBar = stats?.totalIncidents || 0;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Fine Collection Module
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card sx={{ borderLeft: `4px solid ${card.color}` }}>
              <CardActionArea onClick={() => navigate(card.path)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                        {card.title}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {card.value}
                      </Typography>
                    </Box>
                    <card.icon sx={{ fontSize: 40, color: card.color, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Status breakdown bar */}
      {totalForBar > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Incidents by Status
            </Typography>
            <Box sx={{ display: 'flex', height: 32, borderRadius: 1, overflow: 'hidden', mb: 1.5 }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => {
                const count = stats?.byStatus?.[status] || 0;
                if (count === 0) return null;
                const pct = (count / totalForBar) * 100;
                return (
                  <Tooltip key={status} title={`${STATUS_LABELS[status]}: ${count}`}>
                    <Box
                      sx={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        transition: 'width 0.3s ease',
                        cursor: 'default',
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
                    {STATUS_LABELS[status]} ({stats?.byStatus?.[status] || 0})
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Quick Links
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardActionArea onClick={() => navigate('/fine/incidents')}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: '#f0f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <GavelIcon sx={{ color: '#3366ff' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Incidents
                </Typography>
                <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                  Report, track and resolve fine incidents
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
