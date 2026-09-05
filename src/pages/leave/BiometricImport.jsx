import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, Card, CardContent, Grid, Button, Chip, Stack, Divider,
  Autocomplete, TextField, CircularProgress,
} from '@mui/material';
import { UploadFile as UploadIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';

function readText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsText(file);
  });
}

export default function BiometricImport() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [empOptions, setEmpOptions] = useState([]);
  const [existingMap, setExistingMap] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);

  const loadMap = async () => {
    setLoadingMap(true);
    try { setExistingMap(await leaveService.listMap() || []); } catch { /* ignore */ }
    setLoadingMap(false);
  };
  useEffect(() => { loadMap(); }, []);

  const searchEmp = async (name) => {
    if (!name || name.length < 2) return;
    try {
      const res = await employeeService.searchEmployees({ name });
      const list = Array.isArray(res) ? res : (res?.employees || res?.data || []);
      setEmpOptions(list.map((e) => ({ uuid: e.uuid, name: e.name })));
    } catch { /* ignore */ }
  };

  const doImport = async () => {
    if (!file) { setError('Choose the TimeWatch report file first'); return; }
    setBusy(true); setError('');
    try {
      const text = await readText(file);
      const res = await leaveService.importTimewatch(text, file.name);
      setResult(res);
      loadMap();
    } catch (err) {
      setError(err.response?.data?.error?.description || err.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const mapCode = async (code, employee) => {
    if (!employee) return;
    try {
      await leaveService.mapEnroll(code, employee.uuid);
      setResult((r) => ({ ...r, unmatched: (r.unmatched || []).filter((u) => u.code !== code) }));
      loadMap();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to map');
    }
  };

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Biometric Import</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Upload the TimeWatch <b>Monthly Performance</b> report (the <code>.txt</code> file exported from the
            biometric software). The month and every day's status come straight from the report — staff are
            matched to the device codes automatically by name; map any leftovers below, then import again.
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={7}>
              <Button component="label" variant="outlined" startIcon={<UploadIcon />} fullWidth>
                {file ? file.name : 'Choose TimeWatch report (.txt)'}
                <input hidden type="file" accept=".txt,text/plain" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} />
              </Button>
            </Grid>
            <Grid item xs={12} sm={5}>
              <Button variant="contained" onClick={doImport} disabled={busy || !file} fullWidth>
                {busy ? 'Importing…' : (result ? 'Import again' : 'Import')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {result && (
        <Card sx={{ mb: 3 }} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {result.period?.from && <Chip color="primary" variant="outlined" label={`${result.period.from} → ${result.period.to}`} />}
              <Chip color="success" label={`${result.totalEmployees - (result.unmatched?.length || 0)} matched`} />
              {result.autoMapped?.length > 0 && <Chip label={`${result.autoMapped.length} auto-mapped by name`} />}
              <Chip label={`${result.daysWritten} day rows written`} />
              {result.unmatched?.length > 0 && <Chip color="warning" label={`${result.unmatched.length} unmatched`} />}
            </Stack>
            {result.unknownStatuses?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>Unrecognised status codes were skipped: {result.unknownStatuses.join(', ')}. Tell me and I'll map them.</Alert>
            )}

            {result.unmatched?.length > 0 ? (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Map the remaining device codes to staff</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                  The device name is shown — pick the matching employee, then press <b>Import again</b> to bring their attendance in.
                </Typography>
                <Stack spacing={1.25}>
                  {result.unmatched.map((u) => (
                    <Box key={u.code} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip label={`#${u.code}`} sx={{ fontFamily: 'monospace' }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 150 }}>{u.name}</Typography>
                      <Autocomplete
                        sx={{ minWidth: 240, flex: 1 }} options={empOptions}
                        getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                        onInputChange={(_, v) => searchEmp(v)}
                        onChange={(_, v) => mapCode(u.code, v)}
                        renderInput={(params) => <TextField {...params} size="small" label="Assign to employee…" />}
                      />
                    </Box>
                  ))}
                </Stack>
              </>
            ) : (
              <Alert severity="success">All device codes are mapped — attendance for {result.period?.from?.slice(0, 7)} is in.</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Enrollment map</Typography>
      {loadingMap ? <CircularProgress size={22} /> : existingMap.length === 0 ? (
        <Alert severity="info">No device codes mapped yet. Import a report — most map automatically by name.</Alert>
      ) : (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {existingMap.map((m) => (
            <Chip key={m.enrollCode} label={`#${m.enrollCode} → ${m.employeeName || m.employeeId}`} variant="outlined" />
          ))}
        </Stack>
      )}
    </Box>
  );
}
