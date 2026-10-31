import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, MenuItem,
  Button, Alert, Typography, FormControlLabel, Checkbox, Divider,
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { transferService, openTc } from '../../services/transferService';
import { fmtDate } from '../../utils/date';

export const EMPTY_TC = {
  applicationDate: '', status: 'applied', reasonForLeaving: '',
  srnNumber: '', tcNumber: '', bookNo: '', issueDate: '',
  result: '', failedInClass: 'no', subjectsStudied: '', qualifiedForPromotion: 'yes',
  duesPaidUpto: '', feeConcession: '', nccScoutGuide: '', gamesActivities: '',
  generalConduct: '', remarks: '', totalAttendanceDays: '', totalWorkingDays: '',
  motherName: '', fatherName: '', dob: '', nationality: '', category: '', firstAdmissionDate: '',
  overrideDues: false,
};

// Add the current value to a dropdown's options if it isn't listed (so an edited/legacy
// value never silently disappears).
const withCurrent = (opts, val) => {
  const a = Array.isArray(opts) ? [...opts] : [];
  if (val && !a.includes(val)) a.unshift(val);
  return a;
};

const dstr = (v) => (v ? String(v).slice(0, 10) : '');

// Apply/Update a Transfer Certificate. Self-contained: prefills derived identity + config
// defaults, auto-numbers SRN/TC, lets the operator fill/correct identity for sparse records,
// enforces the dues gate on issue, and prints an issued TC.
export default function TcDialog({ open, onClose, onSave, initial, studentId }) {
  const [t, setT] = useState(EMPTY_TC);
  const [baseline, setBaseline] = useState('');
  const [derived, setDerived] = useState(null);
  const [config, setConfig] = useState(null);
  const [dues, setDues] = useState(0);
  const [loading, setLoading] = useState(false);
  const dirty = JSON.stringify(t) !== baseline;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      let pf = null;
      try { pf = studentId ? await transferService.prefillTc(studentId) : null; } catch { pf = null; }
      if (!alive) return;
      const der = pf?.derived || null;
      setDerived(der);
      setConfig(pf?.config || null);
      setDues(pf?.duesOutstanding || 0);
      const sug = pf?.suggested || {};
      const pick = (field, sugKey) => (initial && initial[field] != null && initial[field] !== '' ? initial[field] : (sug[sugKey ?? field] ?? ''));
      // identity: stored override (edit) → derived → blank
      const idv = (storedKey, derivedKey, isDate) => {
        const stored = initial ? initial[storedKey] : null;
        const v = (stored != null && stored !== '') ? stored : ((der && der[derivedKey]) ?? '');
        return isDate ? dstr(v) : (v || '');
      };
      const common = {
        motherName: idv('motherName', 'motherName'),
        fatherName: idv('fatherName', 'fatherName'),
        dob: idv('dob', 'dob', true),
        nationality: idv('nationality', 'nationality'),
        category: idv('category', 'category'),
        firstAdmissionDate: idv('firstAdmissionDate', 'admissionDate', true),
      };
      const seed = initial ? {
        applicationDate: dstr(initial.applicationDate),
        status: initial.status || 'applied',
        reasonForLeaving: initial.reasonForLeaving || '',
        srnNumber: initial.srnNumber || '',
        tcNumber: initial.tcNumber || '',
        bookNo: pick('bookNo'),
        issueDate: dstr(initial.issueDate),
        result: pick('result'),
        failedInClass: pick('failedInClass') || 'no',
        subjectsStudied: pick('subjectsStudied'),
        qualifiedForPromotion: pick('qualifiedForPromotion') || 'yes',
        duesPaidUpto: pick('duesPaidUpto'),
        feeConcession: pick('feeConcession'),
        nccScoutGuide: pick('nccScoutGuide'),
        gamesActivities: initial.gamesActivities || '',
        generalConduct: pick('generalConduct'),
        remarks: initial.remarks || '',
        totalAttendanceDays: initial.totalAttendanceDays ?? '',
        totalWorkingDays: initial.totalWorkingDays ?? '',
        ...common,
        overrideDues: false,
      } : {
        ...EMPTY_TC,
        srnNumber: sug.srnNumber || '',
        tcNumber: sug.tcNumber || '',
        bookNo: sug.bookNo || '',
        result: sug.result || '',
        failedInClass: sug.failedInClass || 'no',
        subjectsStudied: sug.subjectsStudied || '',
        qualifiedForPromotion: sug.qualifiedForPromotion || 'yes',
        duesPaidUpto: sug.duesPaidUpto || '',
        feeConcession: sug.feeConcession || '',
        nccScoutGuide: sug.nccScoutGuide || '',
        generalConduct: sug.generalConduct || '',
        totalWorkingDays: sug.totalWorkingDays ?? '',
        totalAttendanceDays: sug.totalAttendanceDays ?? '',
        ...common,
      };
      setT(seed);
      setBaseline(JSON.stringify(seed));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, initial, studentId]);

  const set = (k) => (e) => setT((p) => ({ ...p, [k]: e.target.value }));
  const issuing = t.status === 'issued';
  const resultOpts = withCurrent(config?.resultOptions, t.result);
  const conductOpts = withCurrent(config?.conductOptions, t.generalConduct);

  // Store an identity field only when the operator filled/changed it vs the derived value
  // (so complete students keep live-derive and don't snapshot).
  const idOverride = (key, derivedVal, isDate) => {
    const v = String(t[key] ?? '').trim();
    if (!v) return undefined;
    const d = isDate ? dstr(derivedVal) : (derivedVal || '');
    return v === String(d) ? undefined : v;
  };

  const submit = () => onSave({
    ...t,
    uuid: initial?.uuid, // thread the id so an edit UPDATES instead of creating a duplicate
    totalAttendanceDays: t.totalAttendanceDays === '' ? undefined : Number(t.totalAttendanceDays),
    totalWorkingDays: t.totalWorkingDays === '' ? undefined : Number(t.totalWorkingDays),
    motherName: idOverride('motherName', derived?.motherName),
    fatherName: idOverride('fatherName', derived?.fatherName),
    dob: idOverride('dob', derived?.dob, true),
    nationality: idOverride('nationality', derived?.nationality),
    category: idOverride('category', derived?.category),
    firstAdmissionDate: idOverride('firstAdmissionDate', derived?.admissionDate, true),
  });

  const field = (label, key, extra = {}) => (
    <TextField fullWidth size="small" label={label} value={t[key] ?? ''} onChange={set(key)} {...extra} />
  );
  const dateField = (label, key) => field(label, key, { type: 'date', InputLabelProps: { shrink: true } });

  const isIssued = initial?.status === 'issued';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Transfer Certificate' : 'Apply for Transfer Certificate'}</DialogTitle>
      <DialogContent>
        {loading && <Typography variant="caption" color="text.secondary">Loading defaults…</Typography>}
        {derived && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {derived.name}{derived.admissionNumber ? ` · Adm# ${derived.admissionNumber}` : ''}{derived.classWords ? ` · ${derived.classWords}` : ''}
            {' '}· Name &amp; class come from the student record. Fill the details below if the record is incomplete.
          </Typography>
        )}

        {/* When TC-level identity editing is OFF (default), flag an incomplete student record. */}
        {!config?.allowIdentityOverride && derived && (!derived.motherName || !derived.fatherName || !derived.dob || !derived.category) && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            This student's record is missing some details (parents / DOB / category). They'll print blank —
            complete the student profile, or enable "edit student details on the TC" in Transfer Config.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Student details — editable overrides, only when the school enables it */}
          {config?.allowIdentityOverride && (
            <>
              <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Student details</Typography></Divider></Grid>
              <Grid item xs={12} sm={6}>{field("Mother's name (2)", 'motherName')}</Grid>
              <Grid item xs={12} sm={6}>{field("Father's / guardian's name (3)", 'fatherName')}</Grid>
              <Grid item xs={12} sm={4}>{dateField('Date of birth (4)', 'dob')}</Grid>
              <Grid item xs={12} sm={4}>{field('Nationality (5)', 'nationality')}</Grid>
              <Grid item xs={12} sm={4}>{field('Category SC/ST/OBC (6)', 'category')}</Grid>
              <Grid item xs={12} sm={4}>{dateField('First admission date (7)', 'firstAdmissionDate')}</Grid>
            </>
          )}

          {/* Certificate / numbering */}
          <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Certificate</Typography></Divider></Grid>
          <Grid item xs={12} sm={4}>{dateField('Application date (20)', 'applicationDate')}</Grid>
          <Grid item xs={12} sm={4}>{dateField('Date of TC issue (21)', 'issueDate')}</Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select size="small" label="Status" value={t.status} onChange={set('status')}>
              <MenuItem value="applied">Applied</MenuItem>
              <MenuItem value="issued">Issued</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          {config?.showBookNo !== false && <Grid item xs={12} sm={4}>{field('Book No. (optional)', 'bookNo')}</Grid>}
          <Grid item xs={12} sm={4}>{field('S.R.N.', 'srnNumber')}</Grid>
          <Grid item xs={12} sm={4}>{field('TC No.', 'tcNumber')}</Grid>

          <Grid item xs={12} sm={6}>
            <TextField fullWidth select size="small" label="Result (9)" value={t.result} onChange={set('result')}>
              {resultOpts.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select size="small" label="General conduct (19)" value={t.generalConduct} onChange={set('generalConduct')}>
              {conductOpts.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select size="small" label="Failed in class (10)" value={t.failedInClass} onChange={set('failedInClass')}>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="once">Once</MenuItem>
              <MenuItem value="twice">Twice</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select size="small" label="Qualified for promotion (12)" value={t.qualifiedForPromotion} onChange={set('qualifiedForPromotion')}>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>{field('Dues paid up to (13)', 'duesPaidUpto')}</Grid>
          <Grid item xs={12}>{field('Subjects studied (11)', 'subjectsStudied', { multiline: true, minRows: 2 })}</Grid>
          <Grid item xs={12} sm={6}>{field('Fee concession (14)', 'feeConcession')}</Grid>
          <Grid item xs={12} sm={6}>{field('NCC / Scout / Guide (17)', 'nccScoutGuide')}</Grid>
          <Grid item xs={12}>{field('Games / extra-curricular (18)', 'gamesActivities', { multiline: true, minRows: 2 })}</Grid>
          <Grid item xs={12} sm={6}>{field('Total working days (15)', 'totalWorkingDays', { type: 'number' })}</Grid>
          <Grid item xs={12} sm={6}>{field('Total presence / attendance days (16)', 'totalAttendanceDays', { type: 'number' })}</Grid>
          <Grid item xs={12}>{field('Reason for leaving (22)', 'reasonForLeaving')}</Grid>
          <Grid item xs={12}>{field('Any other remarks (23)', 'remarks', { multiline: true, minRows: 2 })}</Grid>

          {dues > 0 && (
            <Grid item xs={12}>
              <Alert severity={issuing ? 'warning' : 'info'}>
                Outstanding dues: ₹{Number(dues).toLocaleString('en-IN')}.
                {issuing ? ' Issuing may be blocked until dues are cleared.' : ' A TC can only be printed once issued.'}
              </Alert>
            </Grid>
          )}
          {issuing && (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 1 }}>Issuing a TC withdraws the student (status becomes inactive).</Alert>
              {dues > 0 && (
                <FormControlLabel
                  control={<Checkbox checked={!!t.overrideDues} onChange={(e) => setT((p) => ({ ...p, overrideDues: e.target.checked }))} />}
                  label="Override the dues gate (super-admin only) — issue despite outstanding dues"
                />
              )}
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <span>
          {initial?.uuid && (
            <Button startIcon={<PrintIcon />} onClick={() => openTc(studentId, initial.uuid)}>{isIssued ? 'Print' : 'Preview'}</Button>
          )}
        </span>
        <span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!dirty || loading} sx={{ ml: 1 }}>Save</Button>
        </span>
      </DialogActions>
    </Dialog>
  );
}
