import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Switch, IconButton,
  Tooltip, ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  UploadFile as UploadIcon, PictureAsPdf as PdfIcon, Description as WordIcon,
  Delete as DeleteIcon, HourglassEmpty as PendingIcon, ErrorOutline as FailIcon,
} from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

const DOC_TYPES = [
  { value: 'model_paper', label: 'Model Paper' },
  { value: 'answer_key', label: 'Answer Key' },
  { value: 'blueprint', label: 'Blueprint' },
];

function b64toBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}
function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
// Best-effort parse of "Class V-S. St.-Half Yearly Model Paper Answer Key 2026-27.docx"
function detectFromName(name, grades, exams) {
  const out = {};
  const g = name.match(/class[\s-]+([a-z0-9]+)/i);
  if (g) {
    const cand = g[1].toUpperCase();
    const hit = (grades || []).find((x) => x.grade.toUpperCase() === cand);
    if (hit) out.grade = hit.grade;
  }
  if (/answer\s*key/i.test(name)) out.docType = 'answer_key';
  else if (/blue\s*print/i.test(name)) out.docType = 'blueprint';
  else if (/model\s*paper/i.test(name)) out.docType = 'model_paper';
  if (/half\s*yearly/i.test(name)) out.exam = 'half_yearly';
  else if (/annual/i.test(name)) out.exam = 'annual';
  if (!out.exam && (exams || []).length === 1) out.exam = exams[0].value;
  return out;
}

export default function ModelPapers() {
  const can = useCan();
  const canManage = can('syllabus.manage');

  const [years, setYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);

  const [filter, setFilter] = useState({ academicYearId: '', grade: '', exam: '', streamCode: '' });
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialog, setDialog] = useState(null); // { subjectId, exam, streamCode, docType, file, pdfFile }
  const [saving, setSaving] = useState(false);

  const hasStreams = streams.length > 0;
  const streamName = (code) => streams.find((s) => (s.code || '').toLowerCase() === (code || '').toLowerCase())?.name || code;

  useEffect(() => {
    (async () => {
      try {
        const [yrs, grds, strms, subs, lookups] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          syllabusService.getGrades(),
          syllabusService.getStreams(),
          syllabusService.getSubjects(),
          syllabusService.getLookups(),
        ]);
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        setGrades(grds || []);
        setStreams(strms || []);
        setSubjects(subs || []);
        const ex = lookups?.exams || [{ value: 'half_yearly', label: 'Half Yearly' }, { value: 'annual', label: 'Annual' }];
        setExams(ex);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        setFilter((f) => ({ ...f, academicYearId: cur?.uuid || '', grade: (grds || [])[0]?.grade || '', exam: ex[0]?.value || '' }));
      } catch {
        setError('Failed to load model-paper filters');
      }
    })();
  }, []);

  const loadPapers = async (f = filter) => {
    if (!f.academicYearId || !f.grade || !f.exam) { setPapers([]); return; }
    setLoading(true); setError('');
    try {
      const params = { academicYearId: f.academicYearId, grade: f.grade, exam: f.exam };
      if (f.streamCode) params.streamCode = f.streamCode;
      setPapers((await syllabusService.getModelPapers(params)) || []);
    } catch {
      setError('Failed to load model papers');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadPapers(); /* eslint-disable-next-line */ }, [filter.academicYearId, filter.grade, filter.exam, filter.streamCode]);

  const showStreamCol = hasStreams && !filter.streamCode;

  const openFile = async (docId, format, download = false) => {
    setError('');
    try {
      const r = await syllabusService.getModelPaperFile(docId, format);
      const url = URL.createObjectURL(b64toBlob(r.base64Data, r.mimeType));
      if (format === 'pdf' && !download) {
        window.open(url, '_blank', 'noopener');
      } else {
        const a = document.createElement('a');
        a.href = url; a.download = r.fileName || 'file';
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to open file');
    }
  };

  const toggleRelease = async (paper) => {
    setError('');
    try {
      await syllabusService.setAnswerKeyReleased(paper.uuid, !paper.answerKeyReleased);
      setPapers((prev) => prev.map((p) => (p.uuid === paper.uuid ? { ...p, answerKeyReleased: !p.answerKeyReleased } : p)));
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update release');
    }
  };

  const deleteDoc = async (docId) => {
    setError('');
    try {
      await syllabusService.deleteModelPaperDoc(docId);
      loadPapers();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete document');
    }
  };

  const openUpload = (prefill = {}) => setDialog({
    subjectId: prefill.subjectId || '',
    exam: prefill.exam || filter.exam,
    streamCode: prefill.streamCode !== undefined ? prefill.streamCode : (filter.streamCode && filter.streamCode !== 'common' ? filter.streamCode : ''),
    docType: prefill.docType || 'model_paper',
    file: null,
    pdfFile: null,
  });

  const onPickFile = (file) => {
    if (!file) { setDialog((d) => ({ ...d, file: null })); return; }
    const det = detectFromName(file.name, grades, exams);
    setDialog((d) => ({
      ...d,
      file,
      docType: det.docType || d.docType,
      exam: det.exam || d.exam,
    }));
  };

  const submitUpload = async () => {
    if (!dialog.subjectId || !dialog.exam || !dialog.docType || !dialog.file) {
      setError('Subject, exam, document type and a Word file are required');
      return;
    }
    setSaving(true); setError('');
    try {
      const base64Data = await readFileB64(dialog.file);
      const pdfBase64Data = dialog.pdfFile ? await readFileB64(dialog.pdfFile) : undefined;
      await syllabusService.uploadModelPaper({
        academicYearId: filter.academicYearId,
        grade: filter.grade,
        streamCode: dialog.streamCode || undefined,
        subjectId: dialog.subjectId,
        exam: dialog.exam,
        docType: dialog.docType,
        fileName: dialog.file.name,
        base64Data,
        pdfFileName: dialog.pdfFile?.name,
        pdfBase64Data,
      });
      setSuccess('Uploaded. PDF will be generated shortly.');
      setDialog(null);
      loadPapers();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to upload');
    } finally {
      setSaving(false);
    }
  };

  const DocCell = ({ paper, docType }) => {
    const doc = paper.docs.find((d) => d.docType === docType);
    if (!doc) {
      return canManage
        ? <Button size="small" startIcon={<UploadIcon fontSize="small" />} onClick={() => openUpload({ subjectId: paper.subjectId, streamCode: paper.streamCode || '', docType })}>Upload</Button>
        : <Typography variant="caption" color="text.secondary">—</Typography>;
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {doc.hasPdf ? (
          <Chip size="small" color="primary" variant="outlined" icon={<PdfIcon />} label="PDF" onClick={() => openFile(doc.uuid, 'pdf')} clickable />
        ) : doc.pdfStatus === 'pending' ? (
          <Chip size="small" color="warning" variant="outlined" icon={<PendingIcon />} label="Generating…" />
        ) : doc.pdfStatus === 'failed' ? (
          <Tooltip title="Conversion failed — re-upload"><Chip size="small" color="error" variant="outlined" icon={<FailIcon />} label="PDF failed" /></Tooltip>
        ) : null}
        {doc.hasDocx && (
          <Chip size="small" variant="outlined" icon={<WordIcon />} label="Word" onClick={() => openFile(doc.uuid, 'docx', true)} clickable />
        )}
        {canManage && (
          <>
            <Tooltip title="Replace"><IconButton size="small" onClick={() => openUpload({ subjectId: paper.subjectId, streamCode: paper.streamCode || '', docType })}><UploadIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => deleteDoc(doc.uuid)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </>
        )}
      </Box>
    );
  };

  const examLabel = useMemo(() => Object.fromEntries(exams.map((e) => [e.value, e.label])), [exams]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Model Papers</Typography>
        {canManage && filter.grade && filter.exam && (
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => openUpload()}>Upload paper</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={filter.academicYearId}
                onChange={(e) => setFilter({ ...filter, academicYearId: e.target.value })}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth select size="small" label="Grade" value={filter.grade}
                onChange={(e) => setFilter({ ...filter, grade: e.target.value })}>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select size="small" label="Exam" value={filter.exam}
                onChange={(e) => setFilter({ ...filter, exam: e.target.value })}>
                {exams.map((e) => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} md={4}>
                <ToggleButtonGroup size="small" exclusive value={filter.streamCode}
                  onChange={(_, v) => v !== null && setFilter({ ...filter, streamCode: v })}>
                  <ToggleButton value="">All</ToggleButton>
                  {streams.map((s) => <ToggleButton key={s.code} value={s.code}>{s.name}</ToggleButton>)}
                  <ToggleButton value="common">Common</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : !filter.grade || !filter.exam ? (
            <Alert severity="info">Pick a grade and exam to manage its model papers.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 150, fontWeight: 600 }}>Subject</TableCell>
                    {showStreamCol && <TableCell sx={{ width: 110, fontWeight: 600 }}>Stream</TableCell>}
                    <TableCell sx={{ fontWeight: 600 }}>Model Paper</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Answer Key</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Blueprint</TableCell>
                    <TableCell sx={{ width: 150, fontWeight: 600 }} align="center">Answer key → students</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {papers.length === 0 ? (
                    <TableRow><TableCell colSpan={showStreamCol ? 6 : 5} align="center" sx={{ py: 3 }}>
                      No papers yet for {filter.grade} · {examLabel[filter.exam] || filter.exam}. {canManage && 'Use “Upload paper”.'}
                    </TableCell></TableRow>
                  ) : papers.map((p) => {
                    const hasAnswerDoc = p.docs.some((d) => d.docType === 'answer_key');
                    return (
                      <TableRow key={p.uuid} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{p.subjectName || '-'}</TableCell>
                        {showStreamCol && (
                          <TableCell>{p.streamCode
                            ? <Chip size="small" color="info" variant="outlined" label={streamName(p.streamCode)} />
                            : <Chip size="small" variant="outlined" label="Common" />}</TableCell>
                        )}
                        <TableCell><DocCell paper={p} docType="model_paper" /></TableCell>
                        <TableCell><DocCell paper={p} docType="answer_key" /></TableCell>
                        <TableCell><DocCell paper={p} docType="blueprint" /></TableCell>
                        <TableCell align="center">
                          <Tooltip title={hasAnswerDoc ? (p.answerKeyReleased ? 'Released to students' : 'Hidden from students') : 'Upload an answer key first'}>
                            <span>
                              <Switch size="small" checked={!!p.answerKeyReleased} disabled={!canManage || !hasAnswerDoc}
                                onChange={() => toggleRelease(p)} />
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Upload document · {filter.grade} · {examLabel[filter.exam] || filter.exam}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={hasStreams ? 6 : 12}>
              <TextField fullWidth select size="small" label="Subject" value={dialog?.subjectId || ''}
                onChange={(e) => setDialog({ ...dialog, subjectId: e.target.value })}>
                {subjects.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select size="small" label="Stream" value={dialog?.streamCode || ''}
                  onChange={(e) => setDialog({ ...dialog, streamCode: e.target.value })} helperText="Common = every stream">
                  <MenuItem value="">Common (all streams)</MenuItem>
                  {streams.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select size="small" label="Exam" value={dialog?.exam || ''}
                onChange={(e) => setDialog({ ...dialog, exam: e.target.value })}>
                {exams.map((e) => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select size="small" label="Document" value={dialog?.docType || 'model_paper'}
                onChange={(e) => setDialog({ ...dialog, docType: e.target.value })}>
                {DOC_TYPES.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button component="label" variant="outlined" startIcon={<WordIcon />} fullWidth>
                {dialog?.file ? dialog.file.name : 'Choose Word (.docx) file'}
                <input hidden type="file" accept=".doc,.docx" onChange={(e) => onPickFile(e.target.files?.[0])} />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                We keep the Word file and generate a PDF for viewing. Fields auto-fill from the file name where possible.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Button component="label" variant="text" size="small" startIcon={<PdfIcon />}>
                {dialog?.pdfFile ? dialog.pdfFile.name : 'Optionally attach a ready PDF (skips conversion)'}
                <input hidden type="file" accept=".pdf" onChange={(e) => setDialog({ ...dialog, pdfFile: e.target.files?.[0] || null })} />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitUpload} disabled={saving || !dialog?.subjectId || !dialog?.file}>
            {saving ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
