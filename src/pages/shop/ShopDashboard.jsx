import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea,
  CircularProgress, Alert,
} from '@mui/material';
import {
  MenuBook as BookIcon,
  Inventory as InventoryIcon,
  ShoppingCart as SalesIcon,
  Warning as OutstandingIcon,
  LocalShipping as PurchaseIcon,
  LibraryBooks as SetsIcon,
  Payments as CollectionIcon,
} from '@mui/icons-material';
import shopService from '../../services/shopService';

const formatCurrency = (amount) =>
  `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function ShopDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    shopService.getStats()
      .then(data => setStats(data))
      .catch(() => setError('Failed to load statistics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const statCards = [
    { title: 'Total Items', value: stats?.totalItems || 0, icon: BookIcon, color: '#3366ff', path: '/shop/catalog' },
    { title: 'Stock Value', value: formatCurrency(stats?.totalStockValue), icon: InventoryIcon, color: '#8a5cf5', path: '/shop/catalog' },
    { title: 'Total Collection', value: formatCurrency(stats?.totalCollection), icon: CollectionIcon, color: '#00d68f', path: '/shop/sales' },
    { title: 'Pending Collection', value: formatCurrency(stats?.pendingCollection), icon: OutstandingIcon, color: stats?.pendingCollection > 0 ? '#ff3d71' : '#00d68f', path: '/shop/sales' },
    { title: 'Sales Today', value: formatCurrency(stats?.salesToday), icon: SalesIcon, color: '#ffaa00', path: '/shop/sales' },
    { title: 'Sales This Month', value: formatCurrency(stats?.salesThisMonth), icon: SalesIcon, color: '#00b887', path: '/shop/sales' },
  ];

  const quickLinks = [
    { title: 'Catalog', description: 'Manage books and stationery', icon: BookIcon, path: '/shop/catalog', color: '#3366ff' },
    { title: 'Purchases', description: 'Record stock purchases', icon: PurchaseIcon, path: '/shop/purchases', color: '#00b887' },
    { title: 'Class Sets', description: 'Define booklists per class', icon: SetsIcon, path: '/shop/sets', color: '#ffaa00' },
    { title: 'Sales', description: 'Sell to students', icon: SalesIcon, path: '/shop/sales', color: '#ff3d71' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>School Shop</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card sx={{ borderLeft: `4px solid ${card.color}` }}>
              <CardActionArea onClick={() => navigate(card.path)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#8f9bb3' }}>{card.title}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>{card.value}</Typography>
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
          <Grid item xs={12} sm={6} md={3} key={link.title}>
            <Card>
              <CardActionArea onClick={() => navigate(link.path)}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 2,
                    backgroundColor: `${link.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                  }}>
                    <link.icon sx={{ color: link.color }} />
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
