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
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from '@mui/material';
import {
  Science as ScienceIcon,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  Assignment as IssueIcon,
  BrokenImage as BrokenImageIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { sportsService } from '../../services/sportsService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const DAY_OPTIONS = [30, 60, 90];

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleDateString('en-GB');
};

export default function SportDashboard() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.SPORTS_MANAGE);
  const [stats, setStats] = useState({
    totalSports: 0,
    totalItems: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [typesData, items] = await Promise.all([
        sportsService.getSportTypes(),
        sportsService.getItems(),
      ]);
      const lowStock = items.filter((item) => item.currentStock <= item.reorderLevel);
      setStats({
        totalSports: (typesData.sportTypes || []).length,
        totalItems: items.length,
        lowStockItems: lowStock.length,
      });
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Sports',
      value: stats.totalSports,
      icon: ScienceIcon,
      color: '#3366ff',
      path: '/sports/incharges',
    },
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: InventoryIcon,
      color: '#00d68f',
      path: '/sports/items',
    },
    {
      title: 'Low Stock Alerts',
      value: stats.lowStockItems,
      icon: WarningIcon,
      color: stats.lowStockItems > 0 ? '#ff3d71' : '#00d68f',
      path: '/sports/items',
    },
  ];

  const quickLinks = [
    {
      title: 'In-charges',
      description: 'Assign staff responsible for each sport',
      icon: ScienceIcon,
      path: '/sports/incharges',
    },
    {
      title: 'Inventory Items',
      description: 'View and manage sport inventory',
      icon: InventoryIcon,
      path: '/sports/items',
    },
    {
      title: 'Purchase Log',
      description: 'Track inventory purchases',
      icon: PurchaseIcon,
      path: '/sports/purchases',
    },
    {
      title: 'Issue Log',
      description: 'Track items issued from sports',
      icon: IssueIcon,
      path: '/sports/issues',
    },
    {
      title: 'Breakage Log',
      description: 'Track breakages and damages',
      icon: BrokenImageIcon,
      path: '/sports/breakages',
    },
  ];

  // In-charge assignment is a manage-only page — hide its entry points from view-only users.
  const visibleCards = cards.filter((c) => canManage || c.path !== '/sports/incharges');
  const visibleQuickLinks = quickLinks.filter((l) => canManage || l.path !== '/sports/incharges');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Sports Module
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {visibleCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card sx={{ borderLeft: `4px solid ${card.color}` }}>
              <CardActionArea onClick={() => navigate(card.path)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                        {card.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
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

      <Typography variant="h6" sx={{ mb: 2 }}>
        Quick Links
      </Typography>
      <Grid container spacing={3}>
        {visibleQuickLinks.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.title}>
            <Card>
              <CardActionArea onClick={() => navigate(link.path)}>
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
                    <link.icon sx={{ color: '#3366ff' }} />
                  </Box>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {link.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                    {link.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
