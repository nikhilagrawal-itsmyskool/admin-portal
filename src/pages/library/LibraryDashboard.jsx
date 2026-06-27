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
  MenuBook as BookIcon,
  Inventory as CopiesIcon,
  CheckCircle as AvailableIcon,
  SwapHoriz as IssuedIcon,
  Gavel as FineIcon,
  LibraryAdd as CatalogIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { libraryService } from '../../services/libraryService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

export default function LibraryDashboard() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.LIBRARY_MANAGE);
  const [stats, setStats] = useState({ works: 0, copies: 0, available: 0, issued: 0, pendingFines: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [worksData, circ, fines] = await Promise.all([
        libraryService.searchWorks({ limit: 200 }),
        libraryService.listCirculation({ status: 'issued' }),
        libraryService.listFines({ status: 'pending' }),
      ]);
      const works = worksData.works || [];
      const copies = works.reduce((s, w) => s + Number(w.totalCopies || 0), 0);
      const available = works.reduce((s, w) => s + Number(w.availableCopies || 0), 0);
      setStats({
        works: works.length,
        copies,
        available,
        issued: (circ.circulations || []).length,
        pendingFines: (fines.fines || []).length,
      });
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Titles (Works)', value: stats.works, icon: BookIcon, color: '#3366ff', path: '/library/catalog' },
    { title: 'Total Copies', value: stats.copies, icon: CopiesIcon, color: '#00d68f', path: '/library/catalog' },
    { title: 'Available', value: stats.available, icon: AvailableIcon, color: '#00d68f', path: '/library/catalog' },
    { title: 'Issued', value: stats.issued, icon: IssuedIcon, color: '#ffaa00', path: '/library/circulation' },
    { title: 'Pending Fines', value: stats.pendingFines, icon: FineIcon, color: stats.pendingFines > 0 ? '#ff3d71' : '#00d68f', path: '/library/fines' },
  ];

  const quickLinks = [
    canManage && { title: 'Catalog a Book', description: 'Add a work, edition and copies in one go', icon: CatalogIcon, path: '/library/catalog/new' },
    { title: 'Search Catalog', description: 'Find works, editions and copies', icon: SearchIcon, path: '/library/catalog' },
    { title: 'Circulation', description: 'Issue, return and renew books', icon: IssuedIcon, path: '/library/circulation' },
    { title: 'Fines', description: 'Collect or waive overdue/lost fines', icon: FineIcon, path: '/library/fines' },
    { title: 'Settings', description: 'Lookups, colors, locations and loan policy', icon: SettingsIcon, path: '/library/settings' },
  ].filter(Boolean);

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
        Library Module
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={2.4} key={card.title}>
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
