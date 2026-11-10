import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { suppliesService } from '../../services/suppliesService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

export default function SuppliesConfig() {
  const can = useCan();
  const canManage = can(ACTIONS.SUPPLIES_INVENTORY_MANAGE);

  const [cfg, setCfg] = useState({ hideSeededItems: false });
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await suppliesService.getConfig();
        const next = { hideSeededItems: !!data.hideSeededItems };
        setCfg(next);
        setBaseline(JSON.stringify(next));
      } catch (err) {
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = JSON.stringify(cfg) !== baseline;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const data = await suppliesService.updateConfig({ hideSeededItems: cfg.hideSeededItems });
      const next = { hideSeededItems: !!data.hideSeededItems };
      setCfg(next);
      setBaseline(JSON.stringify(next));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Supplies Settings</Typography>

      {!canManage && (
        <Alert severity="info" sx={{ mb: 2 }}>You have read-only access to these settings.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {saved && !dirty && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Settings saved.</Alert>}

      <Card>
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={cfg.hideSeededItems}
                onChange={(e) => { setCfg({ ...cfg, hideSeededItems: e.target.checked }); setSaved(false); }}
                disabled={!canManage}
              />
            }
            label="Hide unused seeded items"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 0.5 }}>
            Hides the built-in starter catalog items you haven't stocked yet (zero stock) from
            the Inventory Items list, so you see only the items your school actually uses. Once
            you purchase or add opening stock for a seeded item, it reappears. You can always
            toggle "Show seeded items" on the Items list to see everything.
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={!canManage || !dirty || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
