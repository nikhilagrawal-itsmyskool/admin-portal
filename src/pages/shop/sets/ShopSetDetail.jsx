import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Alert, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Edit as EditIcon, Add as AddIcon,
  LocalShipping as IntakeIcon, PersonAdd as AssignIcon, Delete as DeleteIcon,
  Category as GroupIcon,
} from '@mui/icons-material';
import shopService from '../../../services/shopService';
import { todayIso, fmtDate } from '../../../utils/date';
import BulkAssignDrawer from './BulkAssignDrawer';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0';

function StatCard({ label, value, color }) {
  return (
    <Card sx={{ borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="body2" sx={{ color: '#8f9bb3' }}>{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

// Build ordered display groups from the recipe + highlight publishers.
function buildGroups(items, highlightPublishers) {
  const books = items.filter(i => i.itemType === 'book');
  const stationery = items.filter(i => i.itemType !== 'book');
  const groups = [];
  const hp = (highlightPublishers || []).filter(p =>
    books.some(b => (b.itemPublisher || '').toLowerCase() === p.toLowerCase()));
  if (hp.length) {
    for (const pub of hp) {
      groups.push({ title: pub, lines: books.filter(b => (b.itemPublisher || '').toLowerCase() === pub.toLowerCase()) });
    }
    const rest = books.filter(b => !hp.some(p => p.toLowerCase() === (b.itemPublisher || '').toLowerCase()));
    if (rest.length) groups.push({ title: 'Other Books', lines: rest });
  } else if (books.length) {
    groups.push({ title: 'Books', lines: books });
  }
  if (stationery.length) groups.push({ title: 'Stationery', lines: stationery });
  return groups;
}

function RecipeGroup({ title, lines }) {
  const subtotal = lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
  return (
    <>
      <TableRow sx={{ bgcolor: '#f7f9fc' }}>
        <TableCell colSpan={5} sx={{ fontWeight: 700, color: '#5b6a85' }}>{title}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700, color: '#5b6a85' }}>{formatCurrency(subtotal)}</TableCell>
      </TableRow>
      {lines.map(l => (
        <TableRow key={l.uuid} hover>
          <TableCell>
            {l.itemName}
            {l.itemPublisher ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{l.itemSubject ? `${l.itemSubject} · ` : ''}{l.itemPublisher}</Typography> : null}
          </TableCell>
          <TableCell align="center">{l.quantity}</TableCell>
          <TableCell align="right">{formatCurrency(l.mrp)}</TableCell>
          <TableCell align="right">{l.discountPct ? `${l.discountPct}%` : '—'}</TableCell>
          <TableCell align="right">{formatCurrency(l.unitPrice)}</TableCell>
          <TableCell align="right"><Typography fontWeight={600}>{formatCurrency(l.lineTotal)}</Typography></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function ShopSetDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [set, setSet] = useState(null);
  const [stock, setStock] = useState(null);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeForm, setIntakeForm] = useState({ qtySets: '', intakeDate: todayIso(), supplier: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupPicked, setGroupPicked] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, st, ins] = await Promise.all([
        shopService.getSetById(id),
        shopService.getSetStock(id),
        shopService.getIntakes({ setId: id }),
      ]);
      setSet(s); setStock(st); setIntakes(ins);
    } catch { setError('Failed to load set'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const bookPublishers = useMemo(() => set
    ? [...new Set(set.items.filter(i => i.itemType === 'book' && i.itemPublisher).map(i => i.itemPublisher))].sort()
    : [], [set]);

  const submitIntake = async () => {
    if (!intakeForm.qtySets || parseInt(intakeForm.qtySets, 10) < 1) { setError('Quantity of sets is required'); return; }
    setSaving(true);
    try {
      await shopService.createIntake({
        setId: id,
        qtySets: parseInt(intakeForm.qtySets, 10),
        intakeDate: intakeForm.intakeDate,
        supplier: intakeForm.supplier || undefined,
        notes: intakeForm.notes || undefined,
      });
      setIntakeOpen(false);
      setIntakeForm({ qtySets: '', intakeDate: todayIso(), supplier: '', notes: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to record intake');
    } finally { setSaving(false); }
  };

  const removeIntake = async (intakeId) => {
    try { await shopService.deleteIntake(intakeId); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete intake'); }
  };

  const openGrouping = () => { setGroupPicked(set.highlightPublishers || []); setGroupOpen(true); };
  const saveGrouping = async () => {
    setSaving(true);
    try {
      await shopService.updateSet(id, { highlightPublishers: groupPicked });
      setGroupOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save grouping');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!set) return <Alert severity="error">{error || 'Set not found'}</Alert>;

  const groups = buildGroups(set.items, set.highlightPublishers);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/shop/sets')}><BackIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h4">Grade {set.grade} Set</Typography>
          <Typography variant="body2" color="text.secondary">{set.academicSession} · {set.items.length} items · {formatCurrency(set.setPrice)}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AssignIcon />} onClick={() => setDrawerOpen(true)}>Assign to students</Button>
        <Button variant="outlined" onClick={() => navigate(`/shop/assign?setId=${id}`)}>One student…</Button>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/shop/sets/${id}/edit`)}>Edit</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice('')}>{notice}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}><StatCard label="Sets received" value={stock?.received ?? 0} color="#3366ff" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="Assigned" value={stock?.assigned ?? 0} color="#ffaa00" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="Remaining" value={stock?.remaining ?? 0} color={(stock?.remaining ?? 0) < 0 ? '#ff3d71' : '#00d68f'} /></Grid>
      </Grid>

      {/* Intake */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6"><IntakeIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#3366ff' }} fontSize="small" />Sets received</Typography>
            <Button startIcon={<AddIcon />} onClick={() => setIntakeOpen(true)}>Receive sets</Button>
          </Box>
          {intakes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No intakes yet. Record when sets arrive from the vendor.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Sets</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                  <TableCell width={40} />
                </TableRow>
              </TableHead>
              <TableBody>
                {intakes.map(it => (
                  <TableRow key={it.uuid}>
                    <TableCell>{fmtDate(it.intakeDate)}</TableCell>
                    <TableCell align="center">{it.qtySets}</TableCell>
                    <TableCell>{it.supplier || '—'}</TableCell>
                    <TableCell>{it.notes || '—'}</TableCell>
                    <TableCell><IconButton size="small" color="error" onClick={() => removeIntake(it.uuid)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Loose box */}
      {stock?.loose?.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Loose box <Typography component="span" variant="body2" color="text.secondary">— items declined at assignment</Typography></Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {stock.loose.map(l => (
                <Chip key={l.itemId} label={`${l.itemName} × ${l.qty}`} variant="outlined" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Recipe */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">What's in the set</Typography>
            <Button size="small" startIcon={<GroupIcon />} onClick={openGrouping} disabled={bookPublishers.length === 0}>
              {set.highlightPublishers?.length ? `Grouped: ${set.highlightPublishers.join(', ')}` : 'Group by publisher'}
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 240 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 60 }} align="center">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 90 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 70 }} align="right">Disc.</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 90 }} align="right">Unit</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map(g => <RecipeGroup key={g.title} title={g.title} lines={g.lines} />)}
              <TableRow>
                <TableCell colSpan={5} align="right"><Typography variant="subtitle1" fontWeight={700}>Set price</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle1" fontWeight={800}>{formatCurrency(set.setPrice)}</Typography></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receive sets dialog */}
      <Dialog open={intakeOpen} onClose={() => setIntakeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Receive sets — Grade {set.grade}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Number of sets" type="number" value={intakeForm.qtySets}
                onChange={e => setIntakeForm(p => ({ ...p, qtySets: e.target.value }))} size="small" inputProps={{ min: 1 }} autoFocus />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Date" type="date" value={intakeForm.intakeDate}
                onChange={e => setIntakeForm(p => ({ ...p, intakeDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Supplier (optional)" value={intakeForm.supplier}
                onChange={e => setIntakeForm(p => ({ ...p, supplier: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes (optional)" value={intakeForm.notes}
                onChange={e => setIntakeForm(p => ({ ...p, notes: e.target.value }))} size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntakeOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitIntake} disabled={saving}>{saving ? 'Saving...' : 'Record'}</Button>
        </DialogActions>
      </Dialog>

      {/* Grouping dialog */}
      <Dialog open={groupOpen} onClose={() => setGroupOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Group books by publisher</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Tick the publishers to break out into their own subtotal (e.g. NCERT). Everything else lumps into “Other Books”.
          </Typography>
          <FormGroup>
            {bookPublishers.map(pub => (
              <FormControlLabel key={pub}
                control={<Checkbox checked={groupPicked.includes(pub)}
                  onChange={e => setGroupPicked(prev => e.target.checked ? [...prev, pub] : prev.filter(x => x !== pub))} />}
                label={pub} />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupPicked([])}>Clear</Button>
          <Button onClick={() => setGroupOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveGrouping} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>

      <BulkAssignDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} set={set}
        onDone={(res) => { setNotice(`Assigned to ${res.assigned} student(s)${res.skipped ? `, ${res.skipped} already had it` : ''}.`); load(); }} />
    </Box>
  );
}
