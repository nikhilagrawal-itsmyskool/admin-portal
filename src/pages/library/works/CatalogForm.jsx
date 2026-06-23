import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Grid,
  MenuItem,
  Alert,
  Divider,
  IconButton,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoFixHigh as FetchIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';
import { classService } from '../../../services/classService';
import { gradesFromClasses } from './grades';

const emptyCopy = () => ({ accessionNo: '', price: '', acquisitionYear: '', billNo: '', almirah: '', shelf: '', isSpecimen: false });

// Parse an age-band code ("3-5", "18+") into { from, to } integers.
function parseAgeBand(code) {
  if (!code) return { from: undefined, to: undefined };
  if (code.endsWith('+')) return { from: parseInt(code, 10) || undefined, to: undefined };
  const [a, b] = code.split('-').map((n) => parseInt(n, 10));
  return { from: Number.isFinite(a) ? a : undefined, to: Number.isFinite(b) ? b : undefined };
}

export default function CatalogForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reference data
  const [ddcOptions, setDdcOptions] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [subdivisions, setSubdivisions] = useState([]);
  const [colors, setColors] = useState([]);
  const [ageBands, setAgeBands] = useState([]);
  const [grades, setGrades] = useState([]);
  const [almirahs, setAlmirahs] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [keywordOptions, setKeywordOptions] = useState([]);

  // Form state
  const [isbn, setIsbn] = useState('');
  const [work, setWork] = useState({
    uniformTitle: '', authorInput: '', ddcNumber: '', subjectType: '', topic: '',
    classFrom: '', classTo: '', colorCode: '',
  });
  const [ageBand, setAgeBand] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [authorPreview, setAuthorPreview] = useState(null);
  const [title, setTitle] = useState({
    titleAsPrinted: '', language: 'english', edition: '', yearOfPublication: '', publisher: '', pages: '',
  });
  const [callNo, setCallNo] = useState('');
  const [collisions, setCollisions] = useState([]);
  const [copies, setCopies] = useState([emptyCopy()]);
  const [bulk, setBulk] = useState({ prefix: '', start: 1, count: 1 });

  useEffect(() => {
    (async () => {
      try {
        const [ddc, enums, colorLk, ageLk, almirahLk, shelfLk, classes] = await Promise.all([
          libraryService.getDdc(),
          libraryService.getEnums(),
          libraryService.getLookups('color'),
          libraryService.getLookups('age_band'),
          libraryService.getLookups('almirah'),
          libraryService.getLookups('shelf'),
          classService.getClasses(),
        ]);
        setDdcOptions(ddc.ddc || []);
        setLanguages(enums.languages || []);
        setSubdivisions(enums.standardSubdivisions || []);
        setColors(colorLk.lookups || []);
        setAgeBands(ageLk.lookups || []);
        setAlmirahs((almirahLk.lookups || []).map((l) => l.label));
        setShelves((shelfLk.lookups || []).map((l) => l.label));
        setGrades(gradesFromClasses(classes || []));
      } catch {
        setError('Failed to load reference data');
      }
    })();
  }, []);

  // Auto color from DDC main class (the leading digit), overridable.
  const colorForDdc = useCallback((ddcNumber) => {
    if (!ddcNumber) return '';
    const digit = String(ddcNumber).trim().charAt(0);
    return colors.find((c) => c.extra?.ddcClass === digit)?.code || '';
  }, [colors]);

  // Append a Table-1 standard subdivision (e.g. .092 biography) to the DDC number.
  const appendSubdivision = (suffix) => {
    setWork((w) => {
      const base = (w.ddcNumber || '').trim();
      if (!base) return w;
      const next = base.includes('.') ? `${base}${suffix}` : `${base}.${suffix}`;
      return { ...w, ddcNumber: next };
    });
  };

  const previewAuthor = useCallback(async (input) => {
    if (!input || !input.trim()) { setAuthorPreview(null); return; }
    try { setAuthorPreview(await libraryService.normalizeAuthor(input)); } catch { /* best-effort */ }
  }, []);

  // Live call-number preview when cutter/ddc/language change.
  useEffect(() => {
    const cutter = authorPreview?.cutter;
    if (!work.ddcNumber && !cutter) { setCallNo(''); setCollisions([]); return; }
    let active = true;
    (async () => {
      try {
        const r = await libraryService.generateCallNo({
          cutter, firstAuthorSurname: authorPreview?.firstAuthorSurname,
          ddcNumber: work.ddcNumber, language: title.language,
        });
        if (active) { setCallNo(r.localCallNo || ''); setCollisions(r.collisions || []); }
      } catch { /* preview only */ }
    })();
    return () => { active = false; };
  }, [authorPreview, work.ddcNumber, title.language]);

  const fetchKeywords = async (q) => {
    try { setKeywordOptions((await libraryService.getKeywords(q)).keywords || []); } catch { /* ignore */ }
  };

  const handleIsbnFetch = async () => {
    if (!isbn.trim()) return;
    setError('');
    try {
      const meta = await libraryService.isbnLookup(isbn.trim());
      if (!meta || !meta.title) { setError('No metadata found for that ISBN'); return; }
      setWork((w) => ({ ...w, uniformTitle: w.uniformTitle || meta.title, authorInput: w.authorInput || (meta.authors || []).join(', ') }));
      setTitle((t) => ({
        ...t, titleAsPrinted: t.titleAsPrinted || meta.title, publisher: t.publisher || meta.publisher || '',
        yearOfPublication: t.yearOfPublication || meta.year || '', pages: t.pages || meta.pages || '',
      }));
      if (meta.authors?.length) previewAuthor((meta.authors || []).join(', '));
    } catch { setError('ISBN lookup failed'); }
  };

  const handleDdcSelect = (opt) => {
    if (!opt) { setWork((w) => ({ ...w, ddcNumber: '', topic: '', subjectType: '' })); return; }
    const parent = ddcOptions.find((d) => d.code === opt.parentCode);
    setWork((w) => ({
      ...w, ddcNumber: opt.code, topic: opt.label,
      subjectType: parent ? parent.label : w.subjectType,
      colorCode: colorForDdc(opt.code) || w.colorCode,
    }));
  };

  const updateCopy = (idx, field, value) => setCopies((cs) => cs.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  const addCopyRow = () => setCopies((cs) => [...cs, emptyCopy()]);
  const removeCopyRow = (idx) => setCopies((cs) => (cs.length > 1 ? cs.filter((_, i) => i !== idx) : cs));

  const generateAccessions = () => {
    const start = parseInt(bulk.start, 10) || 1;
    const count = Math.min(parseInt(bulk.count, 10) || 0, 500);
    if (count <= 0) return;
    setCopies(Array.from({ length: count }, (_, i) => ({ ...emptyCopy(), accessionNo: `${bulk.prefix}${start + i}` })));
  };

  const buildPayload = () => {
    const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
    const age = parseAgeBand(ageBand);
    const cleanCopies = copies.filter((c) => c.accessionNo && c.accessionNo.trim()).map((c) => ({
      accessionNo: c.accessionNo.trim(), price: num(c.price), acquisitionYear: num(c.acquisitionYear),
      billNo: c.billNo || undefined, almirah: c.almirah || undefined, shelf: c.shelf || undefined, isSpecimen: !!c.isSpecimen,
    }));
    return {
      work: {
        uniformTitle: work.uniformTitle.trim(),
        authorInput: work.authorInput || undefined,
        authorDisplay: authorPreview?.authorDisplay,
        firstAuthorSurname: authorPreview?.firstAuthorSurname,
        ddcNumber: work.ddcNumber || undefined,
        subjectType: work.subjectType || undefined,
        topic: work.topic || undefined,
        keywords: keywords.length ? keywords.join(', ') : undefined,
        ageFrom: age.from, ageTo: age.to,
        classFrom: work.classFrom || undefined, classTo: work.classTo || undefined,
        colorCode: work.colorCode || undefined,
      },
      title: {
        titleAsPrinted: title.titleAsPrinted.trim(), language: title.language,
        edition: title.edition || undefined, yearOfPublication: num(title.yearOfPublication),
        publisher: title.publisher || undefined, isbn: isbn.trim() || undefined,
        pages: num(title.pages), localCallNo: callNo || undefined,
      },
      copies: cleanCopies,
    };
  };

  const handleSubmit = async () => {
    if (!work.uniformTitle.trim()) return setError('Title (work) is required');
    if (!title.titleAsPrinted.trim()) return setError('Printed title is required');
    setSaving(true); setError('');
    try {
      const result = await libraryService.catalog(buildPayload());
      navigate(`/library/catalog/${result.work.uuid}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to catalog book');
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={() => navigate('/library/catalog')}><BackIcon /></IconButton>
        <Typography variant="h4">Catalog a Book</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="ISBN" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="Scan/enter ISBN to auto-fill" />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button variant="outlined" startIcon={<FetchIcon />} onClick={handleIsbnFetch}>Auto-Fill from ISBN</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Work</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" required label="Uniform title" value={work.uniformTitle} onChange={(e) => setWork({ ...work, uniformTitle: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Author(s)" placeholder="e.g. Dr. A.P.J. Abdul Kalam, Meera Nair"
                value={work.authorInput}
                onChange={(e) => setWork({ ...work, authorInput: e.target.value })}
                onBlur={(e) => previewAuthor(e.target.value)}
                helperText={authorPreview ? `→ ${authorPreview.authorDisplay}  ·  Cutter ${authorPreview.cutter}` : 'Comma-separate multiple authors; surname-first auto-applied on blur'} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete options={ddcOptions}
                getOptionLabel={(o) => (o.code ? `${o.code} — ${o.label}` : '')}
                isOptionEqualToValue={(o, v) => o.code === v.code}
                value={ddcOptions.find((d) => d.code === work.ddcNumber) || null}
                onChange={(e, v) => handleDdcSelect(v)}
                renderInput={(params) => <TextField {...params} size="small" label="DDC (subject/topic)" />} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth size="small" label="DDC number" value={work.ddcNumber}
                onChange={(e) => setWork({ ...work, ddcNumber: e.target.value, colorCode: colorForDdc(e.target.value) || work.colorCode })}
                helperText="editable (e.g. 796.358092)" />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Append subdivision:</Typography>
                {subdivisions.map((s) => (
                  <Chip key={s.suffix} size="small" variant="outlined" label={`.${s.suffix} ${s.label}`}
                    onClick={() => appendSubdivision(s.suffix)} disabled={!work.ddcNumber} />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth size="small" label="Color (auto from DDC)" value={work.colorCode} onChange={(e) => setWork({ ...work, colorCode: e.target.value })}>
                <MenuItem value="">None</MenuItem>
                {colors.map((c) => (
                  <MenuItem key={c.uuid} value={c.code}>
                    <Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', mr: 1, backgroundColor: c.extra?.hex || '#ccc' }} />
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select fullWidth size="small" label="Age band" value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
                <MenuItem value="">Any</MenuItem>
                {ageBands.map((a) => <MenuItem key={a.uuid} value={a.code}>{a.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select fullWidth size="small" label="Class from" value={work.classFrom} onChange={(e) => setWork({ ...work, classFrom: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {grades.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select fullWidth size="small" label="Class to" value={work.classTo} onChange={(e) => setWork({ ...work, classTo: e.target.value })}>
                <MenuItem value="">—</MenuItem>
                {grades.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete multiple freeSolo options={keywordOptions} value={keywords}
                onChange={(e, v) => setKeywords(v)}
                onInputChange={(e, v) => { if (v && v.length >= 2) fetchKeywords(v); }}
                renderInput={(params) => <TextField {...params} size="small" label="Keywords" placeholder="type to add / pick a suggestion" />} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Edition / Title</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField fullWidth size="small" required label="Title as printed" value={title.titleAsPrinted} onChange={(e) => setTitle({ ...title, titleAsPrinted: e.target.value })} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField select fullWidth size="small" label="Language" value={title.language} onChange={(e) => setTitle({ ...title, language: e.target.value })}>
                {languages.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}><TextField fullWidth size="small" label="Edition" value={title.edition} onChange={(e) => setTitle({ ...title, edition: e.target.value })} /></Grid>
            <Grid item xs={6} md={1.5}><TextField fullWidth size="small" type="number" label="Year" value={title.yearOfPublication} onChange={(e) => setTitle({ ...title, yearOfPublication: e.target.value })} /></Grid>
            <Grid item xs={6} md={1.5}><TextField fullWidth size="small" type="number" label="Pages" value={title.pages} onChange={(e) => setTitle({ ...title, pages: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Publisher" value={title.publisher} onChange={(e) => setTitle({ ...title, publisher: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Local call number" value={callNo} onChange={(e) => setCallNo(e.target.value)}
                InputProps={{
                  endAdornment: collisions.length > 0 && (
                    <InputAdornment position="end">
                      <Tooltip title={`Same call number used by: ${collisions.map((c) => c.titleAsPrinted).join(', ')}`}>
                        <WarningIcon color="warning" fontSize="small" />
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                helperText="auto-generated (CUTTER-DDC-E/H/B); editable" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Copies</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addCopyRow}>Add copy</Button>
          </Box>

          <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Accession prefix" value={bulk.prefix} onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })} placeholder="e.g. WOF-E-" /></Grid>
            <Grid item xs={3} md={2}><TextField fullWidth size="small" type="number" label="Start #" value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} /></Grid>
            <Grid item xs={3} md={2}><TextField fullWidth size="small" type="number" label="Count" value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: e.target.value })} /></Grid>
            <Grid item xs={12} md={3}><Button variant="outlined" size="small" onClick={generateAccessions}>Generate accession #s</Button></Grid>
          </Grid>
          <Divider sx={{ mb: 2 }} />

          {copies.map((c, idx) => (
            <Grid container spacing={1} alignItems="center" key={idx} sx={{ mb: 1 }}>
              <Grid item xs={12} md={2.5}><TextField fullWidth size="small" required label="Accession #" value={c.accessionNo} onChange={(e) => updateCopy(idx, 'accessionNo', e.target.value)} /></Grid>
              <Grid item xs={4} md={1.3}><TextField fullWidth size="small" type="number" label="Price" value={c.price} onChange={(e) => updateCopy(idx, 'price', e.target.value)} /></Grid>
              <Grid item xs={4} md={1.3}><TextField fullWidth size="small" type="number" label="Acq. year" value={c.acquisitionYear} onChange={(e) => updateCopy(idx, 'acquisitionYear', e.target.value)} /></Grid>
              <Grid item xs={4} md={1.4}><TextField fullWidth size="small" label="Bill no" value={c.billNo} onChange={(e) => updateCopy(idx, 'billNo', e.target.value)} /></Grid>
              <Grid item xs={6} md={1.6}>
                <Autocomplete freeSolo options={almirahs} value={c.almirah}
                  onChange={(e, v) => updateCopy(idx, 'almirah', v || '')} onInputChange={(e, v) => updateCopy(idx, 'almirah', v || '')}
                  renderInput={(params) => <TextField {...params} size="small" label="Almirah" />} />
              </Grid>
              <Grid item xs={6} md={1.4}>
                <Autocomplete freeSolo options={shelves} value={c.shelf}
                  onChange={(e, v) => updateCopy(idx, 'shelf', v || '')} onInputChange={(e, v) => updateCopy(idx, 'shelf', v || '')}
                  renderInput={(params) => <TextField {...params} size="small" label="Shelf" />} />
              </Grid>
              <Grid item xs={8} md={1.5}>
                <FormControlLabel control={<Checkbox size="small" checked={c.isSpecimen} onChange={(e) => updateCopy(idx, 'isSpecimen', e.target.checked)} />} label="Specimen" sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }} />
              </Grid>
              <Grid item xs={4} md={0.5}>
                <IconButton size="small" color="error" onClick={() => removeCopyRow(idx)}><DeleteIcon fontSize="small" /></IconButton>
              </Grid>
            </Grid>
          ))}
          <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
            {copies.filter((c) => c.accessionNo.trim()).length} copy(ies) will be created.
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Catalog book'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/library/catalog')}>Cancel</Button>
        {callNo && <Chip label={`Call no: ${callNo}`} color="primary" variant="outlined" sx={{ ml: 'auto', alignSelf: 'center' }} />}
      </Box>
    </Box>
  );
}
