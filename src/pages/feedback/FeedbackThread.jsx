import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Alert, Chip, CircularProgress, Stack, Avatar,
  TextField, IconButton, Divider, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, AttachFile as AttachIcon, AlternateEmail as MentionIcon,
  Send as SendIcon, Close as CloseIcon, InsertDriveFile as FileIcon, CheckCircle as CompleteIcon,
  Cancel as CancelIcon, Replay as ReopenIcon, SwapHoriz as ReassignIcon,
} from '@mui/icons-material';
import {
  feedbackService, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL, EVENT_META,
  ATTACH_ACCEPT, ATTACH_MAX_BYTES, filesToAttachments,
} from '../../services/feedbackService';
import { useAuth } from '../../context/AuthContext';
import { useCan } from '../../permissions/can';
import { fmtDate, fmtDateTime } from '../../utils/date';
import EmployeeSearchDialog from '../../components/common/EmployeeSearchDialog';

const initials = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

export default function FeedbackThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const can = useCan();
  const isReviewer = can('feedback.review');
  const api = isReviewer
    ? { get: feedbackService.getById, comment: feedbackService.comment, assign: feedbackService.assign, seen: feedbackService.seen, attachment: feedbackService.attachment }
    : { get: feedbackService.getMine, comment: feedbackService.commentMine, assign: feedbackService.assignMine, seen: feedbackService.seenMine, attachment: feedbackService.attachmentMine };

  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Composer state.
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState([]); // [{uuid,name}]
  const [files, setFiles] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const load = useCallback(async (markSeen = false) => {
    setError('');
    try {
      const data = await api.get(id);
      setThread(data);
      if (markSeen) api.seen(id).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not open this feedback');
    } finally {
      setLoading(false);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(true); }, [load]);
  useEffect(() => { if (thread && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [thread?.events?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = thread && user?.employeeId && thread.assignedTo === user.employeeId;
  const canReassign = thread?.status === 'open' && (isReviewer || isOwner);

  const clearComposer = () => { setBody(''); setMentions([]); setFiles([]); };

  const addFiles = (list) => {
    const picked = Array.from(list || []);
    const ok = picked.filter((f) => {
      if (f.size > ATTACH_MAX_BYTES) { setError(`${f.name} is too large (max 8 MB)`); return false; }
      return true;
    });
    setFiles((xs) => [...xs, ...ok]);
  };

  const buildPayload = async (extra = {}) => ({
    body: body.trim() || undefined,
    mentions: mentions.length ? mentions.map((m) => m.uuid) : undefined,
    attachments: files.length ? await filesToAttachments(files) : undefined,
    ...extra,
  });

  const doComment = async () => {
    if (!body.trim() && files.length === 0) { setError('Write a comment or attach a file'); return; }
    setBusy(true); setError('');
    try {
      const updated = await api.comment(id, await buildPayload());
      setThread(updated); clearComposer();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add comment');
    } finally { setBusy(false); }
  };

  const doReassign = async (target) => {
    setReassignOpen(false);
    if (!isReviewer && !body.trim()) { setError('Add a comment before reassigning'); return; }
    setBusy(true); setError('');
    try {
      const updated = await api.assign(id, await buildPayload({ toEmployeeId: target.uuid }));
      setThread(updated); clearComposer();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to reassign');
    } finally { setBusy(false); }
  };

  const doReview = async (kind) => {
    setBusy(true); setError('');
    try {
      const note = body.trim() || undefined;
      let updated;
      if (kind === 'complete') updated = await feedbackService.complete(id, note);
      else if (kind === 'cancel') updated = await feedbackService.cancel(id, note);
      else updated = await feedbackService.reopen(id, { note });
      setThread(updated); clearComposer();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Action failed');
    } finally { setBusy(false); }
  };

  const openFile = async (fileId, fileName) => {
    try {
      const att = await api.attachment(fileId);
      if (att?.dataUri) {
        const w = window.open('', '_blank');
        if (w) w.document.write(`<title>${fileName || 'File'}</title><iframe src="${att.dataUri}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not open file');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!thread) return (
    <Box sx={{ maxWidth: 760 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
      <Alert severity="error">{error || 'Feedback not found'}</Alert>
    </Box>
  );

  const recordEvent = thread.events.find((e) => e.eventType === 'record');
  const evidence = recordEvent?.attachments || [];

  return (
    <Box sx={{ maxWidth: 760, pb: 2 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 1.5 }}>Back</Button>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Pinned header */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 17 }}>
                {thread.studentName || 'Student'}{thread.className ? ` · ${thread.className}` : ''}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                {thread.categoryName || 'Feedback'}{thread.visitDate ? ` · visit ${fmtDate(thread.visitDate)}` : ''}
                {thread.admissionNumber ? ` · Adm #${thread.admissionNumber}` : ''}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.5}>
              <Chip size="small" label={FEEDBACK_STATUS_LABEL[thread.status] || thread.status}
                color={FEEDBACK_STATUS_COLOR[thread.status] || 'default'} sx={{ fontWeight: 700 }} />
              {thread.status === 'open' && thread.awaitingDirector && (
                <Chip size="small" variant="outlined" color="primary" label="Awaiting director" />
              )}
            </Stack>
          </Box>

          <Typography sx={{ fontSize: 14.5, mt: 1.5, whiteSpace: 'pre-wrap' }}>{thread.feedbackText}</Typography>

          {evidence.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {evidence.map((a) => (
                <Chip key={a.fileId} icon={<FileIcon />} label={a.fileName || 'file'} variant="outlined"
                  onClick={() => openFile(a.fileId, a.fileName)} clickable size="small" />
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              Recorded by <b>{thread.recordedByName || 'office'}</b>
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              Owner <b>{thread.assignedToName || '—'}</b>{isOwner ? ' (you)' : ''}
            </Typography>
            {thread.closedByName && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Closed by <b>{thread.closedByName}</b>{thread.closedAt ? ` · ${fmtDateTime(thread.closedAt)}` : ''}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>TIMELINE</Typography>
      <Stack spacing={1.25}>
        {thread.events.map((e) => {
          const meta = EVENT_META[e.eventType] || { label: e.eventType, color: '#888' };
          return (
            <Card key={e.uuid} variant="outlined">
              <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: meta.color }}>{initials(e.actorName)}</Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{e.actorName || 'Someone'}</Typography>
                      <Chip size="small" label={meta.label} sx={{ height: 18, fontSize: 10.5, bgcolor: `${meta.color}22`, color: meta.color, fontWeight: 700 }} />
                      {e.eventType === 'assign' && e.toAssigneeName && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>→ <b>{e.toAssigneeName}</b></Typography>
                      )}
                      {e.eventType === 'reopen' && e.toAssigneeName && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>→ <b>{e.toAssigneeName}</b></Typography>
                      )}
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 'auto' }}>{e.createdAt ? fmtDateTime(e.createdAt) : ''}</Typography>
                    </Box>
                    {e.body && <Typography sx={{ fontSize: 13.5, mt: 0.5, whiteSpace: 'pre-wrap' }}>{e.body}</Typography>}
                    {e.mentions?.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {e.mentions.map((m) => <Chip key={m.id} size="small" icon={<MentionIcon sx={{ fontSize: 14 }} />} label={m.name || 'someone'} sx={{ height: 20, fontSize: 11 }} />)}
                      </Stack>
                    )}
                    {e.attachments?.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                        {e.attachments.map((a) => (
                          <Chip key={a.fileId} icon={<FileIcon />} label={a.fileName || 'file'} variant="outlined"
                            onClick={() => openFile(a.fileId, a.fileName)} clickable size="small" />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
        <div ref={bottomRef} />
      </Stack>

      {/* Composer */}
      <Card variant="outlined" sx={{ mt: 2, position: 'sticky', bottom: 8 }}>
        <CardContent sx={{ py: 1.5 }}>
          {mentions.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {mentions.map((m) => (
                <Chip key={m.uuid} size="small" icon={<MentionIcon sx={{ fontSize: 14 }} />} label={m.name}
                  onDelete={() => setMentions((xs) => xs.filter((x) => x.uuid !== m.uuid))} />
              ))}
            </Stack>
          )}
          <TextField fullWidth size="small" multiline minRows={2} placeholder="Write a comment…"
            value={body} onChange={(e) => setBody(e.target.value)} />
          {files.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {files.map((f, i) => (
                <Chip key={i} icon={<FileIcon />} label={f.name} size="small"
                  onDelete={() => setFiles((xs) => xs.filter((_, j) => j !== i))} />
              ))}
            </Stack>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Tooltip title="Attach files">
              <IconButton size="small" onClick={() => fileRef.current?.click()}><AttachIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Mention someone">
              <IconButton size="small" onClick={() => setMentionOpen(true)}><MentionIcon /></IconButton>
            </Tooltip>
            <input ref={fileRef} hidden type="file" multiple accept={ATTACH_ACCEPT}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <Box sx={{ flex: 1 }} />
            {canReassign && (
              <Button size="small" startIcon={<ReassignIcon />} onClick={() => setReassignOpen(true)} disabled={busy}>Reassign</Button>
            )}
            {isReviewer && thread.status === 'open' && (
              <>
                <Button size="small" color="warning" startIcon={<CancelIcon />} onClick={() => doReview('cancel')} disabled={busy}>Cancel</Button>
                <Button size="small" variant="contained" color="success" startIcon={<CompleteIcon />} onClick={() => doReview('complete')} disabled={busy}>Complete</Button>
              </>
            )}
            {isReviewer && thread.status !== 'open' && (
              <Button size="small" color="warning" startIcon={<ReopenIcon />} onClick={() => doReview('reopen')} disabled={busy}>Reopen</Button>
            )}
            <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={doComment} disabled={busy}>Comment</Button>
          </Box>
          {canReassign && !isReviewer && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
              A comment is required when you reassign.
            </Typography>
          )}
        </CardContent>
      </Card>

      <EmployeeSearchDialog open={mentionOpen} onClose={() => setMentionOpen(false)}
        onSelect={(e) => { setMentions((xs) => (xs.some((x) => x.uuid === e.uuid) ? xs : [...xs, { uuid: e.uuid, name: e.name }])); setMentionOpen(false); }} />
      <EmployeeSearchDialog open={reassignOpen} onClose={() => setReassignOpen(false)} onSelect={doReassign} />
    </Box>
  );
}
