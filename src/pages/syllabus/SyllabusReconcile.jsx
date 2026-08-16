import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, Chip, Alert, CircularProgress, Divider, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions, ToggleButton, ToggleButtonGroup,
  MenuItem, TextField, Stack, LinearProgress,
} from '@mui/material';
import {
  UploadFile as UploadIcon, Download as DownloadIcon, ArrowForward as ArrowIcon,
  Warning as WarnIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon, History as HistoryIcon,
} from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import { fmtDateTime } from '../../utils/date';

// ── shared file helpers ───────────────────────────────────────────────────────
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ''));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export function downloadBase64(fileName, mimeType, base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k += 1) bytes[k] = bin.charCodeAt(k);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType || 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName || 'download';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// A compact one-line description of an entry (old or new side).
const entryLabel = (e) => {
  if (!e) return '—';
  const chap = e.parentTitle ? `${e.parentTitle} › ` : '';
  const no = e.topicNo ? `${e.topicNo} ` : '';
  const comp = e.component ? `{${e.component}} ` : '';
  return `${chap}${comp}${no}${e.title}`;
};

// ── the reconcile dialog ──────────────────────────────────────────────────────
export default function ReconcileDialog({ syllabusId, open, onClose, onApplied }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  // decisions: proposalChoice[oldId] = 'keep' | 'different'; removedChoice[oldId] = 'remove' | <newTmp>
  const [proposalChoice, setProposalChoice] = useState({});
  const [removedChoice, setRemovedChoice] = useState({});
  const [showKept, setShowKept] = useState(false);
  const [showAdded, setShowAdded] = useState(false);

  const reset = () => {
    setFile(null); setPreview(null); setError(''); setNote('');
    setProposalChoice({}); setRemovedChoice({}); setShowKept(false); setShowAdded(false);
  };
  const close = () => { if (!applying) { reset(); onClose(); } };

  const pick = async (f) => {
    if (!f) return;
    setFile(f); setError(''); setPreview(null); setBusy(true);
    try {
      const base64Data = await fileToBase64(f);
      const p = await syllabusService.reconcilePreview(syllabusId, { fileName: f.name, base64Data });
      setPreview(p);
      // default no-risk proposals to "keep the suggestion"; risky ones stay undecided
      const pc = {};
      (p.proposals || []).forEach((pr) => { if (!(pr.old?.markCount > 0)) pc[pr.oldId] = 'keep'; });
      setProposalChoice(pc);
      setRemovedChoice({});
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not read this document');
    } finally {
      setBusy(false);
    }
  };

  // Attention items = anything that would drop teacher marks without a decision.
  const riskyProposals = (preview?.proposals || []).filter((p) => p.old?.markCount > 0);
  const riskyRemoved = (preview?.removed || []).filter((r) => r.markCount > 0);
  const unresolved =
    riskyProposals.filter((p) => !proposalChoice[p.oldId]).length +
    riskyRemoved.filter((r) => !removedChoice[r.oldId]).length;

  const buildDecisions = () => {
    const d = [];
    (preview.proposals || []).forEach((p) => {
      const choice = proposalChoice[p.oldId] || (p.old?.markCount > 0 ? null : 'keep');
      if (choice === 'keep') d.push({ kind: 'map', oldId: p.oldId, newTmp: p.newTmp });
      else if (choice === 'different') { d.push({ kind: 'remove', oldId: p.oldId }); d.push({ kind: 'new', newTmp: p.newTmp }); }
    });
    riskyRemoved.forEach((r) => {
      const choice = removedChoice[r.oldId];
      if (choice === 'remove') d.push({ kind: 'remove', oldId: r.oldId });
      else if (typeof choice === 'number') d.push({ kind: 'map', oldId: r.oldId, newTmp: choice });
    });
    return d;
  };

  const apply = async () => {
    setApplying(true); setError('');
    try {
      const res = await syllabusService.reconcileApply(syllabusId, {
        fileName: file.name, base64Data: await fileToBase64(file), decisions: buildDecisions(), note: note.trim() || undefined,
      });
      reset();
      onApplied(res);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  const c = preview?.counts;
  const changedKept = (preview?.kept || []).filter((k) => (k.changes || []).length > 0);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Update this plan from a revised document</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Upload */}
        {!preview && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <input ref={fileInput} type="file" accept=".docx" hidden
              onChange={(e) => pick(e.target.files?.[0])} />
            <Button variant="outlined" size="large" startIcon={busy ? <CircularProgress size={18} /> : <UploadIcon />}
              disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? 'Reading…' : 'Choose revised .docx'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              We match it against the current entries and show you exactly what changes. Nothing is saved until you review and apply.
            </Typography>
          </Box>
        )}

        {preview && (
          <>
            {/* sanity check */}
            {preview.sanity && !preview.sanity.ok && (
              <Alert severity="warning" icon={<WarnIcon />} sx={{ mb: 2 }}>{preview.sanity.warning}</Alert>
            )}

            {/* summary */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip label={`${c.total} in document`} />
              <Chip color="success" variant="outlined" label={`${c.kept} kept`} />
              <Chip color="info" variant="outlined" label={`${c.added} new`} />
              <Chip color="warning" variant="outlined" label={`${c.removed} removed`} />
              {(c.removedWithMarks > 0 || riskyProposals.length > 0) && (
                <Chip color="error" label={`${unresolved} need you`} />
              )}
              {c.changed > 0 && <Chip variant="outlined" label={`${c.changed} field changes`} />}
            </Stack>

            {/* Needs your attention */}
            {(riskyProposals.length > 0 || riskyRemoved.length > 0) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="error">Needs your attention</Typography>
                {riskyProposals.map((p) => (
                  <Box key={p.oldId} sx={{ border: '1px solid', borderColor: 'divider', borderLeft: '3px solid', borderLeftColor: 'primary.main', borderRadius: 1, p: 1.5, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{entryLabel(p.old)}</Typography>
                      <Chip size="small" color="error" label={`${p.old.markCount} marked`} />
                      <ArrowIcon fontSize="small" color="disabled" />
                      <Typography variant="body2">{entryLabel(p.new)}</Typography>
                      <Chip size="small" variant="outlined" label={`${Math.round((p.confidence || 0) * 100)}%`} />
                    </Box>
                    <ToggleButtonGroup size="small" exclusive sx={{ mt: 1 }}
                      value={proposalChoice[p.oldId] || null}
                      onChange={(_e, v) => v && setProposalChoice((s) => ({ ...s, [p.oldId]: v }))}>
                      <ToggleButton value="keep" color="success">Same — keep the marks</ToggleButton>
                      <ToggleButton value="different" color="error">Different — new, remove old</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                ))}
                {riskyRemoved.map((r) => (
                  <Box key={r.oldId} sx={{ border: '1px solid', borderColor: 'error.light', borderLeft: '3px solid', borderLeftColor: 'error.main', borderRadius: 1, p: 1.5, mb: 1, bgcolor: 'error.lighter' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{entryLabel(r.old)}</Typography>
                      <Chip size="small" color="error" label={`removing drops ${r.markCount} marks`} />
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap" useFlexGap>
                      <ToggleButtonGroup size="small" exclusive
                        value={removedChoice[r.oldId] === 'remove' ? 'remove' : null}
                        onChange={(_e, v) => setRemovedChoice((s) => ({ ...s, [r.oldId]: v || undefined }))}>
                        <ToggleButton value="remove" color="error">Confirm removal</ToggleButton>
                      </ToggleButtonGroup>
                      <TextField select size="small" label="…or map to a new entry" sx={{ minWidth: 260 }}
                        value={typeof removedChoice[r.oldId] === 'number' ? removedChoice[r.oldId] : ''}
                        onChange={(e) => setRemovedChoice((s) => ({ ...s, [r.oldId]: Number(e.target.value) }))}>
                        {(preview.added || []).map((a) => (
                          <MenuItem key={a.newTmp} value={a.newTmp}>{entryLabel(a.new)}</MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}

            {/* changed (matched) */}
            {changedKept.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Button size="small" onClick={() => setShowKept((v) => !v)} startIcon={showKept ? <CollapseIcon /> : <ExpandIcon />}>
                  {changedKept.length} matched with field changes
                </Button>
                <Collapse in={showKept}>
                  {changedKept.map((k) => (
                    <Box key={k.oldId} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', py: 0.5, pl: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{entryLabel(k.new)}</Typography>
                      {(k.changes || []).map((ch) => (
                        <Chip key={ch.field} size="small" variant="outlined"
                          label={`${ch.field}: ${ch.from ?? '∅'} → ${ch.to ?? '∅'}`} />
                      ))}
                    </Box>
                  ))}
                </Collapse>
              </Box>
            )}

            {/* new + non-risky removed */}
            {(preview.added || []).length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Button size="small" onClick={() => setShowAdded((v) => !v)} startIcon={showAdded ? <CollapseIcon /> : <ExpandIcon />}>
                  {preview.added.length} new in this document
                </Button>
                <Collapse in={showAdded}>
                  {preview.added.map((a) => (
                    <Typography key={a.newTmp} variant="body2" color="info.main" sx={{ pl: 1, py: 0.25 }}>+ {entryLabel(a.new)}</Typography>
                  ))}
                </Collapse>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <TextField fullWidth size="small" label="Note for the revision history (optional)"
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2026-27 minor page corrections" />
            {applying && <LinearProgress sx={{ mt: 2 }} />}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={applying}>Cancel</Button>
        {preview && (
          <Button variant="contained" onClick={apply}
            disabled={applying || unresolved > 0}>
            {applying ? 'Applying…' : unresolved > 0 ? `Resolve ${unresolved} to apply` : 'Apply changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── revisions strip (browse + download; restore is Phase B) ───────────────────
export function RevisionsDialog({ open, onClose, revisions, loading }) {
  const [err, setErr] = useState('');
  const download = async (rev) => {
    setErr('');
    try {
      const f = await syllabusService.getRevisionSource(rev.uuid);
      downloadBase64(f.fileName, f.mimeType, f.base64Data);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'No source document for this revision');
    }
  };
  const fmt = (d) => fmtDateTime(d) || d; // IST-pinned dd-mm-yyyy HH:MM (multiple revisions/day)
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Revision history <Typography component="span" variant="body2" color="text.secondary">· last {revisions?.length || 0}</Typography></DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {loading ? <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={22} /></Box>
          : (revisions || []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">No revisions yet. The first reconcile will snapshot the current plan here.</Typography>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={1}>
              {revisions.map((r) => (
                <Box key={r.uuid} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                  <Chip size="small" color="primary" label={`v${r.revNo}`} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{r.note || 'Reconcile'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmt(r.createdAt)}
                      {r.counts && ` · ${r.counts.kept ?? '?'} kept · ${r.counts.added ?? '?'} new · ${r.counts.removed ?? '?'} removed`}
                    </Typography>
                  </Box>
                  <Button size="small" startIcon={<DownloadIcon />} disabled={!r.sourceFileId} onClick={() => download(r)}>Word</Button>
                  <Button size="small" disabled title="Available in a later update">Restore</Button>
                </Box>
              ))}
            </Stack>
          )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

export { HistoryIcon };
