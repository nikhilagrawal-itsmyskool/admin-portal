import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert, Stack, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Divider,
} from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { assemblyService } from '../../services/assemblyService';

const iso = (d) => d.toISOString().slice(0, 10);
const firstOfMonth = () => { const d = new Date(); return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))); };
const lastOfMonth = () => { const d = new Date(); return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0))); };

export default function LeaderboardPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true); setError('');
    try { setBoard(await assemblyService.getLeaderboard(from, to)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to load leaderboard'); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const standings = board?.standings || [];
  const chartData = standings.filter((s) => s.houseId).map((s) => ({ name: s.houseName || 'House', average: s.average }));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>House-of-the-Month Leaderboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} /></Grid>
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><Button variant="outlined" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button></Grid>
          </Grid>
        </CardContent>
      </Card>

      {board?.houseOfTheMonth && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <TrophyIcon sx={{ fontSize: 48 }} />
              <Box>
                <Typography variant="overline">House of the Month</Typography>
                <Typography variant="h4">{board.houseOfTheMonth.houseName || 'House'}</Typography>
                <Typography variant="body2">Average score {board.houseOfTheMonth.average}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>House averages</Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Standings</Typography>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>#</TableCell><TableCell>House</TableCell><TableCell align="center">Weeks</TableCell><TableCell align="center">Average</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {standings.map((s, i) => (
                <TableRow key={s.houseId || 'none'}>
                  <TableCell>{s.houseId ? i + 1 : '—'}</TableCell>
                  <TableCell>{s.houseName || <em style={{ color: '#999' }}>No house</em>}</TableCell>
                  <TableCell align="center">{s.weekCount}</TableCell>
                  <TableCell align="center"><Chip size="small" color={i === 0 && s.houseId ? 'primary' : 'default'} label={s.average} /></TableCell>
                </TableRow>
              ))}
              {standings.length === 0 && <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No graded assemblies in this range.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
          {standings.some((s) => s.weeks?.length) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">Week-by-week averages feed each house's overall score.</Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
