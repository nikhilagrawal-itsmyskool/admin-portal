import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  Table, TableHead, TableRow, TableCell, TableBody,
  Stepper, Step, StepLabel, FormGroup, FormControlLabel, Checkbox, Divider, IconButton,
} from '@mui/material';
import { Add as AddIcon, AttachFile as AttachIcon, UploadFile as UploadIcon, Close as CloseIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { APP_STATUS_COLOR, thisMonth } from './LeaveShared';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate, todayIso } from '../../utils/date';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmployeeSearchDialog from '../../components/common/EmployeeSearchDialog';
import { useNavigate } from 'react-router-dom';

function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function readDoc(file) {
  return { fileName: file.name, mimeType: file.type, base64Data: await readFileB64(file) };
}

const dateRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);
const HALF_LABEL = { first_half: '½ day (1st half)', second_half: '½ day (2nd half)' };
function daysLabel(a) {
  if (a.dayPortion === 'first_half' || a.dayPortion === 'second_half') return HALF_LABEL[a.dayPortion];
  if (a.workingDays == null) return '—';
  return `${a.workingDays} day${a.workingDays === 1 ? '' : 's'}`;
}

const DUTY_OPTIONS = ['Van / Bus Duty', 'House Duty', 'Morning Assembly', 'Floor Duty', 'Gate Duty', 'Club / Activity'];
const blankDetails = { leaveTypeCode: '', fromDate: todayIso(), toDate: todayIso(), reason: '', dayPortion: 'full' };
const blankHandover = { topics: [], lessonPlan: '', otherDuties: { duties: [], covering: '', note: '' }, lessonPlanFiles: [], worksheetFiles: [] };

export default function MyLeave() {
  const isMobile = useIsMobile();
  const [types, setTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...blankDetails });
  const [file, setFile] = useState(null); // medical certificate
  const [preview, setPreview] = useState(null); // { isTeaching, affected, topics }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [handover, setHandover] = useState({ ...blankHandover });
  const [busy, setBusy] = useState(false);
  const [pickerIdx, setPickerIdx] = useState(null); // which topic card is choosing a covering teacher
  const [covering, setCovering] = useState([]); // classes I've been asked to cover
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [t, s, a, c] = await Promise.all([leaveService.myTypes(), leaveService.mySummary(thisMonth()), leaveService.myApplications(), leaveService.covering().catch(() => [])]);
      setTypes(t || []); setSummary(s); setApps(a || []); setCovering(c || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load your leave');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectedType = types.find((t) => t.code === form.leaveTypeCode);
  const singleDay = form.fromDate === form.toDate;
  const canHalf = singleDay && !!selectedType?.allowHalfDay;

  const resetApply = () => { setStep(0); setForm({ ...blankDetails }); setFile(null); setPreview(null); setHandover({ ...blankHandover }); };
  const openApply = () => { resetApply(); setError(''); setOpen(true); };

  // Step 1 → fetch the handover preview (affected periods + suggested topics), then go to the
  // handover step (teaching staff) or straight to review.
  const goNext = async () => {
    if (!form.leaveTypeCode) { setError('Choose a leave type'); return; }
    if (form.toDate < form.fromDate) { setError('To date cannot be before From date'); return; }
    setPreviewLoading(true); setError('');
    try {
      const p = await leaveService.handoverPreview(form.fromDate, form.toDate);
      setPreview(p);
      setHandover((h) => ({ ...h, topics: (p.topics || []).map((t) => ({ ...t })) }));
      setStep(p.isTeaching ? 1 : 2);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not load your schedule');
    } finally { setPreviewLoading(false); }
  };

  const handoverValid = () => {
    if (!preview?.isTeaching) return true;
    if (handover.topics.some((t) => !t.topic || !t.topic.trim())) { setError('Enter the current chapter/topic for every affected class'); return false; }
    const hasPlan = handover.lessonPlan.trim() || handover.lessonPlanFiles.length;
    if (!hasPlan) { setError('Provide a lesson plan (type it or attach a file)'); return false; }
    const d = handover.otherDuties;
    if (!d.duties.length && !d.covering.trim() && !d.note.trim()) { setError("Declare your other duties (tick any that apply, or note 'none')"); return false; }
    setError(''); return true;
  };

  const submit = async () => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const payload = { leaveTypeCode: form.leaveTypeCode, fromDate: form.fromDate, toDate: form.toDate, dayPortion: canHalf ? form.dayPortion : 'full', reason: form.reason.trim() || undefined };
      if (file) payload.attachment = { fileName: file.name, mimeType: file.type, base64Data: await readFileB64(file) };
      if (preview?.isTeaching) {
        payload.handover = {
          topics: handover.topics,
          lessonPlan: handover.lessonPlan.trim() || undefined,
          lessonPlanFiles: handover.lessonPlanFiles,
          otherDuties: handover.otherDuties,
          worksheetFiles: handover.worksheetFiles,
          affected: preview.affected,
        };
      }
      const res = await leaveService.apply(payload);
      setOpen(false); resetApply();
      setSuccess(res?.warnings?.length ? `Request submitted. Note: ${res.warnings.join(' ')}` : 'Leave request submitted');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to submit');
    } finally { setBusy(false); }
  };

  const doCancel = async () => {
    setBusy(true); setError('');
    try { await leaveService.cancel(cancelTarget.uuid); setCancelTarget(null); setSuccess('Leave cancelled'); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to cancel'); setCancelTarget(null); }
    finally { setBusy(false); }
  };
  const canCancel = (a) => a.status === 'pending' || (a.status === 'approved' && a.fromDate > todayIso());

  const setDuty = (label, on) => setHandover((h) => ({
    ...h, otherDuties: { ...h.otherDuties, duties: on ? [...h.otherDuties.duties, label] : h.otherDuties.duties.filter((x) => x !== label) },
  }));
  const addWorksheet = async (f) => { if (!f) return; const doc = await readDoc(f); setHandover((h) => ({ ...h, worksheetFiles: [...h.worksheetFiles, doc] })); };
  const addLessonPlan = async (f) => { if (!f) return; const doc = await readDoc(f); setHandover((h) => ({ ...h, lessonPlanFiles: [...h.lessonPlanFiles, doc] })); };

  const activeStep = preview?.isTeaching ? step : (step === 0 ? 0 : 1);

  return (
    <Box sx={{ maxWidth: 1040 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">My Leave</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openApply}>Apply for leave</Button>
      </Box>

      {error && !open && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {summary && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Leave balance{summary.academicYearStart ? ` · ${summary.academicYearStart.slice(0, 4)}–${summary.academicYearEnd.slice(2, 4)}` : ''}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`${summary.pending} pending`} color="warning" variant="outlined" />
                    <Chip size="small" label={`${summary.approved} approved`} color="success" variant="outlined" />
                  </Stack>
                </Box>
                <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', gap: 2.5 }}>
                  {(summary.quotas || []).map((q) => (
                    <Box key={q.code}>
                      <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: q.remaining === 0 ? '#e5396b' : '#222b45', fontVariantNumeric: 'tabular-nums' }}>
                        {q.remaining}<Typography component="span" sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 600 }}> / {q.quota}</Typography>
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{q.name} left</Typography>
                    </Box>
                  ))}
                  {(!summary.quotas || summary.quotas.length === 0) && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No quota-limited leave types configured.</Typography>}
                </Stack>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1.5 }}>Allocations are per academic year and lapse on 31 March.</Typography>
              </CardContent>
            </Card>
          )}

          {covering.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Classes you're covering</Typography>
              <Stack spacing={1}>
                {covering.map((c) => (
                  <Card key={c.applicationId} variant="outlined" sx={{ borderColor: '#cfe0ff', cursor: 'pointer' }} onClick={() => navigate(`/leave/covering/${c.applicationId}`)}>
                    <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{(c.myClasses || []).map((t) => t.className).filter(Boolean).join(', ') || 'Class'} <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>· for {c.applicantName || 'a colleague'}</Typography></Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{dateRange(c.fromDate, c.toDate)} · tap to see the lesson plan & worksheets</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>My requests</Typography>
          {apps.length === 0 ? (
            <Alert severity="info">No leave requests yet. Use "Apply for leave" above.</Alert>
          ) : isMobile ? (
            <Stack spacing={1.25}>
              {apps.map((a) => (
                <Card key={a.uuid} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{a.leaveTypeName || a.leaveTypeCode}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{dateRange(a.fromDate, a.toDate)} · {daysLabel(a)}{a.hasAttachment ? ' · 📎' : ''}</Typography>
                        {a.reason && <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{a.reason}</Typography>}
                        {a.status === 'rejected' && a.decisionNote && <Typography sx={{ fontSize: 12, color: '#c42a56' }}>“{a.decisionNote}”</Typography>}
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Chip size="small" label={a.status} color={APP_STATUS_COLOR[a.status] || 'default'} sx={{ textTransform: 'capitalize', fontWeight: 700 }} />
                        {canCancel(a) && <Button size="small" color="inherit" onClick={() => setCancelTarget(a)} sx={{ minWidth: 0, fontSize: 12 }}>Cancel</Button>}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Type', 'Dates', 'Days', 'Reason', 'Status', ''].map((c, i) => (
                      <TableCell key={c || i} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.map((a) => (
                    <TableRow key={a.uuid} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{a.leaveTypeName || a.leaveTypeCode}{a.hasAttachment ? ' 📎' : ''}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateRange(a.fromDate, a.toDate)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{daysLabel(a)}</TableCell>
                      <TableCell sx={{ maxWidth: 320, color: 'text.secondary' }}>
                        {a.reason || '—'}
                        {a.status === 'rejected' && a.decisionNote && <Typography component="span" sx={{ display: 'block', fontSize: 12, color: '#c42a56' }}>“{a.decisionNote}”</Typography>}
                      </TableCell>
                      <TableCell><Chip size="small" label={a.status} color={APP_STATUS_COLOR[a.status] || 'default'} sx={{ textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                      <TableCell align="right">{canCancel(a) && <Button size="small" color="inherit" onClick={() => setCancelTarget(a)} sx={{ minWidth: 0, fontSize: 12 }}>Cancel</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Apply — stepper: Details → Handover → Review */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Apply for leave</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            <Step><StepLabel>Leave details</StepLabel></Step>
            {preview?.isTeaching && <Step><StepLabel>Academic handover</StepLabel></Step>}
            <Step><StepLabel>Review</StepLabel></Step>
          </Stepper>
          {error && open && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {step === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField select fullWidth size="small" label="Leave type" value={form.leaveTypeCode}
                  onChange={(e) => setForm((f) => ({ ...f, leaveTypeCode: e.target.value }))}>
                  {types.map((t) => <MenuItem key={t.code} value={t.code}>{t.name} ({t.code})</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}><TextField fullWidth type="date" size="small" label="From" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><TextField fullWidth type="date" size="small" label="To" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
              {canHalf && (
                <Grid item xs={12}>
                  <TextField select fullWidth size="small" label="Duration" value={form.dayPortion} onChange={(e) => setForm((f) => ({ ...f, dayPortion: e.target.value }))}
                    helperText="Half-day is available for Casual Leave and Leave Without Pay only, on a single day.">
                    <MenuItem value="full">Full day</MenuItem>
                    <MenuItem value="first_half">Half day — first half (morning)</MenuItem>
                    <MenuItem value="second_half">Half day — second half (afternoon)</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12}><TextField fullWidth size="small" label="Reason" multiline minRows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></Grid>
              <Grid item xs={12}>
                <Button component="label" variant="outlined" startIcon={<AttachIcon />} fullWidth>
                  {file ? file.name : (selectedType?.requiresAttachment ? 'Attach certificate (required)' : 'Attach document (optional)')}
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </Button>
              </Grid>
            </Grid>
          )}

          {step === 1 && preview?.isTeaching && (
            <Stack spacing={2.5}>
              <Alert severity="info" sx={{ py: 0.5 }}>Before you apply, hand over your classes so a colleague can cover. Topics are pre-filled from the syllabus where available — please check them.</Alert>

              {(preview.affected || []).some((d) => d.periods.length > 0) ? (
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Periods you'll miss</Typography>
                  <Stack spacing={0.75}>
                    {preview.affected.filter((d) => d.periods.length).map((d) => (
                      <Box key={d.date}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{fmtDate(d.date)}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                          {d.periods.map((p, i) => (
                            <Chip key={i} size="small" variant="outlined"
                              label={`${p.seq ? `P${p.seq} ` : ''}${p.className || '—'}${p.subjectName ? ` · ${p.subjectName}` : ''}`} />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ py: 0.5 }}>No timetabled periods were found for these dates. Add your lesson plan and duties below.</Alert>
              )}

              {handover.topics.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Current chapter / topic per class</Typography>
                  <Stack spacing={1.5}>
                    {handover.topics.map((t, idx) => (
                      <Card key={idx} variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{t.className || '—'}{t.subjectName ? ` · ${t.subjectName}` : ''}{t.chapter ? <Chip size="small" label={`Ch: ${t.chapter}`} sx={{ ml: 1, height: 20 }} /> : null}</Typography>
                        <TextField fullWidth size="small" sx={{ mt: 1 }} label="Current topic (required)" value={t.topic}
                          onChange={(e) => setHandover((h) => ({ ...h, topics: h.topics.map((x, i) => i === idx ? { ...x, topic: e.target.value } : x) }))} />
                        <TextField fullWidth size="small" sx={{ mt: 1 }} label="Substitution instructions (optional)" value={t.substitution || ''}
                          onChange={(e) => setHandover((h) => ({ ...h, topics: h.topics.map((x, i) => i === idx ? { ...x, substitution: e.target.value } : x) }))} />
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Covering teacher:</Typography>
                          {t.substituteName
                            ? <Chip size="small" color="primary" variant="outlined" label={t.substituteName}
                                onDelete={() => setHandover((h) => ({ ...h, topics: h.topics.map((x, i) => i === idx ? { ...x, substituteId: undefined, substituteName: undefined } : x) }))} />
                            : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>none</Typography>}
                          <Button size="small" variant="text" onClick={() => setPickerIdx(idx)}>{t.substituteName ? 'Change' : 'Assign'}</Button>
                        </Stack>
                      </CardContent></Card>
                    ))}
                  </Stack>
                </Box>
              )}

              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Lesson plan for the leave days (required)</Typography>
                <TextField fullWidth size="small" multiline minRows={3} label="Type the plan…" value={handover.lessonPlan} onChange={(e) => setHandover((h) => ({ ...h, lessonPlan: e.target.value }))} />
                <Button component="label" size="small" variant="outlined" startIcon={<UploadIcon />} sx={{ mt: 1 }}>
                  Add lesson-plan file
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { addLessonPlan(e.target.files?.[0]); e.target.value = ''; }} />
                </Button>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  {handover.lessonPlanFiles.map((p, i) => (
                    <Chip key={i} label={p.fileName} onDelete={() => setHandover((h) => ({ ...h, lessonPlanFiles: h.lessonPlanFiles.filter((_, x) => x !== i) }))} />
                  ))}
                </Stack>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>Type an overall plan and/or attach one file per class/period — add as many as you need.</Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Assignments / worksheets (optional)</Typography>
                <Button component="label" size="small" variant="outlined" startIcon={<UploadIcon />}>
                  Add file
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { addWorksheet(e.target.files?.[0]); e.target.value = ''; }} />
                </Button>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  {handover.worksheetFiles.map((w, i) => (
                    <Chip key={i} label={w.fileName} onDelete={() => setHandover((h) => ({ ...h, worksheetFiles: h.worksheetFiles.filter((_, x) => x !== i) }))} />
                  ))}
                </Stack>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>Add one per class/period as needed.</Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Other duties (required — tick any that apply)</Typography>
                <FormGroup row>
                  {DUTY_OPTIONS.map((d) => (
                    <FormControlLabel key={d} control={<Checkbox size="small" checked={handover.otherDuties.duties.includes(d)} onChange={(e) => setDuty(d, e.target.checked)} />} label={<span style={{ fontSize: 13 }}>{d}</span>} />
                  ))}
                </FormGroup>
                <TextField fullWidth size="small" sx={{ mt: 1 }} label="Who will cover these duties?" value={handover.otherDuties.covering}
                  onChange={(e) => setHandover((h) => ({ ...h, otherDuties: { ...h.otherDuties, covering: e.target.value } }))} />
                <TextField fullWidth size="small" sx={{ mt: 1 }} label="Notes (or 'none')" value={handover.otherDuties.note}
                  onChange={(e) => setHandover((h) => ({ ...h, otherDuties: { ...h.otherDuties, note: e.target.value } }))} />
              </Box>
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#222b45' }}>Review</Typography>
              <Row k="Type" v={selectedType?.name || form.leaveTypeCode} />
              <Row k="Dates" v={dateRange(form.fromDate, form.toDate)} />
              <Row k="Duration" v={canHalf && form.dayPortion !== 'full' ? HALF_LABEL[form.dayPortion] : 'Full day(s)'} />
              {form.reason && <Row k="Reason" v={form.reason} />}
              {file && <Row k="Certificate" v={file.name} />}
              {preview?.isTeaching && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Row k="Handover" v={`${handover.topics.length} class${handover.topics.length === 1 ? '' : 'es'} · lesson plan ${handover.lessonPlan.trim() || handover.lessonPlanFiles.length ? '✓' : '—'}${handover.lessonPlanFiles.length ? ` (${handover.lessonPlanFiles.length} file${handover.lessonPlanFiles.length === 1 ? '' : 's'})` : ''} · ${handover.worksheetFiles.length} worksheet(s)`} />
                  <Row k="Other duties" v={handover.otherDuties.duties.join(', ') || handover.otherDuties.note || 'none'} />
                </>
              )}
              <Alert severity="info" sx={{ mt: 1 }}>Submitting sends this to the Director for approval; it counts against your balance once approved.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {step > 0 && <Button onClick={() => setStep(preview?.isTeaching ? step - 1 : 0)} disabled={busy}>Back</Button>}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          {step === 0 && <Button variant="contained" onClick={goNext} disabled={previewLoading}>{previewLoading ? 'Loading…' : 'Next'}</Button>}
          {step === 1 && <Button variant="contained" onClick={() => { if (handoverValid()) setStep(2); }}>Next</Button>}
          {step === 2 && <Button variant="contained" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</Button>}
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(cancelTarget)} title="Cancel this leave request?" message="The request will be withdrawn. You can apply again if needed."
        confirmLabel="Cancel leave" confirmColor="error" onConfirm={doCancel} onCancel={() => setCancelTarget(null)} loading={busy} />

      <EmployeeSearchDialog open={pickerIdx !== null} onClose={() => setPickerIdx(null)}
        onSelect={(emp) => setHandover((h) => ({ ...h, topics: h.topics.map((x, i) => i === pickerIdx ? { ...x, substituteId: emp.uuid, substituteName: emp.name } : x) }))} />
    </Box>
  );
}

function Row({ k, v }) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', minWidth: 110 }}>{k}</Typography>
      <Typography sx={{ fontSize: 12.5, color: '#2e3a59', flex: 1 }}>{v}</Typography>
    </Box>
  );
}
