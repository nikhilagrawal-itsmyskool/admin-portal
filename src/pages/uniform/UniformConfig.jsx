import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Button,
  Switch, FormControlLabel,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import uniformService from '../../services/uniformService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// Per-school uniform module settings. Gated on uniform.inventory.manage (admin +
// uniform-incharge), mirroring the module Config convention.
export default function UniformConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.UNIFORM_INVENTORY_MANAGE);

  const [c, setC] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const dirty = c && JSON.stringify(c) !== baseline;

  useEffect(() => {
    (async () => {
      try {
        const cfg = await uniformService.getConfig();
        setC(cfg);
        setBaseline(JSON.stringify(cfg));
      } catch (e) {
        setErr(e.response?.data?.error?.description || 'Failed to load config');
      } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const saved = await uniformService.updateConfig({ showSeededHints: c.showSeededHints });
      setC(saved);
      setBaseline(JSON.stringify(saved));
      setMsg('Uniform config saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save config');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Uniform Settings</Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>Preset suggestions</Typography>
          <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 2 }}>
            The “Add Item” name box suggests a built-in list of common uniform items. Turn this
            off to suggest only the items your school has already created.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={c?.showSeededHints ?? true}
                disabled={!canManage}
                onChange={(e) => { setC((p) => ({ ...p, showSeededHints: e.target.checked })); setMsg(''); }}
              />
            }
            label={`Show preset item suggestions${c?.showSeededHints ? '' : ' (off)'}`}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Button>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 3 }}>You don’t have permission to change uniform settings.</Alert>
      )}
    </Box>
  );
}
