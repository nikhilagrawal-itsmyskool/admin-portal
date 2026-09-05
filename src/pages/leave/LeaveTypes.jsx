import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Card, CardContent, Grid, Chip, Stack } from '@mui/material';
import { leaveService } from '../../services/leaveService';

const PAID_LABEL = { yes: 'Paid', no: 'Unpaid', discretionary: 'Discretionary' };

export default function LeaveTypes() {
  const [config, setConfig] = useState(null);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([leaveService.getConfig(), leaveService.getTypes()]);
        setConfig(c); setTypes(t || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load policy');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Leave Types &amp; Policy</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {config && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{config.clPerMonth}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>CL / month</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={4}>
                <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{config.dailyCap}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>CL / day (school)</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={4}>
                <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, textTransform: 'capitalize' }}>{config.reset}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>Reset</Typography>
                </CardContent></Card>
              </Grid>
            </Grid>
          )}

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Leave types</Typography>
          <Stack spacing={1}>
            {types.map((t) => (
              <Card key={t.code} variant="outlined">
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{t.name} <Typography component="span" sx={{ color: 'text.disabled', fontWeight: 600 }}>({t.code})</Typography></Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                      <Chip size="small" label={PAID_LABEL[t.paid] || t.paid}
                        color={t.paid === 'no' ? 'error' : t.paid === 'yes' ? 'success' : 'warning'} variant="outlined" />
                      {t.countsVsQuota && <Chip size="small" label="Counts vs CL quota" />}
                      {t.requiresAttachment && <Chip size="small" label="Needs document" />}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 2 }}>
            Policy is fixed in this version. Editing caps, quota and types from here is a later enhancement.
          </Typography>
        </>
      )}
    </Box>
  );
}
