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
} from '@mui/material';
import {
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  Assignment as IssueIcon,
  DeleteSweep as WastageIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { suppliesService } from '../../services/suppliesService';

export default function SuppliesDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalCategories: 0, totalItems: 0, lowStockItems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [catData, items] = await Promise.all([
        suppliesService.getCategories(),
        suppliesService.getItems(),
      ]);
      const lowStock = items.filter((i) => i.reorderLevel > 0 && i.currentStock <= i.reorderLevel);
      setStats({
        totalCategories: (catData.categories || []).length,
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
    { title: 'Categories', value: stats.totalCategories, icon: CategoryIcon, color: '#3366ff', path: '/supplies/categories' },
    { title: 'Total Items', value: stats.totalItems, icon: InventoryIcon, color: '#00d68f', path: '/supplies/items' },
    { title: 'Low Stock Alerts', value: stats.lowStockItems, icon: WarningIcon, color: stats.lowStockItems > 0 ? '#ff3d71' : '#00d68f', path: '/supplies/items?lowStock=true' },
  ];

  const quickLinks = [
    { title: 'Categories', description: 'Manage supply categories', icon: CategoryIcon, path: '/supplies/categories' },
    { title: 'Inventory Items', description: 'View and manage supply inventory', icon: InventoryIcon, path: '/supplies/items' },
    { title: 'Purchase Log', description: 'Record bills and stock purchases', icon: PurchaseIcon, path: '/supplies/purchases' },
    { title: 'Issue Log', description: 'Track items issued out', icon: IssueIcon, path: '/supplies/issues' },
    { title: 'Wastage Log', description: 'Track spoiled, expired, lost or damaged stock', icon: WastageIcon, path: '/supplies/wastages' },
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
      <Typography variant="h4" sx={{ mb: 3 }}>Supplies Module</Typography>

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
