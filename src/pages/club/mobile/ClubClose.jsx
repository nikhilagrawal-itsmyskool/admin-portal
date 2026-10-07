import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, ToggleButtonGroup, ToggleButton, TextField, Alert, Stack, Chip,
} from '@mui/material';
import { clubService } from '../../../services/clubService';

const ISSUES = ['none', 'material', 'time', 'venue', 'safety', 'other'];

// Quick closure — max four decisions, conditional. Never re-asks known info (date/class/activity/
// teacher/slot/venue are already on the assignment).
export default function ClubClose() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conducted, setConducted] = useState('fully');
  const [asPlanned, setAsPlanned] = useState('yes');
  const [issue, setIssue] = useState('none');
  const [quality, setQuality] = useState('as-planned');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const notConducted = conducted === 'not';

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await clubService.myClose(id, {
        outcome: conducted,
        participationAsPlanned: notConducted ? undefined : asPlanned === 'yes',
        issueType: notConducted ? undefined : issue,
        qualitySignal: notConducted ? undefined : quality,
        notConductedReason: notConducted ? reason : undefined,
        note: note || undefined,
      });
      navigate('/club/me');
    } catch (e) { setErr(e.response?.data?.error?.description || 'Could not submit'); }
    finally { setBusy(false); }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      <Button size="small" onClick={() => navigate(`/club/me/a/${id}`)} sx={{ mb: 1 }}>← Guide</Button>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Quick Close</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>We already know the date, class, activity, teacher, slot & venue — we won't ask again.</Alert>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2}>
        <Field label="Was it conducted?">
          <ToggleButtonGroup exclusive fullWidth size="small" value={conducted} onChange={(_e, v) => v && setConducted(v)}>
            <ToggleButton value="fully" color="success">Fully</ToggleButton>
            <ToggleButton value="partly">Partly</ToggleButton>
            <ToggleButton value="not" color="error">Not</ToggleButton>
          </ToggleButtonGroup>
        </Field>

        {notConducted ? (
          <Field label="Reason (required)">
            <TextField fullWidth size="small" multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="Participation as planned?">
              <ToggleButtonGroup exclusive fullWidth size="small" value={asPlanned} onChange={(_e, v) => v && setAsPlanned(v)}>
                <ToggleButton value="yes">Yes</ToggleButton><ToggleButton value="no">No</ToggleButton>
              </ToggleButtonGroup>
            </Field>
            <Field label="Any issue?">
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {ISSUES.map((i) => (
                  <Chip key={i} label={i === 'safety' ? 'Safety ⚠' : i} color={issue === i ? (i === 'safety' ? 'error' : 'primary') : 'default'}
                    variant={issue === i ? 'filled' : 'outlined'} onClick={() => setIssue(i)} />
                ))}
              </Stack>
            </Field>
            <Field label="How did it work?">
              <ToggleButtonGroup exclusive fullWidth size="small" value={quality} onChange={(_e, v) => v && setQuality(v)}>
                <ToggleButton value="as-planned">As planned</ToggleButton>
                <ToggleButton value="minor-change">Minor</ToggleButton>
                <ToggleButton value="needs-review">Review</ToggleButton>
              </ToggleButtonGroup>
            </Field>
            {issue === 'safety' && <Alert severity="warning">A safety issue opens the incident/review route immediately.</Alert>}
            <Field label="Brief note (optional)">
              <TextField fullWidth size="small" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </>
        )}

        <Button fullWidth variant="contained" size="large" disabled={busy || (notConducted && !reason.trim())} onClick={submit}>
          {busy ? 'Submitting…' : 'Submit closure'}
        </Button>
      </Stack>
    </Box>
  );
}

const Field = ({ label, children }) => (
  <Box><Typography variant="subtitle2" sx={{ mb: 0.5 }}>{label}</Typography>{children}</Box>
);
