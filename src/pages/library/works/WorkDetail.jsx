import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Alert, CircularProgress, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, Divider, Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ExpandMore as ExpandIcon, Add as AddIcon, QrCode2 as QrIcon,
  LibraryAdd as EditionIcon, Print as PrintIcon, CallMerge as MergeIcon, Search as SearchIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

const STATUS_COLORS = { available: 'success', issued: 'warning', lost: 'error', withdrawn: 'default', damaged: 'error' };
const COPY_STATUSES = ['available', 'issued', 'lost', 'withdrawn', 'damaged'];
const BOOK_CONDITIONS = ['new', 'good', 'fair', 'damaged', 'poor'];
const num = (v) => (v === '' || v == null ? undefined : Number(v));

export default function WorkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.LIBRARY_CATALOG_MANAGE);
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

  const [mergeDlg, setMergeDlg] = useState(false);
  const [mergeQ, setMergeQ] = useState('');
  const [mergeResults, setMergeResults] = useState([]);
  const [mergeSel, setMergeSel] = useState(null);
  const [mergeSearching, setMergeSearching] = useState(false);

  // Edit existing work / title / copy.
  const [editWork, setEditWork] = useState(null);
  const [editTitle, setEditTitle] = useState(null);
  const [editCopy, setEditCopy] = useState(null);

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

  const searchMerge = async () => {
    setMergeSearching(true);
    try {
      const data = await libraryService.searchWorks({ q: mergeQ.trim(), limit: 25 });
      setMergeResults((data.works || []).filter((w) => w.uuid !== id));
    } catch {
      setError('Search failed');
    } finally {
      setMergeSearching(false);
    }
  };

  const doMerge = async () => {
    if (!mergeSel) return;
    setSaving(true);
    try {
      // Backend keeps the lowest-accession work as primary and returns it.
      const primary = await libraryService.mergeWork(id, mergeSel.uuid);
      setMergeDlg(false);
      setMergeSel(null);
      setMergeResults([]);
      setMergeQ('');
      if (primary?.uuid && primary.uuid !== id) {
        navigate(`/library/catalog/${primary.uuid}`);
      } else {
        load();
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Merge failed');
    } finally {
      setSaving(false);
    }
  };

  const openEditWork = () => setEditWork({
    uniformTitle: work.uniformTitle || '', author: work.authorDisplay || '', ddcNumber: work.ddcNumber || '',
    subjectType: work.subjectType || '', topic: work.topic || '', keywords: work.keywords || '',
    colorCode: work.colorCode || '', ageFrom: work.ageFrom ?? '', ageTo: work.ageTo ?? '',
  });
  const submitEditWork = async () => {
    setSaving(true);
    try {
      const a = editWork.author.trim();
      await libraryService.updateWork(id, {
        uniformTitle: editWork.uniformTitle.trim(),
        authorInput: a, authorDisplay: a, firstAuthorSurname: a ? a.split(',')[0].trim() : '',
        ddcNumber: editWork.ddcNumber.trim(), subjectType: editWork.subjectType.trim(),
        topic: editWork.topic.trim(), keywords: editWork.keywords.trim(), colorCode: editWork.colorCode.trim(),
        ageFrom: num(editWork.ageFrom), ageTo: num(editWork.ageTo),
      });
      setEditWork(null); load();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to update work'); }
    finally { setSaving(false); }
  };

  const openEditTitle = (t) => setEditTitle({
    uuid: t.uuid, titleAsPrinted: t.titleAsPrinted || '', language: t.language || 'english', edition: t.edition || '',
    yearOfPublication: t.yearOfPublication ?? '', publisher: t.publisher || '', pages: t.pages ?? '', localCallNo: t.localCallNo || '',
  });
  const submitEditTitle = async () => {
    setSaving(true);
    try {
      await libraryService.updateTitle(editTitle.uuid, {
        titleAsPrinted: editTitle.titleAsPrinted.trim(), language: editTitle.language, edition: editTitle.edition.trim(),
        yearOfPublication: num(editTitle.yearOfPublication), publisher: editTitle.publisher.trim(),
        pages: num(editTitle.pages), localCallNo: editTitle.localCallNo.trim(),
      });
      setEditTitle(null); load();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to update edition'); }
    finally { setSaving(false); }
  };

  const openEditCopy = (c) => setEditCopy({
    uuid: c.uuid, accessionNo: c.accessionNo, price: c.price ?? '', acquisitionYear: c.acquisitionYear ?? '',
    almirah: c.almirah || '', shelf: c.shelf || '', bookCondition: c.bookCondition || '', status: c.status || 'available',
    source: c.source || '', billNo: c.billNo || '', remarks: c.remarks || '',
  });
  const submitEditCopy = async () => {
    setSaving(true);
    try {
      await libraryService.updateCopy(editCopy.uuid, {
        price: num(editCopy.price), acquisitionYear: num(editCopy.acquisitionYear),
        almirah: editCopy.almirah.trim(), shelf: editCopy.shelf.trim(),
        bookCondition: editCopy.bookCondition || undefined, status: editCopy.status || undefined,
        source: editCopy.source.trim(), billNo: editCopy.billNo.trim(), remarks: editCopy.remarks.trim(),
      });
      setEditCopy(null); load();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to update copy'); }
    finally { setSaving(false); }
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
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{work.uniformTitle}</Typography>
        {canManage && (
          <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={openEditWork}>Edit work</Button>
        )}
        {canManage && (
          <Button variant="outlined" size="small" startIcon={<MergeIcon />} onClick={() => setMergeDlg(true)}>
            Merge another work in
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Typography variant="body2"><b>Author:</b> {work.authorDisplay || '—'}</Typography>
            <Typography variant="body2"><b>DDC:</b> {work.ddcNumber || '—'} {work.topic ? `(${work.topic})` : ''}</Typography>
            {work.subjectType && <Typography variant="body2"><b>Subject:</b> {work.subjectType}</Typography>}
            {work.colorCode && <Chip label={work.colorCode} size="small" variant="outlined" />}
            <Chip label={`${work.totalCopies} copies`} size="small" color="primary" variant="outlined" />
            <Chip label={`${work.availableCopies} available`} size="small" color="success" variant="outlined" />
          </Stack>
          <Typography variant="body2" sx={{ mt: 1 }} color={work.keywords ? 'text.primary' : 'text.secondary'}>
            <b>Keywords:</b> {work.keywords || '— none yet (use Edit work to add)'}
          </Typography>
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
              {canManage && (
                <IconButton size="small" sx={{ ml: 'auto' }} onClick={(e) => { e.stopPropagation(); openEditTitle(t); }} title="Edit edition">
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
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
                        {canManage && <IconButton size="small" onClick={() => openEditCopy(c)} title="Edit copy"><EditIcon fontSize="small" /></IconButton>}
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

      {/* Edit work dialog */}
      <Dialog open={!!editWork} onClose={() => setEditWork(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit work</DialogTitle>
        <DialogContent>
          {editWork && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}><TextField fullWidth size="small" required label="Uniform title" value={editWork.uniformTitle} onChange={(e) => setEditWork({ ...editWork, uniformTitle: e.target.value })} /></Grid>
              <Grid item xs={12} md={7}><TextField fullWidth size="small" label="Author (Surname, First)" value={editWork.author} onChange={(e) => setEditWork({ ...editWork, author: e.target.value })} /></Grid>
              <Grid item xs={6} md={2.5}><TextField fullWidth size="small" label="DDC" value={editWork.ddcNumber} onChange={(e) => setEditWork({ ...editWork, ddcNumber: e.target.value })} /></Grid>
              <Grid item xs={6} md={2.5}><TextField fullWidth size="small" label="Colour" value={editWork.colorCode} onChange={(e) => setEditWork({ ...editWork, colorCode: e.target.value })} /></Grid>
              <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Subject / Type" value={editWork.subjectType} onChange={(e) => setEditWork({ ...editWork, subjectType: e.target.value })} /></Grid>
              <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Topic" value={editWork.topic} onChange={(e) => setEditWork({ ...editWork, topic: e.target.value })} /></Grid>
              <Grid item xs={3} md={2}><TextField fullWidth size="small" type="number" label="Age from" value={editWork.ageFrom} onChange={(e) => setEditWork({ ...editWork, ageFrom: e.target.value })} /></Grid>
              <Grid item xs={3} md={2}><TextField fullWidth size="small" type="number" label="Age to" value={editWork.ageTo} onChange={(e) => setEditWork({ ...editWork, ageTo: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="Keywords (comma-separated)" value={editWork.keywords} onChange={(e) => setEditWork({ ...editWork, keywords: e.target.value })} helperText="Powers content search" /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWork(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEditWork} disabled={saving || !editWork?.uniformTitle.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit edition dialog */}
      <Dialog open={!!editTitle} onClose={() => setEditTitle(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit edition</DialogTitle>
        <DialogContent>
          {editTitle && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={7}><TextField fullWidth size="small" required label="Title as printed" value={editTitle.titleAsPrinted} onChange={(e) => setEditTitle({ ...editTitle, titleAsPrinted: e.target.value })} /></Grid>
              <Grid item xs={12} md={5}>
                <TextField select fullWidth size="small" label="Language" value={editTitle.language} onChange={(e) => setEditTitle({ ...editTitle, language: e.target.value })}>
                  {languages.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Edition" value={editTitle.edition} onChange={(e) => setEditTitle({ ...editTitle, edition: e.target.value })} /></Grid>
              <Grid item xs={6} md={4}><TextField fullWidth size="small" type="number" label="Year" value={editTitle.yearOfPublication} onChange={(e) => setEditTitle({ ...editTitle, yearOfPublication: e.target.value })} /></Grid>
              <Grid item xs={6} md={4}><TextField fullWidth size="small" type="number" label="Pages" value={editTitle.pages} onChange={(e) => setEditTitle({ ...editTitle, pages: e.target.value })} /></Grid>
              <Grid item xs={12} md={8}><TextField fullWidth size="small" label="Publisher" value={editTitle.publisher} onChange={(e) => setEditTitle({ ...editTitle, publisher: e.target.value })} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Call number" value={editTitle.localCallNo} onChange={(e) => setEditTitle({ ...editTitle, localCallNo: e.target.value })} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTitle(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEditTitle} disabled={saving || !editTitle?.titleAsPrinted.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit copy dialog */}
      <Dialog open={!!editCopy} onClose={() => setEditCopy(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit copy — {editCopy?.accessionNo}</DialogTitle>
        <DialogContent>
          {editCopy && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6} md={3}><TextField fullWidth size="small" type="number" label="Price" value={editCopy.price} onChange={(e) => setEditCopy({ ...editCopy, price: e.target.value })} /></Grid>
              <Grid item xs={6} md={3}><TextField fullWidth size="small" type="number" label="Acq. year" value={editCopy.acquisitionYear} onChange={(e) => setEditCopy({ ...editCopy, acquisitionYear: e.target.value })} /></Grid>
              <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Almirah" value={editCopy.almirah} onChange={(e) => setEditCopy({ ...editCopy, almirah: e.target.value })} /></Grid>
              <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Shelf" value={editCopy.shelf} onChange={(e) => setEditCopy({ ...editCopy, shelf: e.target.value })} /></Grid>
              <Grid item xs={6} md={4}>
                <TextField select fullWidth size="small" label="Condition" value={editCopy.bookCondition} onChange={(e) => setEditCopy({ ...editCopy, bookCondition: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {BOOK_CONDITIONS.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField select fullWidth size="small" label="Status" value={editCopy.status} onChange={(e) => setEditCopy({ ...editCopy, status: e.target.value })}>
                  {COPY_STATUSES.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Source" value={editCopy.source} onChange={(e) => setEditCopy({ ...editCopy, source: e.target.value })} /></Grid>
              <Grid item xs={6} md={6}><TextField fullWidth size="small" label="Bill no" value={editCopy.billNo} onChange={(e) => setEditCopy({ ...editCopy, billNo: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Remarks" value={editCopy.remarks} onChange={(e) => setEditCopy({ ...editCopy, remarks: e.target.value })} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCopy(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEditCopy} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Merge works dialog */}
      <Dialog open={mergeDlg} onClose={() => setMergeDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Merge another work into “{work.uniformTitle}”</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Find the other edition (e.g. the Hindi or English version). Its editions &amp; copies move under one work; the work with the lowest accession number is kept as primary and its DDC/colour apply.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth size="small" autoFocus
              placeholder="Search title or author (type in English, finds Hindi)…"
              value={mergeQ}
              onChange={(e) => setMergeQ(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMerge()}
            />
            <Button variant="contained" size="small" startIcon={<SearchIcon />} onClick={searchMerge} disabled={mergeSearching || !mergeQ.trim()}>Search</Button>
          </Box>
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {mergeResults.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                {mergeSearching ? 'Searching…' : 'Search above to find the work to merge in.'}
              </Typography>
            ) : (
              mergeResults.map((w) => (
                <Box
                  key={w.uuid}
                  onClick={() => setMergeSel(w)}
                  sx={{
                    p: 1, mb: 0.5, borderRadius: 1, cursor: 'pointer', border: '1px solid',
                    borderColor: mergeSel?.uuid === w.uuid ? 'primary.main' : 'divider',
                    bgcolor: mergeSel?.uuid === w.uuid ? 'action.selected' : 'transparent',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{w.uniformTitle}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {w.authorDisplay || '—'} · DDC {w.ddcNumber || '—'} · {w.totalCopies} copies
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDlg(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={doMerge} disabled={saving || !mergeSel}>
            Merge{mergeSel ? ` “${mergeSel.uniformTitle}”` : ''}
          </Button>
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
