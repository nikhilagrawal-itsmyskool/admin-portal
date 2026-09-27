import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Grid, Button, Stack, Divider,
  FormControl, InputLabel, Select, MenuItem, TextField, OutlinedInput, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { programmesService, SELC } from '../../services/programmesService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useCan } from '../../permissions/can';

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

function downloadBase64(base64, fileName, mimeType) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document.docx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const emptyForm = { title: '', programmeFocus: '', workflowStatus: 'published', focusSkillIds: [], fields: {} };

export default function SelcEditor() {
  const { academicYearId } = useAcademicYear();
  const can = useCan();
  const canManage = can('programme.manage');

  const [fieldTypes, setFieldTypes] = useState([]);
  const [skills, setSkills] = useState([]);
  const [grades, setGrades] = useState([]);
  const [months, setMonths] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [grade, setGrade] = useState('');
  const [month, setMonth] = useState('');
  const [unitId, setUnitId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [sources, setSources] = useState([]);
  const [upload, setUpload] = useState(null); // { grade, base64Data, fileName }
  const fileInputRef = useRef(null);
  const uploadGradeRef = useRef(null);

  const skillName = (id) => skills.find((s) => s.uuid === id)?.name || id;

  // Masters + lookups once.
  useEffect(() => {
    (async () => {
      try {
        const [programme, lookups] = await Promise.all([
          programmesService.getProgramme(SELC),
          programmesService.getLookups(),
        ]);
        setFieldTypes(programme.fieldTypes || []);
        setSkills(programme.skills || []);
        setGrades((programme.stages || []).map((s) => s.grade));
        setMonths(lookups.months || []);
        setStatuses(lookups.workflowStatuses || []);
        if (programme.stages?.length) setGrade(programme.stages[0].grade);
        if (lookups.months?.length) setMonth(lookups.months[0].value);
      } catch {
        setError('Failed to load the programme.');
      }
    })();
  }, []);

  const loadSources = async () => {
    if (!academicYearId) return;
    try {
      setSources(await programmesService.listSources({ programme: SELC, academicYearId }));
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => { loadSources(); }, [academicYearId]);

  // Load the selected unit (or reset to create mode).
  const loadUnit = async () => {
    if (!grade || !month || !academicYearId) return;
    setLoading(true);
    setError('');
    try {
      const list = await programmesService.getUnits({ programme: SELC, grade, month, academicYearId });
      const summary = list.find((u) => u.month === month);
      if (summary) {
        const u = await programmesService.getUnit(summary.uuid);
        setUnitId(u.uuid);
        setForm({
          title: u.title || '',
          programmeFocus: u.programmeFocus || '',
          workflowStatus: u.workflowStatus || 'published',
          focusSkillIds: Array.isArray(u.focusSkillIds) ? u.focusSkillIds : [],
          fields: u.fields || {},
        });
      } else {
        setUnitId(null);
        setForm(emptyForm);
      }
    } catch {
      setError('Failed to load the unit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUnit(); /* eslint-disable-next-line */ }, [grade, month, academicYearId]);

  const setField = (code, value) =>
    setForm((f) => ({ ...f, fields: { ...f.fields, [code]: value } }));

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        title: form.title,
        programmeFocus: form.programmeFocus,
        workflowStatus: form.workflowStatus,
        focusSkillIds: form.focusSkillIds,
        fields: form.fields,
      };
      if (unitId) {
        await programmesService.updateUnit(unitId, payload);
      } else {
        const created = await programmesService.createUnit({
          programmeCode: SELC, academicYearId, grade, month, ...payload,
        });
        setUnitId(created.uuid);
      }
      setSuccess('Saved.');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const doDownload = async (g) => {
    setError('');
    try {
      const file = await programmesService.downloadSource(g, { programme: SELC, academicYearId });
      if (!file) { setError('No source document for this class.'); return; }
      downloadBase64(file.base64, file.fileName, file.mimeType);
    } catch {
      setError('Failed to download the document.');
    }
  };

  const onPickFile = (g) => {
    uploadGradeRef.current = g;
    fileInputRef.current?.click();
  };
  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    setUpload({ grade: uploadGradeRef.current, base64Data: dataUrl, fileName: file.name });
  };
  const confirmUpload = async () => {
    const u = upload;
    setUpload(null);
    setError('');
    setSuccess('');
    try {
      const res = await programmesService.uploadSource(
        u.grade,
        { programme: SELC },
        { base64Data: u.base64Data, fileName: u.fileName, academicYearId },
      );
      setSuccess(`Replaced Class ${u.grade}: ${res.monthsImported} month(s) imported.`);
      await loadSources();
      if (u.grade === grade) await loadUnit();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to upload the document.');
    }
  };

  if (!canManage) {
    return <Alert severity="warning">You don't have permission to manage programme content.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Spoken English — Manage Content</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2, maxWidth: 560 }}>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Class</InputLabel>
            <Select label="Class" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {grades.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Card sx={{ mb: 3, maxWidth: 900 }}>
          <CardContent>
            {!unitId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No unit for {grade} / {month} yet — filling this in will create it.
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Theme / Title" fullWidth size="small" value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Programme Focus" fullWidth size="small" value={form.programmeFocus}
                  onChange={(e) => setForm((f) => ({ ...f, programmeFocus: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status" value={form.workflowStatus}
                    onChange={(e) => setForm((f) => ({ ...f, workflowStatus: e.target.value }))}
                  >
                    {statuses.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Focus Skills</InputLabel>
                  <Select
                    multiple label="Focus Skills" value={form.focusSkillIds}
                    onChange={(e) => setForm((f) => ({ ...f, focusSkillIds: e.target.value }))}
                    input={<OutlinedInput label="Focus Skills" />}
                    renderValue={(ids) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {ids.map((id) => <Chip key={id} label={skillName(id)} size="small" />)}
                      </Box>
                    )}
                  >
                    {skills.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              {fieldTypes.map((ft) => (
                <TextField
                  key={ft.code}
                  label={`${ft.code} · ${ft.name}`}
                  fullWidth multiline minRows={2}
                  value={form.fields[ft.code] || ''}
                  onChange={(e) => setField(ft.code, e.target.value)}
                />
              ))}
            </Stack>

            <Box sx={{ mt: 3 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : unitId ? 'Save changes' : 'Create unit'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>Source documents</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        The original Word file per class. Re-uploading a file <b>replaces all of that class's content</b>.
      </Typography>
      <Card sx={{ maxWidth: 900 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Version</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.length === 0 ? (
                <TableRow><TableCell colSpan={4}>No source documents stored yet.</TableCell></TableRow>
              ) : (
                sources.map((d) => (
                  <TableRow key={d.uuid}>
                    <TableCell>{d.grade}</TableCell>
                    <TableCell>{d.fileName || '—'}</TableCell>
                    <TableCell>v{d.version}</TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<DownloadIcon />} onClick={() => doDownload(d.grade)}>
                        Download
                      </Button>
                      <Button size="small" startIcon={<UploadFileIcon />} onClick={() => onPickFile(d.grade)}>
                        Replace
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <input
        ref={fileInputRef} type="file" hidden
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFileChosen}
      />

      <Dialog open={Boolean(upload)} onClose={() => setUpload(null)}>
        <DialogTitle>Replace content for Class {upload?.grade}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This re-parses <b>{upload?.fileName}</b> and <b>overwrites all monthly content</b> for
            Class {upload?.grade} for the selected academic year. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpload(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={confirmUpload}>Replace</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
