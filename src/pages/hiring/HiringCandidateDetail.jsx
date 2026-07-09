import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  MenuItem,
  Alert,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Link,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  UploadFile as UploadIcon,
  Delete as DeleteIcon,
  Description as ResumeIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { hiringService } from '../../services/hiringService';
import { useCan } from '../../permissions/can';

const STATUS_COLORS = {
  applied: 'default',
  screening: 'info',
  interview: 'info',
  demo: 'info',
  final_round: 'warning',
  selected: 'success',
  rejected: 'error',
  on_hold: 'warning',
  withdrawn: 'default',
};

const toMap = (arr) =>
  (arr || []).reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const fmtMoney = (n) =>
  n == null ? '-' : `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

// Read a File into raw base64 (no data: prefix), matching the backend contract.
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function HiringCandidateDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const can = useCan();
  const canManage = can('hiring.manage');

  const [candidate, setCandidate] = useState(null);
  const [lookups, setLookups] = useState({
    stageTypes: [],
    stageOutcomes: [],
    finalDecisions: [],
    positionTypes: [],
    subjects: [],
    statuses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Per-stage editable drafts, keyed by stageType.
  const [stageDrafts, setStageDrafts] = useState({});
  const [savingStage, setSavingStage] = useState('');

  // Final review draft.
  const [review, setReview] = useState({
    finalComments: '',
    salaryRequested: '',
    salaryOffered: '',
    finalDecision: '',
  });
  const [savingReview, setSavingReview] = useState(false);

  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingKind, setUploadingKind] = useState('');

  const positionLabels = toMap(lookups.positionTypes);
  const subjectLabels = toMap(lookups.subjects);
  const statusLabels = toMap(lookups.statuses);
  const stageTypeLabels = toMap(lookups.stageTypes);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, lk] = await Promise.all([
        hiringService.getCandidateById(id),
        hiringService.getLookups(),
      ]);
      setCandidate(data);
      setLookups(lk);

      // Seed stage drafts from existing stages, in canonical order.
      const drafts = {};
      (lk.stageTypes || []).forEach((st) => {
        const existing = (data.stages || []).find((s) => s.stageType === st.value);
        drafts[st.value] = existing
          ? {
              uuid: existing.uuid,
              scheduledDate: existing.scheduledDate ? existing.scheduledDate.split('T')[0] : '',
              outcome: existing.outcome || 'pending',
              comments: existing.comments || '',
            }
          : { uuid: null, scheduledDate: '', outcome: 'pending', comments: '' };
      });
      setStageDrafts(drafts);

      setReview({
        finalComments: data.finalComments || '',
        salaryRequested: data.salaryRequested ?? '',
        salaryOffered: data.salaryOffered ?? '',
        finalDecision: data.finalDecision || '',
      });

      if (data.photoFileId) {
        try {
          const f = await hiringService.getFile(data.photoFileId);
          setPhotoUrl(`data:${f.mimeType};base64,${f.data}`);
        } catch {
          setPhotoUrl('');
        }
      } else {
        setPhotoUrl('');
      }
    } catch {
      setError('Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };

  const setStageField = (stageType, field, value) => {
    setStageDrafts((prev) => ({
      ...prev,
      [stageType]: { ...prev[stageType], [field]: value },
    }));
  };

  const saveStage = async (stageType) => {
    const draft = stageDrafts[stageType];
    setSavingStage(stageType);
    setError('');
    try {
      const payload = {
        scheduledDate: draft.scheduledDate || undefined,
        outcome: draft.outcome,
        comments: draft.comments || undefined,
      };
      if (draft.uuid) {
        await hiringService.updateStage(id, draft.uuid, payload);
      } else {
        await hiringService.addStage(id, { stageType, ...payload });
      }
      await load();
      flash('Stage saved');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save stage');
    } finally {
      setSavingStage('');
    }
  };

  const deleteStage = async (stageType) => {
    const draft = stageDrafts[stageType];
    if (!draft?.uuid) return;
    setSavingStage(stageType);
    try {
      await hiringService.deleteStage(id, draft.uuid);
      await load();
      flash('Stage cleared');
    } catch {
      setError('Failed to clear stage');
    } finally {
      setSavingStage('');
    }
  };

  const saveReview = async () => {
    setSavingReview(true);
    setError('');
    try {
      await hiringService.updateCandidate(id, {
        finalComments: review.finalComments || undefined,
        salaryRequested: review.salaryRequested === '' ? null : parseFloat(review.salaryRequested),
        salaryOffered: review.salaryOffered === '' ? null : parseFloat(review.salaryOffered),
        finalDecision: review.finalDecision || null,
      });
      await load();
      flash('Final review saved');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleUpload = async (kind, file) => {
    if (!file) return;
    setUploadingKind(kind);
    setError('');
    try {
      const base64Data = await fileToBase64(file);
      await hiringService.uploadFile(id, {
        kind,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });
      await load();
      flash(`${kind === 'photo' ? 'Photo' : 'Resume'} uploaded`);
    } catch (err) {
      setError(err.response?.data?.error?.description || `Failed to upload ${kind}`);
    } finally {
      setUploadingKind('');
    }
  };

  const handleDeleteFile = async (kind) => {
    setUploadingKind(kind);
    try {
      await hiringService.deleteFile(id, kind);
      await load();
      flash(`${kind === 'photo' ? 'Photo' : 'Resume'} removed`);
    } catch {
      setError(`Failed to remove ${kind}`);
    } finally {
      setUploadingKind('');
    }
  };

  const openResume = async () => {
    try {
      const f = await hiringService.getFile(candidate.resumeFileId);
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="data:${f.mimeType};base64,${f.data}" style="width:100%;height:100%;border:0"></iframe>`
        );
      }
    } catch {
      setError('Failed to open resume');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!candidate) {
    return <Alert severity="error">Candidate not found.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/hiring')}>
            Back
          </Button>
          <Typography variant="h4">{candidate.name}</Typography>
          <Chip
            label={statusLabels[candidate.status] || candidate.status}
            color={STATUS_COLORS[candidate.status] || 'default'}
          />
        </Box>
        {canManage && (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/hiring/${id}/edit`)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Edit Details
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Candidate profile */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                src={photoUrl || undefined}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2, fontSize: 40 }}
              >
                {candidate.name?.[0]?.toUpperCase()}
              </Avatar>
              {canManage && (
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                  <Button
                    component="label"
                    size="small"
                    startIcon={<UploadIcon />}
                    disabled={uploadingKind === 'photo'}
                  >
                    {candidate.photoFileId ? 'Change Photo' : 'Add Photo'}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUpload('photo', e.target.files?.[0])}
                    />
                  </Button>
                  {candidate.photoFileId && (
                    <Button size="small" color="error" onClick={() => handleDeleteFile('photo')}>
                      Remove
                    </Button>
                  )}
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Detail label="Position" value={positionLabels[candidate.positionType] || candidate.positionType} />
                <Detail label="Subject" value={subjectLabels[candidate.subject] || candidate.subject || '-'} />
                <Detail label="Father's / Husband's Name" value={candidate.fatherHusbandName || '-'} />
                <Detail label="Mobile" value={candidate.mobile || '-'} />
                <Detail label="Email" value={candidate.email || '-'} />
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Resume */}
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Resume
                </Typography>
                {candidate.resumeFileId ? (
                  <Link component="button" onClick={openResume} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ResumeIcon fontSize="small" /> View resume
                  </Link>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No resume uploaded
                  </Typography>
                )}
                {canManage && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      component="label"
                      size="small"
                      startIcon={<UploadIcon />}
                      disabled={uploadingKind === 'resume'}
                    >
                      {candidate.resumeFileId ? 'Replace' : 'Upload'}
                      <input
                        hidden
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => handleUpload('resume', e.target.files?.[0])}
                      />
                    </Button>
                    {candidate.resumeFileId && (
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteFile('resume')}>
                        Remove
                      </Button>
                    )}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pipeline + final review */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {(lookups.stageTypes || []).map((st) => {
              const draft = stageDrafts[st.value] || { outcome: 'pending' };
              return (
                <Card key={st.value}>
                  <CardHeader
                    title={stageTypeLabels[st.value] || st.value}
                    titleTypographyProps={{ variant: 'h6' }}
                    action={
                      draft.uuid ? (
                        <Chip
                          size="small"
                          label={toMap(lookups.stageOutcomes)[draft.outcome] || draft.outcome}
                        />
                      ) : (
                        <Chip size="small" variant="outlined" label="Not started" />
                      )
                    }
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Date"
                          type="date"
                          value={draft.scheduledDate || ''}
                          onChange={(e) => setStageField(st.value, 'scheduledDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          disabled={!canManage}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          select
                          size="small"
                          label="Outcome / Result"
                          value={draft.outcome || 'pending'}
                          onChange={(e) => setStageField(st.value, 'outcome', e.target.value)}
                          disabled={!canManage}
                        >
                          {lookups.stageOutcomes.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Comments"
                          multiline
                          rows={2}
                          value={draft.comments || ''}
                          onChange={(e) => setStageField(st.value, 'comments', e.target.value)}
                          disabled={!canManage}
                        />
                      </Grid>
                      {canManage && (
                        <Grid item xs={12}>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<SaveIcon />}
                              onClick={() => saveStage(st.value)}
                              disabled={savingStage === st.value}
                            >
                              {savingStage === st.value ? 'Saving...' : draft.uuid ? 'Update' : 'Save'}
                            </Button>
                            {draft.uuid && (
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => deleteStage(st.value)}
                                disabled={savingStage === st.value}
                              >
                                Clear
                              </Button>
                            )}
                          </Stack>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              );
            })}

            {/* Final review */}
            <Card>
              <CardHeader title="Final Review" titleTypographyProps={{ variant: 'h6' }} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Final Review Comments"
                      multiline
                      rows={3}
                      value={review.finalComments}
                      onChange={(e) => setReview((p) => ({ ...p, finalComments: e.target.value }))}
                      disabled={!canManage}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Salary Requested (₹)"
                      type="number"
                      value={review.salaryRequested}
                      onChange={(e) => setReview((p) => ({ ...p, salaryRequested: e.target.value }))}
                      disabled={!canManage}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Salary Offered (₹)"
                      type="number"
                      value={review.salaryOffered}
                      onChange={(e) => setReview((p) => ({ ...p, salaryOffered: e.target.value }))}
                      disabled={!canManage}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      size="small"
                      label="Final Decision"
                      value={review.finalDecision}
                      onChange={(e) => setReview((p) => ({ ...p, finalDecision: e.target.value }))}
                      disabled={!canManage}
                    >
                      <MenuItem value="">Pending</MenuItem>
                      {lookups.finalDecisions.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  {canManage && (
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={saveReview}
                        disabled={savingReview}
                      >
                        {savingReview ? 'Saving...' : 'Save Final Review'}
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function Detail({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}
