import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, Chip,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Switch, IconButton,
  Tooltip, ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  UploadFile as UploadIcon, PictureAsPdf as PdfIcon, Description as WordIcon,
  Delete as DeleteIcon, HourglassEmpty as PendingIcon, ErrorOutline as FailIcon,
  DeleteForever as DeleteRowIcon,
} from '@mui/icons-material';
import DocPreviewDialog from './DocPreviewDialog';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

const DOC_TYPES = [
  { value: 'model_paper', label: 'Model Paper' },
  { value: 'answer_key', label: 'Answer Key' },
  { value: 'blueprint', label: 'Blueprint' },
];
const DOC_TYPE_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

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

  const [dialog, setDialog] = useState(null); // { grade, subjectId, exam, streamCode, docType, file, pdfFile }
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null); // { docId, format, title }
  const [confirmDelete, setConfirmDelete] = useState(null); // the paper row to remove
  const [deleting, setDeleting] = useState(false);

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

  const openPreview = (doc, docType, paper) => {
    // Prefer the Word file (always present); use the PDF only if that's all there is.
    const format = doc.hasDocx ? 'docx' : 'pdf';
    const title = `${paper.grade || filter.grade} · ${paper.subjectName || ''} · ${DOC_TYPE_LABEL[docType] || docType}`;
    setPreview({ docId: doc.uuid, format, title });
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

  const deleteRow = async () => {
    if (!confirmDelete) return;
    setDeleting(true); setError('');
    try {
      await syllabusService.deleteModelPaper(confirmDelete.uuid);
      setSuccess('Model paper row deleted.');
      setConfirmDelete(null);
      loadPapers();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete row');
    } finally {
      setDeleting(false);
    }
  };

  const openUpload = (prefill = {}) => setDialog({
    grade: prefill.grade || filter.grade,
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
      grade: det.grade || d.grade,
      docType: det.docType || d.docType,
      exam: det.exam || d.exam,
    }));
  };

  const submitUpload = async () => {
    if (!dialog.grade || !dialog.subjectId || !dialog.exam || !dialog.docType || !dialog.file) {
      setError('Grade, subject, exam, document type and a Word file are required');
      return;
    }
    setSaving(true); setError('');
    try {
      const base64Data = await readFileB64(dialog.file);
      const pdfBase64Data = dialog.pdfFile ? await readFileB64(dialog.pdfFile) : undefined;
      await syllabusService.uploadModelPaper({
        academicYearId: filter.academicYearId,
        grade: dialog.grade,
        streamCode: dialog.streamCode || undefined,
        subjectId: dialog.subjectId,
        exam: dialog.exam,
        docType: dialog.docType,
        fileName: dialog.file.name,
        base64Data,
        pdfFileName: dialog.pdfFile?.name,
        pdfBase64Data,
      });
      setSuccess('Uploaded.');
      const uploadedGrade = dialog.grade;
      const uploadedExam = dialog.exam;
      setDialog(null);
      // Jump the view to what was just uploaded so it's visible.
      setFilter((f) => ({ ...f, grade: uploadedGrade, exam: uploadedExam }));
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
        ? <Button size="small" startIcon={<UploadIcon fontSize="small" />} onClick={() => openUpload({ grade: paper.grade, subjectId: paper.subjectId, streamCode: paper.streamCode || '', docType })}>Upload</Button>
        : <Typography variant="caption" color="text.secondary">—</Typography>;
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {doc.hasDocx && (
          <Tooltip title="View inline">
            <Chip size="small" color="primary" variant="outlined" icon={<WordIcon />} label="View Word" onClick={() => openPreview(doc, docType, paper)} clickable />
          </Tooltip>
        )}
        {doc.hasPdf ? (
          <Tooltip title="View inline">
            <Chip size="small" color="primary" variant="outlined" icon={<PdfIcon />} label="View PDF" onClick={() => setPreview({ docId: doc.uuid, format: 'pdf', title: `${paper.grade || filter.grade} · ${paper.subjectName || ''} · ${DOC_TYPE_LABEL[docType] || docType}` })} clickable />
          </Tooltip>
        ) : doc.pdfStatus === 'pending' ? (
          <Chip size="small" color="warning" variant="outlined" icon={<PendingIcon />} label="PDF…" />
        ) : doc.pdfStatus === 'failed' ? (
          <Tooltip title="PDF conversion failed — the Word view still works"><Chip size="small" color="error" variant="outlined" icon={<FailIcon />} label="PDF failed" /></Tooltip>
        ) : null}
        {canManage && (
          <>
            <Tooltip title="Replace"><IconButton size="small" onClick={() => openUpload({ grade: paper.grade, subjectId: paper.subjectId, streamCode: paper.streamCode || '', docType })}><UploadIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete this document"><IconButton size="small" color="error" onClick={() => deleteDoc(doc.uuid)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </>
        )}
      </Box>
    );
  };

  const examLabel = useMemo(() => Object.fromEntries(exams.map((e) => [e.value, e.label])), [exams]);
  const emptyColSpan = (showStreamCol ? 6 : 5) + (canManage ? 1 : 0);

  // Managing model papers is admin/god only. Teachers reach their own subjects'
  // papers through My Syllabus (scoped), not this full grid.
  if (!canManage) return <Navigate to="/syllabus/my" replace />;

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
                    {canManage && <TableCell sx={{ width: 48, fontWeight: 600 }} align="center">Row</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {papers.length === 0 ? (
                    <TableRow><TableCell colSpan={emptyColSpan} align="center" sx={{ py: 3 }}>
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
                        {canManage && (
                          <TableCell align="center">
                            <Tooltip title="Delete entire row (all documents)">
                              <IconButton size="small" color="error" onClick={() => setConfirmDelete(p)}><DeleteRowIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Upload document</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6} sm={hasStreams ? 3 : 4}>
              <TextField fullWidth select size="small" label="Grade" value={dialog?.grade || ''}
                onChange={(e) => setDialog({ ...dialog, grade: e.target.value })}>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={hasStreams ? 5 : 8}>
              <TextField fullWidth select size="small" label="Subject" value={dialog?.subjectId || ''}
                onChange={(e) => setDialog({ ...dialog, subjectId: e.target.value })}>
                {subjects.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select size="small" label="Stream" value={dialog?.streamCode || ''}
                  onChange={(e) => setDialog({ ...dialog, streamCode: e.target.value })} helperText="Common = every stream">
                  <MenuItem value="">Common (all streams)</MenuItem>
                  {streams.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={6} sm={6}>
              <TextField fullWidth select size="small" label="Exam" value={dialog?.exam || ''}
                onChange={(e) => setDialog({ ...dialog, exam: e.target.value })}>
                {exams.map((e) => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={6}>
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
                We keep the Word file and show it inline. Grade, exam and type auto-fill from the file name where possible.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Button component="label" variant="text" size="small" startIcon={<PdfIcon />}>
                {dialog?.pdfFile ? dialog.pdfFile.name : 'Optionally attach a ready PDF'}
                <input hidden type="file" accept=".pdf" onChange={(e) => setDialog({ ...dialog, pdfFile: e.target.files?.[0] || null })} />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitUpload} disabled={saving || !dialog?.grade || !dialog?.subjectId || !dialog?.file}>
            {saving ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Row-delete confirmation */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => !deleting && setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this row?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes <b>{confirmDelete?.subjectName || 'this subject'}</b>
            {confirmDelete?.streamCode ? ` (${streamName(confirmDelete.streamCode)})` : ''} for {filter.grade} · {examLabel[filter.exam] || filter.exam},
            including every document on the row (model paper, answer key, blueprint). This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteRow} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete row'}
          </Button>
        </DialogActions>
      </Dialog>

      <DocPreviewDialog target={preview} onClose={() => setPreview(null)} />
    </Box>
  );
}
