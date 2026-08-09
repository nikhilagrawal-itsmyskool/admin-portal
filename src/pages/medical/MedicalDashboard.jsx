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
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  Assignment as IssueIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { medicalService } from '../../services/medicalService';
import { fmtDate } from '../../utils/date';

const DAY_OPTIONS = [30, 60, 90];

export default function MedicalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expiryDays, setExpiryDays] = useState(60);
  const [expiringItems, setExpiringItems] = useState([]);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [expiryError, setExpiryError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadExpiringItems(expiryDays);
  }, [expiryDays]);

  const loadExpiringItems = async (days) => {
    setExpiryLoading(true);
    setExpiryError('');
    try {
      const data = await medicalService.getExpiringPurchases(days);
      setExpiringItems(data.items || []);
    } catch (err) {
      setExpiryError('Failed to load expiring items');
    } finally {
      setExpiryLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const items = await medicalService.getItems();
      const lowStock = items.filter((item) => item.currentStock <= item.reorderLevel);
      setStats({
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
      title: 'Total Items',
      value: stats.totalItems,
      icon: InventoryIcon,
      color: '#3366ff',
      path: '/medical/items',
    },
    {
      title: 'Low Stock Alerts',
      value: stats.lowStockItems,
      icon: WarningIcon,
      color: stats.lowStockItems > 0 ? '#ff3d71' : '#00d68f',
      path: '/medical/items',
    },
  ];

  const quickLinks = [
    {
      title: 'Inventory Items',
      description: 'View and manage medical inventory',
      icon: InventoryIcon,
      path: '/medical/items',
    },
    {
      title: 'Purchase Log',
      description: 'Track inventory purchases',
      icon: PurchaseIcon,
      path: '/medical/purchases',
    },
    {
      title: 'Issue Log',
      description: 'Track items issued to staff/students',
      icon: IssueIcon,
      path: '/medical/issues',
    },
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
      <Typography variant="h4" sx={{ mb: 3 }}>
        Medical Module
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card
              sx={{
                borderLeft: `4px solid ${card.color}`,
              }}
            >
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

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6">Expiring Items</Typography>
          {DAY_OPTIONS.map((d) => (
            <Chip
              key={d}
              label={`${d} days`}
              onClick={() => setExpiryDays(d)}
              color={expiryDays === d ? 'primary' : 'default'}
              variant={expiryDays === d ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>
        {expiryError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {expiryError}
          </Alert>
        )}
        <Paper variant="outlined">
          {expiryLoading && <LinearProgress />}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Batch No</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Days Left</TableCell>
                  <TableCell align="right">Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!expiryLoading && expiringItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#8f9bb3', py: 3 }}>
                      No items expiring within {expiryDays} days
                    </TableCell>
                  </TableRow>
                ) : (
                  expiringItems.map((item) => {
                    const urgency =
                      item.daysUntilExpiry <= 14
                        ? 'error.main'
                        : item.daysUntilExpiry <= 30
                          ? 'warning.main'
                          : 'text.primary';
                    return (
                      <TableRow key={item.uuid} hover>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.batchNo || '—'}</TableCell>
                        <TableCell>{fmtDate(item.expiryDate)}</TableCell>
                        <TableCell sx={{ color: urgency, fontWeight: item.daysUntilExpiry <= 30 ? 600 : 400 }}>
                          {item.daysUntilExpiry}
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Quick Links
      </Typography>
      <Grid container spacing={3}>
        {quickLinks.map((link) => (
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
