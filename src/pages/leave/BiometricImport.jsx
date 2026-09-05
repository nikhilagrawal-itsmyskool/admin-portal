import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, Card, CardContent, Grid, TextField, Button, Chip, Stack,
  FormControlLabel, Checkbox, Autocomplete, Divider, CircularProgress,
} from '@mui/material';
import { UploadFile as UploadIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { employeeService } from '../../services/employeeService';
import { todayIso } from '../../utils/date';

function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function BiometricImport() {
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState({ codeHeader: 'Code', dateHeader: 'Date', inHeader: 'In', outHeader: 'Out', statusHeader: '' });
  const [coverageFrom, setCoverageFrom] = useState('');
  const [coverageTo, setCoverageTo] = useState(todayIso());
  const [inferAbsent, setInferAbsent] = useState(true);
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
    if (!file) { setError('Choose a file'); return; }
    if (!mapping.codeHeader || !mapping.dateHeader) { setError('Code and Date column headers are required'); return; }
    if (!coverageFrom || !coverageTo) { setError('Coverage period is required'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const base64Data = await readFileB64(file);
      const res = await leaveService.importBiometric({
        fileName: file.name, base64Data, mapping, coverageFrom, coverageTo, inferAbsent,
      });
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
      setResult((r) => ({ ...r, unmatchedCodes: (r.unmatchedCodes || []).filter((c) => c !== code) }));
      loadMap();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to map');
    }
  };

  return (
    <Box sx={{ maxWidth: 820 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Biometric Import</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Upload the device's Excel export and tell us which columns hold the enrollment code, date and punch times.
            Within the coverage period, mapped staff with no punch on a working day are marked absent.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Button component="label" variant="outlined" startIcon={<UploadIcon />} fullWidth>
                {file ? file.name : 'Choose Excel file'}
                <input hidden type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
            </Grid>
            <Grid item xs={6} md={4}><TextField type="date" size="small" fullWidth label="Coverage from" value={coverageFrom} onChange={(e) => setCoverageFrom(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6} md={4}><TextField type="date" size="small" fullWidth label="Coverage to" value={coverageTo} onChange={(e) => setCoverageTo(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>

            <Grid item xs={6} md={2.4}><TextField size="small" fullWidth label="Code column" value={mapping.codeHeader} onChange={(e) => setMapping((m) => ({ ...m, codeHeader: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2.4}><TextField size="small" fullWidth label="Date column" value={mapping.dateHeader} onChange={(e) => setMapping((m) => ({ ...m, dateHeader: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2.4}><TextField size="small" fullWidth label="In column" value={mapping.inHeader} onChange={(e) => setMapping((m) => ({ ...m, inHeader: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2.4}><TextField size="small" fullWidth label="Out column" value={mapping.outHeader} onChange={(e) => setMapping((m) => ({ ...m, outHeader: e.target.value }))} /></Grid>
            <Grid item xs={6} md={2.4}><TextField size="small" fullWidth label="Status column (opt.)" value={mapping.statusHeader} onChange={(e) => setMapping((m) => ({ ...m, statusHeader: e.target.value }))} /></Grid>

            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={inferAbsent} onChange={(e) => setInferAbsent(e.target.checked)} />}
                label="Mark non-punching staff absent within the coverage period" />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={doImport} disabled={busy}>{busy ? 'Importing…' : 'Import'}</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {result && (
        <Card sx={{ mb: 3 }} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip color="success" label={`${result.matchedRows} rows matched`} />
              <Chip label={`${result.daysCreated} days written`} />
              {result.unmatchedCodes?.length > 0 && <Chip color="warning" label={`${result.unmatchedCodes.length} unmatched codes`} />}
              {result.suspectDates?.length > 0 && <Chip color="warning" label={`${result.suspectDates.length} device-down days`} />}
            </Stack>
            {result.suspectDates?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>Too few punches on {result.suspectDates.join(', ')} — those days are held as "device down", not marked absent.</Alert>
            )}
            {result.unmatchedCodes?.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Map unmatched codes to staff</Typography>
                <Stack spacing={1}>
                  {result.unmatchedCodes.map((code) => (
                    <Box key={code} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip label={code} sx={{ fontFamily: 'monospace' }} />
                      <Autocomplete
                        sx={{ minWidth: 240, flex: 1 }} options={empOptions}
                        getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                        onInputChange={(_, v) => searchEmp(v)}
                        onChange={(_, v) => mapCode(code, v)}
                        renderInput={(params) => <TextField {...params} size="small" label="Assign to…" />}
                      />
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Enrollment map</Typography>
      {loadingMap ? <CircularProgress size={22} /> : existingMap.length === 0 ? (
        <Alert severity="info">No enrollment codes mapped yet. Import a file and map the unmatched codes above.</Alert>
      ) : (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {existingMap.map((m) => (
            <Chip key={m.enrollCode} label={`${m.enrollCode} → ${m.employeeName || m.employeeId}`} variant="outlined" />
          ))}
        </Stack>
      )}
    </Box>
  );
}
