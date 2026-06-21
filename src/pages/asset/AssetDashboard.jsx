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
  AccountTree as TreeIcon,
  Category as TypeIcon,
  Inventory2 as AssetIcon,
  QrCode2 as CodeIcon,
  Tag as CountsIcon,
} from '@mui/icons-material';
import { assetService } from '../../services/assetService';

export default function AssetDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalAssets: 0, totalTypes: 0, taggedItems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [assets, types] = await Promise.all([
        assetService.getAssets(),
        assetService.listTypes(),
      ]);
      setStats({
        totalAssets: assets.length,
        totalTypes: types.length,
        taggedItems: assets.filter((a) => a.assetCode).length,
      });
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Asset Records', value: stats.totalAssets, icon: AssetIcon, color: '#3366ff', path: '/asset/tree' },
    { title: 'Asset Types', value: stats.totalTypes, icon: TypeIcon, color: '#00d68f', path: '/asset/types' },
    { title: 'Tagged Items', value: stats.taggedItems, icon: CodeIcon, color: '#ffaa00', path: '/asset/tree' },
  ];

  const quickLinks = [
    { title: 'Asset Register', description: 'Browse the asset tree, move, tag & assign responsibility', icon: TreeIcon, path: '/asset/tree' },
    { title: 'Counts', description: 'Totals by type and where each unit sits', icon: CountsIcon, path: '/asset/counts' },
    { title: 'Asset Types', description: 'Manage the per-school list of asset types', icon: TypeIcon, path: '/asset/types' },
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
      <Typography variant="h4" sx={{ mb: 3 }}>Asset Module</Typography>

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
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: 2, backgroundColor: '#f0f3ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                    }}
                  >
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
