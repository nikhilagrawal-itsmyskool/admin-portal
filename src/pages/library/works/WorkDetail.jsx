import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Alert, CircularProgress, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, Divider, Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ExpandMore as ExpandIcon, Add as AddIcon, QrCode2 as QrIcon,
  LibraryAdd as EditionIcon, Print as PrintIcon,
} from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

const STATUS_COLORS = { available: 'success', issued: 'warning', lost: 'error', withdrawn: 'default', damaged: 'error' };

export default function WorkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.LIBRARY_MANAGE);
  const [work, setWork] = useState(null);
  const [copiesByTitle, setCopiesByTitle] = useState({});
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editionDlg, setEditionDlg] = useState(false);
  const [edition, setEdition] = useState({ titleAsPrinted: '', language: 'english', edition: '', yearOfPublication: '', publisher: '', pages: '' });
  const [copiesDlg, setCopiesDlg] = useState({ open: false, titleId: null });
  const [bulk, setBulk] = useState({ prefix: '', start: 1, count: 1, price: '', acquisitionYear: '', billNo: '' });
  const [labelDlg, setLabelDlg] = useState({ open: false, label: null, accessionNo: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [w, enums] = await Promise.all([libraryService.getWork(id), libraryService.getEnums()]);
      setWork(w);
      setLanguages(enums.languages || []);
      const entries = await Promise.all(
        (w.titles || []).map(async (t) => [t.uuid, (await libraryService.listCopiesByTitle(t.uuid)).copies || []])
      );
      setCopiesByTitle(Object.fromEntries(entries));
    } catch {
      setError('Failed to load work');
    } finally {
      setLoading(false);
    }
  };

  const submitEdition = async () => {
    setSaving(true);
    try {
      const num = (v) => (v === '' ? undefined : Number(v));
      await libraryService.addTitle(id, {
        titleAsPrinted: edition.titleAsPrinted.trim(),
        language: edition.language,
        edition: edition.edition || undefined,
        yearOfPublication: num(edition.yearOfPublication),
        publisher: edition.publisher || undefined,
        pages: num(edition.pages),
      });
      setEditionDlg(false);
      setEdition({ titleAsPrinted: '', language: 'english', edition: '', yearOfPublication: '', publisher: '', pages: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add edition');
    } finally {
      setSaving(false);
    }
  };

  const submitCopies = async () => {
    setSaving(true);
    try {
      const num = (v) => (v === '' ? undefined : Number(v));
      const start = parseInt(bulk.start, 10) || 1;
      const count = Math.min(parseInt(bulk.count, 10) || 0, 500);
      const copies = [];
      for (let i = 0; i < count; i++) {
        copies.push({
          accessionNo: `${bulk.prefix}${start + i}`,
          price: num(bulk.price),
          acquisitionYear: num(bulk.acquisitionYear),
          billNo: bulk.billNo || undefined,
        });
      }
      if (copies.length === 0) { setSaving(false); return; }
      await libraryService.addCopies(copiesDlg.titleId, copies);
      setCopiesDlg({ open: false, titleId: null });
      setBulk({ prefix: '', start: 1, count: 1, price: '', acquisitionYear: '', billNo: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add copies');
    } finally {
      setSaving(false);
    }
  };

  const showLabel = async (copy) => {
    try {
      const label = await libraryService.getLabel(copy.uuid, 'qr');
      setLabelDlg({ open: true, label, accessionNo: copy.accessionNo });
    } catch {
      setError('Failed to generate label');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!work) return <Alert severity="error">{error || 'Work not found'}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <IconButton onClick={() => navigate('/library/catalog')}><BackIcon /></IconButton>
        <Typography variant="h4">{work.uniformTitle}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Typography variant="body2"><b>Author:</b> {work.authorDisplay || '—'}</Typography>
            <Typography variant="body2"><b>DDC:</b> {work.ddcNumber || '—'} {work.topic ? `(${work.topic})` : ''}</Typography>
            {work.colorCode && <Chip label={work.colorCode} size="small" variant="outlined" />}
            <Chip label={`${work.totalCopies} copies`} size="small" color="primary" variant="outlined" />
            <Chip label={`${work.availableCopies} available`} size="small" color="success" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Editions ({work.titles?.length || 0})</Typography>
        {canManage && (
          <Button size="small" startIcon={<EditionIcon />} onClick={() => setEditionDlg(true)}>Add edition / language</Button>
        )}
      </Box>

      {(work.titles || []).map((t) => (
        <Accordion key={t.uuid} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%' }}>
              <Typography sx={{ fontWeight: 600 }}>{t.titleAsPrinted}</Typography>
              <Chip label={t.language} size="small" />
              {t.edition && <Chip label={t.edition} size="small" variant="outlined" />}
              <Chip label={t.localCallNo} size="small" color="primary" variant="outlined" />
              <Chip label={`${t.availableCopies}/${t.totalCopies} avail`} size="small" color={t.availableCopies > 0 ? 'success' : 'default'} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {canManage && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setCopiesDlg({ open: true, titleId: t.uuid })}>Add copies</Button>
              </Box>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Accession #</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Acq. Year</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Specimen</TableCell>
                  <TableCell align="right">Label</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(copiesByTitle[t.uuid] || []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No copies</TableCell></TableRow>
                ) : (
                  (copiesByTitle[t.uuid] || []).map((c) => (
                    <TableRow key={c.uuid}>
                      <TableCell>{c.accessionNo}</TableCell>
                      <TableCell><Chip label={c.status} size="small" color={STATUS_COLORS[c.status] || 'default'} variant="outlined" /></TableCell>
                      <TableCell>{[c.almirah, c.shelf].filter(Boolean).join(' / ') || '—'}</TableCell>
                      <TableCell>{c.acquisitionYear || '—'}</TableCell>
                      <TableCell align="right">{c.price != null ? Number(c.price).toFixed(2) : '—'}</TableCell>
                      <TableCell>{c.isSpecimen ? 'Yes' : 'No'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => showLabel(c)} title="Print label"><QrIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Add edition dialog */}
      <Dialog open={editionDlg} onClose={() => setEditionDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add edition / language</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={7}><TextField fullWidth size="small" required label="Title as printed" value={edition.titleAsPrinted} onChange={(e) => setEdition({ ...edition, titleAsPrinted: e.target.value })} /></Grid>
            <Grid item xs={12} md={5}>
              <TextField select fullWidth size="small" label="Language" value={edition.language} onChange={(e) => setEdition({ ...edition, language: e.target.value })}>
                {languages.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Edition" value={edition.edition} onChange={(e) => setEdition({ ...edition, edition: e.target.value })} /></Grid>
            <Grid item xs={6} md={4}><TextField fullWidth size="small" type="number" label="Year" value={edition.yearOfPublication} onChange={(e) => setEdition({ ...edition, yearOfPublication: e.target.value })} /></Grid>
            <Grid item xs={6} md={4}><TextField fullWidth size="small" type="number" label="Pages" value={edition.pages} onChange={(e) => setEdition({ ...edition, pages: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Publisher" value={edition.publisher} onChange={(e) => setEdition({ ...edition, publisher: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditionDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitEdition} disabled={saving || !edition.titleAsPrinted.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Add copies dialog */}
      <Dialog open={copiesDlg.open} onClose={() => setCopiesDlg({ open: false, titleId: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Add copies (new acquisition)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Accession prefix" value={bulk.prefix} onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })} /></Grid>
            <Grid item xs={6} md={3.5}><TextField fullWidth size="small" type="number" label="Start #" value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} /></Grid>
            <Grid item xs={6} md={3.5}><TextField fullWidth size="small" type="number" label="Count" value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: e.target.value })} /></Grid>
            <Grid item xs={12}><Divider>shared acquisition details</Divider></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" type="number" label="Price" value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" type="number" label="Acq. year" value={bulk.acquisitionYear} onChange={(e) => setBulk({ ...bulk, acquisitionYear: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="Bill no" value={bulk.billNo} onChange={(e) => setBulk({ ...bulk, billNo: e.target.value })} /></Grid>
          </Grid>
          <Typography variant="caption" sx={{ color: '#8f9bb3', mt: 1, display: 'block' }}>
            Will create {Math.max(parseInt(bulk.count, 10) || 0, 0)} copy(ies): {bulk.prefix}{bulk.start} … {bulk.prefix}{(parseInt(bulk.start, 10) || 1) + (Math.max(parseInt(bulk.count, 10) || 1, 1) - 1)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopiesDlg({ open: false, titleId: null })}>Cancel</Button>
          <Button variant="contained" onClick={submitCopies} disabled={saving}>Add copies</Button>
        </DialogActions>
      </Dialog>

      {/* Label dialog */}
      <Dialog open={labelDlg.open} onClose={() => setLabelDlg({ open: false, label: null, accessionNo: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Label — {labelDlg.accessionNo}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {labelDlg.label?.dataUrl ? (
            <img src={labelDlg.label.dataUrl} alt={labelDlg.accessionNo} style={{ width: 200, height: 200 }} />
          ) : (
            <Alert severity="info">QR image unavailable; encoded value below.</Alert>
          )}
          <Typography sx={{ mt: 1, fontFamily: 'monospace' }}>{labelDlg.label?.value}</Typography>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
          <Button onClick={() => setLabelDlg({ open: false, label: null, accessionNo: '' })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
