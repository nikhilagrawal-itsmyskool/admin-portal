import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Table, TableHead, TableBody, TableRow, TableCell,
  Alert, CircularProgress, TextField, MenuItem, Grid, CardContent, Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

const formatCurrency = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function ShopSetList() {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSession, setFilterSession] = useState('');

  useEffect(() => {
    shopService.getLookups().then(setLookups).catch(() => {});
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterGrade) filters.grade = filterGrade;
      if (filterSession) filters.academicSession = filterSession;
      setSets(await shopService.getSets(filters));
    } catch { setError('Failed to load sets'); }
    finally { setLoading(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Grade Sets</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/shop/sets/new')}>New Set</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={5} sm={3}>
              <TextField fullWidth select label="Grade" value={filterGrade} onChange={e => setFilterGrade(e.target.value)} size="small">
                <MenuItem value="">All Grades</MenuItem>
                {(lookups?.grades || []).map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={5} sm={3}>
              <TextField fullWidth label="Session" value={filterSession} onChange={e => setFilterSession(e.target.value)} size="small" placeholder="e.g. 2026-27" />
            </Grid>
            <Grid item xs={2} sm={2}>
              <Button variant="contained" onClick={load} size="small" fullWidth>Search</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : sets.length === 0 ? (
        <Card><Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No sets found. Create a grade set, or import the school's book-and-stationery list.</Typography></Box></Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Session</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Items</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Set Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Received</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Assigned</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Remaining</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sets.map(s => (
                <TableRow key={s.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/shop/sets/${s.uuid}`)}>
                  <TableCell><Typography fontWeight={600}>{s.grade}</Typography></TableCell>
                  <TableCell>{s.academicSession}</TableCell>
                  <TableCell align="center">{s.itemCount}</TableCell>
                  <TableCell align="right"><Typography fontWeight={600}>{formatCurrency(s.setPrice)}</Typography></TableCell>
                  <TableCell align="center">{s.received}</TableCell>
                  <TableCell align="center">{s.assigned}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={s.remaining}
                      color={s.remaining < 0 ? 'error' : s.remaining === 0 ? 'default' : 'success'}
                      variant={s.remaining > 0 ? 'outlined' : 'filled'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
}
