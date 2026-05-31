import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Alert, CircularProgress, TextField, MenuItem, Grid, CardContent,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';

export default function ShopSetList() {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    shopService.getLookups().then(setLookups).catch(() => {});
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterClass) filters.classNo = filterClass;
      if (filterSession) filters.academicSession = filterSession;
      setSets(await shopService.getSets(filters));
    } catch { setError('Failed to load sets'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await shopService.deleteSet(deleteTarget.uuid);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete');
      setDeleteTarget(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Class Sets</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/shop/sets/new')}>New Set</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={5} sm={3}>
              <TextField fullWidth select label="Class No" value={filterClass} onChange={e => setFilterClass(e.target.value)} size="small">
                <MenuItem value="">All Classes</MenuItem>
                {(lookups?.classNos || []).map(n => <MenuItem key={n} value={n}>Class {n}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={5} sm={3}>
              <TextField fullWidth label="Session" value={filterSession} onChange={e => setFilterSession(e.target.value)} size="small" placeholder="e.g. 2025-26" />
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
        <Card><Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No sets found. Create a class set to group books for a session.</Typography></Box></Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Class</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Session</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {sets.map(s => (
                <TableRow key={s.uuid} hover>
                  <TableCell>{s.name}</TableCell>
                  <TableCell align="center">{s.classNo}</TableCell>
                  <TableCell>{s.academicSession}</TableCell>
                  <TableCell>{s.description || '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => navigate(`/shop/sets/${s.uuid}/edit`)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(s)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {deleteTarget && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <Card sx={{ p: 3, maxWidth: 400 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Delete Set?</Typography>
            <Typography sx={{ mb: 2 }}>Delete <strong>{deleteTarget?.name}</strong>?</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
}
