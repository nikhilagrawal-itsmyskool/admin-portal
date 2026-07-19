import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip,
  CircularProgress, Divider, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, ArrowUpward as UpIcon, ArrowDownward as DownIcon,
  Delete as DeleteIcon, Add as AddIcon, PlaylistAdd as BulkIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCan } from '../../permissions/can';

const EMPTY_ENTRY = { month: '', entryType: 'topic', topicNo: '', title: '', theme: '', pageRef: '', term: '' };

// Pull a leading "T-1." / "T1 " topic number off a title, returning { topicNo, title }.
function splitTopicNo(raw) {
  const m = (raw || '').match(/^\s*(T-?\s?\d+)\.?\s*(.*)$/i);
  if (m) return { topicNo: m[1].replace(/\s+/g, '').toUpperCase(), title: m[2].trim() };
  return { topicNo: '', title: (raw || '').trim() };
}

export default function SyllabusBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const can = useCan();
  const canManage = can('syllabus.manage');

  const [plan, setPlan] = useState(null);
  const [entries, setEntries] = useState([]);
  const [lookups, setLookups] = useState({ months: [], entryTypes: [], terms: [], layouts: [] });
  const [header, setHeader] = useState({ book: '', layout: 'junior', note: '' });

  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newEntry, setNewEntry] = useState(EMPTY_ENTRY);
  const [adding, setAdding] = useState(false);
  const [editDialog, setEditDialog] = useState(null); // entry being edited
  const [bulkDialog, setBulkDialog] = useState(null); // { text, mode }
  const [bulkSaving, setBulkSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const monthLabel = useMemo(() => {
    const map = {};
    (lookups.months || []).forEach((m) => { map[m.value] = m.label; });
    return map;
  }, [lookups.months]);
  const monthValues = useMemo(() => (lookups.months || []).map((m) => m.value), [lookups.months]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [p, lk] = await Promise.all([
        syllabusService.getSyllabus(id),
        syllabusService.getLookups(),
      ]);
      setPlan(p);
      setEntries(p.entries || []);
      setHeader({ book: p.book || '', layout: p.layout || 'junior', note: p.note || '' });
      setLookups(lk || { months: [], entryTypes: [], terms: [], layouts: [] });
    } catch {
      setError('Failed to load the syllabus plan');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const saveHeader = async () => {
    setSavingHeader(true); setError(''); setSuccess('');
    try {
      await syllabusService.updateSyllabus(id, {
        book: header.book.trim() || null, layout: header.layout, note: header.note.trim() || null,
      });
      setSuccess('Plan details saved');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save plan details');
    } finally {
      setSavingHeader(false);
    }
  };

  const addEntry = async () => {
    if (!newEntry.month || !newEntry.title.trim()) { setError('Month and title are required'); return; }
    setAdding(true); setError('');
    try {
      const created = await syllabusService.addEntry(id, {
        month: newEntry.month,
        entryType: newEntry.entryType || 'topic',
        topicNo: newEntry.topicNo.trim() || undefined,
        title: newEntry.title.trim(),
        theme: newEntry.theme.trim() || undefined,
        pageRef: newEntry.pageRef.trim() || undefined,
        term: newEntry.term || undefined,
      });
      setEntries((prev) => [...prev, created]);
      setNewEntry({ ...EMPTY_ENTRY, month: newEntry.month, entryType: newEntry.entryType });
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add entry');
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async () => {
    setError('');
    try {
      const updated = await syllabusService.updateEntry(editDialog.uuid, {
        month: editDialog.month,
        entryType: editDialog.entryType,
        topicNo: editDialog.topicNo?.trim() || null,
        title: editDialog.title.trim(),
        theme: editDialog.theme?.trim() || null,
        pageRef: editDialog.pageRef?.trim() || null,
        term: editDialog.term || null,
      });
      setEntries((prev) => prev.map((e) => (e.uuid === updated.uuid ? updated : e)));
      setEditDialog(null);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save entry');
    }
  };

  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    const order = entries.map((e) => e.uuid);
    [order[index], order[target]] = [order[target], order[index]];
    setError('');
    try {
      const result = await syllabusService.reorderEntries(id, order);
      setEntries(result || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to reorder');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await syllabusService.deleteEntry(deleteDialog.item.uuid);
      setEntries((prev) => prev.filter((e) => e.uuid !== deleteDialog.item.uuid));
      setDeleteDialog({ open: false, item: null });
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete entry');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  // Parse pasted rows: TAB- (or comma-) separated "month, title, theme, pageRef".
  // A leading "T-1." in the title becomes topicNo. Returns { entries, skipped }.
  const parseBulk = (text) => {
    const out = [];
    let skipped = 0;
    for (const line of (text || '').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cells = (trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(',')).map((c) => c.trim());
      const month = (cells[0] || '').toLowerCase();
      if (!monthValues.includes(month) || !cells[1]) { skipped += 1; continue; }
      const { topicNo, title } = splitTopicNo(cells[1]);
      if (!title) { skipped += 1; continue; }
      out.push({ month, entryType: 'topic', topicNo: topicNo || undefined, title, theme: cells[2] || undefined, pageRef: cells[3] || undefined });
    }
    return { entries: out, skipped };
  };

  const bulkPreview = useMemo(() => (bulkDialog ? parseBulk(bulkDialog.text) : { entries: [], skipped: 0 }), [bulkDialog, monthValues]);

  const submitBulk = async () => {
    if (bulkPreview.entries.length === 0) { setError('No valid rows to import'); return; }
    setBulkSaving(true); setError('');
    try {
      const result = await syllabusService.bulkEntries(id, { mode: bulkDialog.mode, entries: bulkPreview.entries });
      setEntries(result || []);
      setBulkDialog(null);
      setSuccess(`Imported ${bulkPreview.entries.length} entr${bulkPreview.entries.length === 1 ? 'y' : 'ies'}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to import entries');
    } finally {
      setBulkSaving(false);
    }
  };

  const typeChipColor = (t) => (t === 'topic' ? 'default' : t === 'exam' ? 'error' : t === 'revision' ? 'warning' : t === 'section' ? 'primary' : 'info');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!plan) return <Alert severity="error">Plan not found. <Button onClick={() => navigate('/syllabus')}>Back to plans</Button></Alert>;

  const entryTypes = lookups.entryTypes.length ? lookups.entryTypes : [{ value: 'topic', label: 'Topic' }];
  const terms = lookups.terms || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/syllabus')}>Back</Button>
        <Typography variant="h4">{plan.grade} — {plan.subjectName || 'Syllabus'}</Typography>
        <Chip size="small" variant="outlined" label={header.layout === 'senior' ? 'Senior' : 'Junior'} />
        <Chip size="small" variant="outlined" label={`${entries.length} entries`} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Plan header details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Book (optional)" value={header.book}
                onChange={(e) => setHeader({ ...header, book: e.target.value })} disabled={!canManage} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="Layout" value={header.layout}
                onChange={(e) => setHeader({ ...header, layout: e.target.value })} disabled={!canManage}>
                {(lookups.layouts.length ? lookups.layouts : [{ value: 'junior', label: 'Junior' }, { value: 'senior', label: 'Senior' }])
                  .map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth multiline minRows={1} size="small" label="Footer note" value={header.note}
                onChange={(e) => setHeader({ ...header, note: e.target.value })} disabled={!canManage} />
            </Grid>
            {canManage && (
              <Grid item xs={12}>
                <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveHeader} disabled={savingHeader}>
                  {savingHeader ? 'Saving...' : 'Save details'}
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">Entries (teaching order)</Typography>
            {canManage && (
              <Button variant="outlined" startIcon={<BulkIcon />} onClick={() => setBulkDialog({ text: '', mode: 'append' })}>
                Bulk paste
              </Button>
            )}
          </Box>

          {canManage && (
            <>
              <Grid container spacing={1} sx={{ mb: 2 }} alignItems="center">
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth select size="small" label="Month" value={newEntry.month}
                    onChange={(e) => setNewEntry({ ...newEntry, month: e.target.value })}>
                    {(lookups.months || []).map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth select size="small" label="Type" value={newEntry.entryType}
                    onChange={(e) => setNewEntry({ ...newEntry, entryType: e.target.value })}>
                    {entryTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={4} sm={1}>
                  <TextField fullWidth size="small" label="No." value={newEntry.topicNo}
                    onChange={(e) => setNewEntry({ ...newEntry, topicNo: e.target.value })} />
                </Grid>
                <Grid item xs={8} sm={3}>
                  <TextField fullWidth size="small" label="Title" value={newEntry.title}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') addEntry(); }} />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField fullWidth size="small" label="Theme" value={newEntry.theme}
                    onChange={(e) => setNewEntry({ ...newEntry, theme: e.target.value })} />
                </Grid>
                <Grid item xs={4} sm={1}>
                  <TextField fullWidth size="small" label="Pages" value={newEntry.pageRef}
                    onChange={(e) => setNewEntry({ ...newEntry, pageRef: e.target.value })} />
                </Grid>
                <Grid item xs={2} sm={1}>
                  <Button fullWidth variant="contained" onClick={addEntry} disabled={adding} sx={{ minWidth: 0 }}><AddIcon /></Button>
                </Grid>
              </Grid>
              <Divider sx={{ mb: 1 }} />
            </>
          )}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }}>#</TableCell>
                  <TableCell sx={{ width: 110 }}>Month</TableCell>
                  <TableCell sx={{ width: 100 }}>Type</TableCell>
                  <TableCell sx={{ width: 60 }}>No.</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Theme</TableCell>
                  <TableCell sx={{ width: 80 }}>Pages</TableCell>
                  <TableCell sx={{ width: 90 }}>Term</TableCell>
                  {canManage && <TableCell sx={{ width: 150 }} align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow><TableCell colSpan={canManage ? 9 : 8} align="center" sx={{ py: 3 }}>No entries yet. Add rows above or use “Bulk paste”.</TableCell></TableRow>
                ) : entries.map((e, i) => (
                  <TableRow key={e.uuid} hover>
                    <TableCell>{e.seq}</TableCell>
                    <TableCell>{monthLabel[e.month] || e.month}</TableCell>
                    <TableCell><Chip size="small" variant="outlined" color={typeChipColor(e.entryType)} label={e.entryType} /></TableCell>
                    <TableCell>{e.topicNo || '-'}</TableCell>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>{e.theme || '-'}</TableCell>
                    <TableCell>{e.pageRef || '-'}</TableCell>
                    <TableCell>{e.term === 'half_yearly' ? 'Half-yr' : e.term === 'annual' ? 'Annual' : '-'}</TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Tooltip title="Move up"><span><IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0}><UpIcon fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Move down"><span><IconButton size="small" onClick={() => move(i, 1)} disabled={i === entries.length - 1}><DownIcon fontSize="small" /></IconButton></span></Tooltip>
                        <IconButton size="small" title="Edit" onClick={() => setEditDialog({ ...e })}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: e })}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {/* Edit entry dialog */}
      <Dialog open={Boolean(editDialog)} onClose={() => setEditDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <TextField fullWidth select size="small" label="Month" value={editDialog?.month || ''}
                onChange={(e) => setEditDialog({ ...editDialog, month: e.target.value })}>
                {(lookups.months || []).map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select size="small" label="Type" value={editDialog?.entryType || 'topic'}
                onChange={(e) => setEditDialog({ ...editDialog, entryType: e.target.value })}>
                {entryTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="No." value={editDialog?.topicNo || ''}
                onChange={(e) => setEditDialog({ ...editDialog, topicNo: e.target.value })} />
            </Grid>
            <Grid item xs={8}>
              <TextField fullWidth size="small" label="Title" value={editDialog?.title || ''}
                onChange={(e) => setEditDialog({ ...editDialog, title: e.target.value })} />
            </Grid>
            <Grid item xs={8}>
              <TextField fullWidth size="small" label="Theme" value={editDialog?.theme || ''}
                onChange={(e) => setEditDialog({ ...editDialog, theme: e.target.value })} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Pages" value={editDialog?.pageRef || ''}
                onChange={(e) => setEditDialog({ ...editDialog, pageRef: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select size="small" label="Term" value={editDialog?.term || ''}
                onChange={(e) => setEditDialog({ ...editDialog, term: e.target.value })}>
                <MenuItem value="">(none)</MenuItem>
                {terms.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={!editDialog?.title?.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk paste dialog */}
      <Dialog open={Boolean(bulkDialog)} onClose={() => setBulkDialog(null)} fullWidth maxWidth="md">
        <DialogTitle>Bulk paste entries</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            One entry per line, columns separated by <b>Tab</b> (paste from a table) or commas:
            {' '}<code>month, title, theme, pages</code>. A leading “T-1.” in the title is read as its number.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Mode" value={bulkDialog?.mode || 'append'}
                onChange={(e) => setBulkDialog({ ...bulkDialog, mode: e.target.value })}>
                <MenuItem value="append">Append to existing</MenuItem>
                <MenuItem value="replace">Replace all entries</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8} sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip size="small" color="success" label={`${bulkPreview.entries.length} valid`} sx={{ mr: 1 }} />
              {bulkPreview.skipped > 0 && <Chip size="small" color="warning" label={`${bulkPreview.skipped} skipped`} />}
            </Grid>
          </Grid>
          <TextField fullWidth multiline minRows={8} placeholder={'april\tIndia is One\tOur India\t177\napril\tFood We Must Eat\tHealth and Fitness\t179'}
            value={bulkDialog?.text || ''} onChange={(e) => setBulkDialog({ ...bulkDialog, text: e.target.value })}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }} />
          {bulkDialog?.mode === 'replace' && (
            <Alert severity="warning" sx={{ mt: 1 }}>Replace deletes all current entries (and their coverage marks) before importing.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitBulk} disabled={bulkSaving || bulkPreview.entries.length === 0}>
            {bulkSaving ? 'Importing...' : `Import ${bulkPreview.entries.length}`}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Entry"
        message={`Delete "${deleteDialog.item?.title || ''}"? Its coverage marks will also be removed.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
