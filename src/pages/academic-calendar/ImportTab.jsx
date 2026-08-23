import React, { useRef, useState } from 'react';
import {
  Card, CardContent, Box, Stack, Typography, Button, Alert, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Checkbox, FormControlLabel,
} from '@mui/material';
import { UploadFile as UploadIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { activityCalendarService } from '../../services/activityCalendarService';
import { fmtDate } from '../../utils/date';

const readBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]); // strip data: prefix
  r.onerror = reject;
  r.readAsDataURL(file);
});

// Upload a monthly-sheet workbook -> preview the diff (columns matched by header name,
// holidays derived from (H)/(RH)) -> apply. Nothing is written until Apply.
export default function ImportTab({ academicYearId, canManage, onApplied }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const [includeAA, setIncludeAA] = useState(false);
  const [replace, setReplace] = useState(false);

  const pick = async (f) => {
    if (!f) return;
    setFile(f); setPreview(null); setDone(null); setErr(''); setBusy(true);
    try {
      const fileBase64 = await readBase64(f);
      const res = await activityCalendarService.importPreview({ fileBase64, academicYearId, includeAcademicActivities: includeAA, fileName: f.name });
      setPreview(res);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Could not read that file — is it a valid .xlsx?');
    } finally { setBusy(false); }
  };

  const apply = async () => {
    setBusy(true); setErr('');
    try {
      const fileBase64 = await readBase64(file);
      const res = await activityCalendarService.importApply({ fileBase64, academicYearId, includeAcademicActivities: includeAA, replace, fileName: file.name });
      setDone(res); setPreview(null); setFile(null);
      await onApplied?.();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Import failed');
    } finally { setBusy(false); }
  };

  const stat = (n, l, color) => (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, minWidth: 120 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>{n}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</Typography>
    </Box>
  );

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Upload the monthly-sheet workbook (one sheet per month). Columns are matched by <b>header name</b>, so it's fine if columns move between sheets. Holidays are auto-detected from the <b>(H)</b> / <b>(RH)</b> markers in the Festivals column. Nothing is saved until you review and click Apply.
      </Alert>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {done && <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }} onClose={() => setDone(null)}>Imported {done.entriesWritten} entries and {done.holidaysWritten} holidays.</Alert>}

      <Card>
        <CardContent>
          <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <Box onClick={() => canManage && inputRef.current?.click()}
            sx={{ border: '2px dashed', borderColor: 'primary.light', borderRadius: 2, bgcolor: '#f7faff', p: 4, textAlign: 'center', cursor: canManage ? 'pointer' : 'default' }}>
            <UploadIcon color="primary" sx={{ fontSize: 38 }} />
            <Typography sx={{ fontWeight: 600, mt: 1 }}>{file ? file.name : 'Click to choose an .xlsx workbook'}</Typography>
            <Typography variant="body2" color="text.secondary">one sheet per month · up to 10&nbsp;MB</Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
            <FormControlLabel control={<Checkbox size="small" checked={includeAA} onChange={(e) => setIncludeAA(e.target.checked)} />} label="Include an 'Academic Activities' column" />
            <FormControlLabel control={<Checkbox size="small" checked={replace} onChange={(e) => setReplace(e.target.checked)} />} label="Replace this year's calendar first" />
          </Stack>

          {busy && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}

          {preview && !busy && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Preview of changes <Typography component="span" variant="body2" color="text.secondary">· {preview.fileName} · {preview.dates} dates</Typography></Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mb: 2 }}>
                {stat(preview.added, 'Entries added', 'success.main')}
                {stat(preview.changed, 'Changed', 'warning.main')}
                {stat(preview.removed, 'Removed', 'error.main')}
                {stat(`${preview.holidaysFull + preview.holidaysRestricted}`, `Holidays (${preview.holidaysFull} full · ${preview.holidaysRestricted} rh)`, 'text.primary')}
                {stat(preview.skipped, 'Rows skipped', 'text.secondary')}
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell><TableCell>Column</TableCell><TableCell>Value</TableCell><TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(preview.sample || []).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{fmtDate(r.date)}</TableCell>
                        <TableCell>{r.typeName}</TableCell>
                        <TableCell>{r.value}{r.detail ? <Typography component="span" variant="caption" color="text.secondary"> · {r.detail}</Typography> : null}</TableCell>
                        <TableCell align="right"><Chip size="small" label={r.change} color={r.change === 'remove' ? 'error' : r.change === 'update' ? 'warning' : 'success'} variant="outlined" /></TableCell>
                      </TableRow>
                    ))}
                    {preview.added + preview.changed + preview.removed > (preview.sample || []).length && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>…{preview.added + preview.changed + preview.removed - (preview.sample || []).length} more rows</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button onClick={() => { setPreview(null); setFile(null); }}>Cancel</Button>
                <Button variant="contained" onClick={apply} disabled={busy}>Apply {preview.added + preview.changed + preview.removed} changes</Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
