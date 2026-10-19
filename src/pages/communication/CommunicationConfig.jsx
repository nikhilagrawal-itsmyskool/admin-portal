import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Alert, CircularProgress, Button, Checkbox,
  Table, TableHead, TableBody, TableRow, TableCell, Chip,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { communicationService } from '../../services/communicationService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const CHANNELS = [
  { key: 'inApp', label: 'In-app' },
  { key: 'sms', label: 'SMS' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'studentPref', label: 'Student preference' },
];

const sig = (t) => CHANNELS.map((c) => (t[c.key] ? '1' : '0')).join('');

// God-only (communication.config.manage). For each message type, pick the channels that
// fire — multiple allowed (e.g. In-app + Student preference). "Student preference" resolves
// each parent's own SMS/WhatsApp choice; senders dedupe so nobody gets the same message twice.
export default function CommunicationConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.COMMUNICATION_CONFIG_MANAGE);

  const [types, setTypes] = useState([]);
  const [baseline, setBaseline] = useState({}); // key -> signature at load/after-save
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const { types: rows } = await communicationService.getMessagePolicies();
      setTypes(rows || []);
      setBaseline(Object.fromEntries((rows || []).map((t) => [t.key, sig(t)])));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load config');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (canManage) load(); else setLoading(false); }, [canManage, load]);

  const dirty = useMemo(() => types.filter((t) => sig(t) !== baseline[t.key]), [types, baseline]);

  const toggle = (key, chKey) => {
    setMsg('');
    setTypes((ts) => ts.map((t) => (t.key === key ? { ...t, [chKey]: !t[chKey] } : t)));
  };

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      let last = null;
      for (const t of dirty) {
        last = await communicationService.updateMessagePolicy(t.key, {
          inApp: t.inApp, sms: t.sms, whatsapp: t.whatsapp, studentPref: t.studentPref,
        });
      }
      const rows = last?.types || types;
      setTypes(rows);
      setBaseline(Object.fromEntries(rows.map((t) => [t.key, sig(t)])));
      setMsg(`Saved ${dirty.length} message ${dirty.length === 1 ? 'type' : 'types'}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save config');
    } finally { setSaving(false); }
  };

  // Group rows by their `group` label, preserving catalog order.
  const groups = useMemo(() => {
    const order = [];
    const by = {};
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
          <Typography variant="h5" fontWeight={800}>Communication Config</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            For each message type, choose which channels fire. More than one may be on — e.g. a fee
            receipt as <b>In-app</b> + <b>Student preference</b>. &quot;Student preference&quot; uses each
            parent&apos;s own SMS/WhatsApp setting. Recipients are deduped per channel, so no one gets
            the same message twice. OTP and security messages are always SMS and not shown here.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || dirty.length === 0}>
          {saving ? 'Saving…' : dirty.length ? `Save (${dirty.length})` : 'Saved'}
        </Button>
      </Box>

      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}

      <Paper variant="outlined" sx={{ mt: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Message type</TableCell>
              {CHANNELS.map((c) => (
                <TableCell key={c.key} align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(({ group, rows }) => (
              <React.Fragment key={group}>
                <TableRow>
                  <TableCell colSpan={1 + CHANNELS.length} sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{group}</Typography>
                  </TableCell>
                </TableRow>
                {rows.map((t) => {
                  const none = !t.inApp && !t.sms && !t.whatsapp && !t.studentPref;
                  return (
                    <TableRow key={t.key} hover>
                      <TableCell>
                        {t.label}
                        {none && <Chip size="small" color="warning" variant="outlined" label="No channels — nothing sent" sx={{ ml: 1 }} />}
                      </TableCell>
                      {CHANNELS.map((c) => (
                        <TableCell key={c.key} align="center">
                          <Checkbox checked={!!t[c.key]} onChange={() => toggle(t.key, c.key)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
