import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert,
  CircularProgress, Stack, Chip, IconButton, Divider,
} from '@mui/material';
import {
  Search as SearchIcon, PersonSearch as TeacherIcon, Add as AddIcon, DeleteOutline as DeleteIcon,
  AttachFile as AttachIcon, InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { feedbackService, filesToAttachments, ATTACH_ACCEPT, ATTACH_MAX_BYTES } from '../../services/feedbackService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { todayIso } from '../../utils/date';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../components/common/EmployeeSearchDialog';
import ConfirmDialog from '../../components/common/ConfirmDialog';

let BLOCK_KEY = 0;
const emptyBlock = () => ({ _k: ++BLOCK_KEY, categoryId: '', feedbackText: '', teacher: null, files: [] });

export default function RecordFeedback() {
  const { academicYearId } = useAcademicYear();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [student, setStudent] = useState(null);
  const [visitDate, setVisitDate] = useState(todayIso());
  const [blocks, setBlocks] = useState([emptyBlock()]);

  const [studentOpen, setStudentOpen] = useState(false);
  const [teacherFor, setTeacherFor] = useState(null); // block _k the teacher dialog is open for
  const [confirmClear, setConfirmClear] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        setCategories((await feedbackService.categories()) || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchBlock = (k, patch) => setBlocks((bs) => bs.map((b) => (b._k === k ? { ...b, ...patch } : b)));
  const addBlock = () => setBlocks((bs) => [...bs, emptyBlock()]);
  const removeBlock = (k) => setBlocks((bs) => (bs.length > 1 ? bs.filter((b) => b._k !== k) : bs));
  const addFiles = (k, list) => {
    const picked = Array.from(list || []);
    if (picked.some((f) => f.size > ATTACH_MAX_BYTES)) setError('Some files were skipped — max 8 MB each.');
    const ok = picked.filter((f) => f.size <= ATTACH_MAX_BYTES);
    setBlocks((bs) => bs.map((b) => (b._k === k ? { ...b, files: [...b.files, ...ok] } : b)));
  };
  const removeFile = (k, idx) => setBlocks((bs) => bs.map((b) => (b._k === k ? { ...b, files: b.files.filter((_, i) => i !== idx) } : b)));

  const reset = () => { setStudent(null); setVisitDate(todayIso()); setBlocks([emptyBlock()]); setConfirmClear(false); };

  const submit = async () => {
    if (!student) { setError('Choose a student'); return; }
    if (!visitDate) { setError('Choose a visit date'); return; }
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.categoryId || !b.feedbackText.trim() || !b.teacher) {
        setError(`Complete feedback #${i + 1} — category, feedback and teacher are all required`);
        return;
      }
    }
    setBusy(true); setError(''); setSuccess('');
    let saved = 0;
    try {
      for (const b of blocks) {
        await feedbackService.record({
          studentId: student.uuid,
          classId: student.classId || student.class_id || undefined,
          academicYearId: academicYearId || undefined,
          visitDate: visitDate || undefined,
          categoryId: b.categoryId,
          feedbackText: b.feedbackText.trim(),
          assignedTo: b.teacher.uuid,
          attachments: b.files.length ? await filesToAttachments(b.files) : undefined,
        });
        saved += 1;
      }
      // Recording notifies the assigned teacher in-app (server-side, per ticket).
      setSuccess(`${saved} feedback${saved === 1 ? '' : 's'} recorded for ${student.name}.`);
      reset();
      if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      // Drop the blocks that already saved so a retry never double-records them.
      setBlocks((bs) => bs.slice(saved).length ? bs.slice(saved) : [emptyBlock()]);
      setError(`Saved ${saved} of ${blocks.length}. ${err.response?.data?.error?.description || 'The rest failed — fix and try again.'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760 }} ref={topRef}>
      <Typography variant="h4" sx={{ mb: 1 }}>Record Feedback</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
        Log the feedback collected on a home visit. Add a card for each point and assign it to a teacher.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Visit header — shared across all feedback cards */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={7}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>STUDENT</Typography>
                  {student ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip label={`${student.name}${student.className ? ` · ${student.className}` : ''}`} onDelete={() => setStudent(null)} />
                      {student.admissionNumber && <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Adm #{student.admissionNumber}</Typography>}
                    </Stack>
                  ) : (
                    <Button variant="outlined" startIcon={<SearchIcon />} onClick={() => setStudentOpen(true)}>Find student</Button>
                  )}
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth type="date" size="small" label="Visit date" value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Feedback cards */}
          <Stack spacing={1.5}>
            {blocks.map((b, i) => (
              <Card key={b._k} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>FEEDBACK #{i + 1}</Typography>
                    <IconButton size="small" onClick={() => removeBlock(b._k)} disabled={blocks.length === 1} aria-label="Delete feedback">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth size="small" label="Category" value={b.categoryId}
                        onChange={(e) => patchBlock(b._k, { categoryId: e.target.value })}>
                        {categories.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {b.teacher ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Assigned to</Typography>
                          <Chip color="primary" variant="outlined" label={b.teacher.name} onDelete={() => patchBlock(b._k, { teacher: null })} />
                        </Stack>
                      ) : (
                        <Button variant="outlined" size="small" startIcon={<TeacherIcon />} onClick={() => setTeacherFor(b._k)}>Choose teacher</Button>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth size="small" label="Feedback" multiline minRows={3} value={b.feedbackText}
                        onChange={(e) => patchBlock(b._k, { feedbackText: e.target.value })}
                        placeholder="What did the family share? What needs follow-up?" />
                    </Grid>
                    <Grid item xs={12}>
                      <Button component="label" size="small" startIcon={<AttachIcon />}>
                        Attach evidence
                        <input hidden type="file" multiple accept={ATTACH_ACCEPT}
                          onChange={(e) => { addFiles(b._k, e.target.files); e.target.value = ''; }} />
                      </Button>
                      {b.files.length > 0 && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {b.files.map((f, i) => (
                            <Chip key={i} icon={<FileIcon />} label={f.name} size="small" onDelete={() => removeFile(b._k, i)} />
                          ))}
                        </Stack>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Button startIcon={<AddIcon />} onClick={addBlock} sx={{ mt: 1.5 }}>Add another feedback</Button>

          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button color="inherit" onClick={() => setConfirmClear(true)} disabled={busy}>Clear</Button>
            <Button variant="contained" onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : `Record & assign${blocks.length > 1 ? ` (${blocks.length})` : ''}`}
            </Button>
          </Stack>
        </>
      )}

      <StudentSearchDialog open={studentOpen} onClose={() => setStudentOpen(false)} onSelect={(s) => setStudent(s)} />
      <EmployeeSearchDialog
        open={teacherFor !== null}
        onClose={() => setTeacherFor(null)}
        onSelect={(e) => { patchBlock(teacherFor, { teacher: e }); setTeacherFor(null); }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear this visit?"
        message="This removes the student, date and every feedback card. This cannot be undone."
        confirmLabel="Clear all"
        confirmColor="error"
        onConfirm={reset}
        onCancel={() => setConfirmClear(false)}
      />
    </Box>
  );
}
