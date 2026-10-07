import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Card, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
  Alert, CircularProgress, Menu, MenuItem, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { clubService } from '../../services/clubService';

const DECISIONS = [
  { key: 'keep', label: 'Keep as is' }, { key: 'revise', label: 'Create revision' },
  { key: 'suspend', label: 'Suspend' }, { key: 'archive', label: 'Archive' },
];

export default function ReviewQueue() {
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [menu, setMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setRows(await clubService.listReviews(status)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, decision) => {
    setMenu(null); setErr(''); setMsg('');
    try { await clubService.decideReview(id, decision); setMsg(`Review ${decision}.`); load(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed'); }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Review Queue</Typography>
        <ToggleButtonGroup size="small" exclusive value={status} onChange={(_e, v) => v && setStatus(v)}>
          <ToggleButton value="open">Open</ToggleButton>
          <ToggleButton value="closed">Closed</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : (
        <Card variant="outlined"><Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Activity</TableCell><TableCell>Signal</TableCell><TableCell>Source</TableCell><TableCell>Raised</TableCell><TableCell>Status / decision</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.uuid} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title || r.activityCode}</Typography><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.activityCode}</Typography></TableCell>
                  <TableCell><Chip size="small" color={r.signal === 'safety' ? 'error' : 'default'} label={r.signal} /></TableCell>
                  <TableCell>{r.source}</TableCell>
                  <TableCell>{r.raisedAt ? String(r.raisedAt).slice(0, 10) : '—'}</TableCell>
                  <TableCell>{r.status === 'open' ? <Chip size="small" color="warning" label="open" /> : <Chip size="small" label={r.decision || 'closed'} />}</TableCell>
                  <TableCell align="right">{r.status === 'open' && <Button size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, id: r.uuid })}>Decide ▾</Button>}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Nothing here — routine activities don't need review.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box></Card>
      )}
      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {DECISIONS.map((d) => <MenuItem key={d.key} onClick={() => decide(menu.id, d.key)}>{d.label}</MenuItem>)}
      </Menu>
    </Box>
  );
}
