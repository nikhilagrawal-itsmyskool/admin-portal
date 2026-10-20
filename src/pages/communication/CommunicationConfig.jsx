import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Alert, CircularProgress, Button, Chip, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControlLabel, Switch, Stack, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, CheckCircle, RadioButtonUnchecked, WarningAmber } from '@mui/icons-material';
import { communicationService } from '../../services/communicationService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const CHANNELS = [
  { key: 'inApp', label: 'In-app' },
  { key: 'sms', label: 'SMS' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'studentPref', label: 'Student pref' },
];

// Warn when a channel is enabled but can't actually deliver (no template authored).
function deliveryWarning(t) {
  if (t.sms && !t.smsTemplate) return 'SMS is on but no SMS template exists for this template key.';
  if (t.whatsapp && !t.whatsappTemplate) return 'WhatsApp is on but no WhatsApp template exists.';
  if (t.studentPref && !t.smsTemplate && !t.whatsappTemplate) return 'Student preference is on but no SMS/WhatsApp template exists — nothing will send externally.';
  if (!t.inApp && !t.sms && !t.whatsapp && !t.studentPref) return 'No channels enabled — nothing will be sent.';
  return null;
}

// God-only message-type registry (communication.config.manage). Create types explicitly,
// pick each one's template + channels. A module event only sends if its key is registered here.
export default function CommunicationConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.COMMUNICATION_CONFIG_MANAGE);

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [dialog, setDialog] = useState(null); // { mode: 'create'|'edit', type }

  const load = useCallback(async () => {
    try {
      const { types: rows } = await communicationService.getMessagePolicies();
      setTypes(rows || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load message types');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (canManage) load(); else setLoading(false); }, [canManage, load]);

  const groups = useMemo(() => {
    const order = []; const by = {};
    for (const t of types) { if (!by[t.group]) { by[t.group] = []; order.push(t.group); } by[t.group].push(t); }
    return order.map((g) => ({ group: g, rows: by[g] }));
  }, [types]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!canManage) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" fontWeight={800}>Communication Config</Typography>
        <Alert severity="info" sx={{ mt: 2 }}>This screen is restricted. Ask a god admin to grant access.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Message Types</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 760 }}>
            Each type is a logical message a module sends (its <b>key</b>), mapped to a <b>template</b> and
            the <b>channels</b> that fire. &quot;Student preference&quot; uses each parent&apos;s own SMS/WhatsApp
            setting; recipients are deduped per channel. A module event only sends if its key is registered
            here. OTP and security messages are always SMS and not managed here.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ mode: 'create', type: null })}>
          New message type
        </Button>
      </Box>

      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}

      <Paper variant="outlined" sx={{ mt: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Message type</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>Template</TableCell>
              {CHANNELS.map((c) => <TableCell key={c.key} align="center" sx={{ fontWeight: 700 }}>{c.label}</TableCell>)}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(({ group, rows }) => (
              <React.Fragment key={group}>
                <TableRow>
                  <TableCell colSpan={3 + CHANNELS.length} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{group}</Typography>
                  </TableCell>
                </TableRow>
                {rows.map((t) => {
                  const warn = deliveryWarning(t);
                  return (
                    <TableRow key={t.key} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{t.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{t.key}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 0.5 }}>{t.templateKey}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Chip size="small" variant="outlined" color={t.smsTemplate ? 'success' : 'default'} label={`SMS ${t.smsTemplate ? '✓' : '—'}`} />
                          <Chip size="small" variant="outlined" color={t.whatsappTemplate ? 'success' : 'default'} label={`WA ${t.whatsappTemplate ? '✓' : '—'}`} />
                        </Stack>
                      </TableCell>
                      {CHANNELS.map((c) => (
                        <TableCell key={c.key} align="center">
                          {t[c.key] ? <CheckCircle fontSize="small" color="success" /> : <RadioButtonUnchecked fontSize="small" sx={{ color: 'action.disabled' }} />}
                        </TableCell>
                      ))}
                      <TableCell align="right">
                        {warn && <Tooltip title={warn}><WarningAmber fontSize="small" color="warning" sx={{ verticalAlign: 'middle', mr: 0.5 }} /></Tooltip>}
                        <IconButton size="small" onClick={() => setDialog({ mode: 'edit', type: t })}><EditIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <TypeDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onSaved={(rows) => { setTypes(rows); setDialog(null); }}
      />
    </Box>
  );
}

function TypeDialog({ state, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!state) { setForm(null); return; }
    setErr('');
    if (state.mode === 'edit') {
      const t = state.type;
      setForm({ key: t.key, label: t.label, group: t.group, templateKey: t.templateKey, inApp: t.inApp, sms: t.sms, whatsapp: t.whatsapp, studentPref: t.studentPref });
    } else {
      setForm({ key: '', label: '', group: 'General', templateKey: '', inApp: true, sms: false, whatsapp: false, studentPref: true });
    }
  }, [state]);

  if (!state || !form) return null;
  const isEdit = state.mode === 'edit';
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const payload = {
        label: form.label.trim() || form.key.trim(),
        group: form.group.trim() || 'General',
        templateKey: (form.templateKey.trim() || form.key.trim()),
        inApp: form.inApp, sms: form.sms, whatsapp: form.whatsapp, studentPref: form.studentPref,
      };
      const res = isEdit
        ? await communicationService.updateMessagePolicy(form.key, payload)
        : await communicationService.createMessageType({ key: form.key.trim(), ...payload });
      onSaved(res.types || []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit message type' : 'New message type'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Key" value={form.key} onChange={(e) => set('key', e.target.value)}
            disabled={isEdit} fullWidth size="small"
            helperText={isEdit ? 'The id modules emit (fixed)' : 'The id modules emit, e.g. fee_receipt — must match the code'}
            InputProps={{ sx: { fontFamily: 'monospace' } }}
          />
          <TextField label="Label" value={form.label} onChange={(e) => set('label', e.target.value)} fullWidth size="small" />
          <TextField label="Group" value={form.group} onChange={(e) => set('group', e.target.value)} fullWidth size="small" />
          <TextField
            label="Template key" value={form.templateKey} onChange={(e) => set('templateKey', e.target.value)}
            fullWidth size="small" helperText="SMS/WhatsApp template to send on — defaults to the key"
            InputProps={{ sx: { fontFamily: 'monospace' } }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>Channels</Typography>
            {CHANNELS.map((c) => (
              <FormControlLabel key={c.key} control={<Switch checked={!!form[c.key]} onChange={(e) => set(c.key, e.target.checked)} />} label={c.label} sx={{ display: 'block' }} />
            ))}
          </Box>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || (!isEdit && !form.key.trim())}>
          {busy ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
