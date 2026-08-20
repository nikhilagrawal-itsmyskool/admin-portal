import React, { useCallback, useState, useEffect, memo } from 'react';
import {
  Box, Typography, Grid, Stack, Accordion, AccordionSummary, AccordionDetails, Divider,
  Switch, FormControlLabel, TextField, Chip, Button, IconButton, Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon, Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon,
} from '@mui/icons-material';
import { ParticipantList } from './rosterParticipants';
import { assemblyService } from '../../services/assemblyService';
import { fmtDateDow } from '../../utils/date';

const REF_MAX = 5;
const REF_ACCEPT = 'image/jpeg,image/png,image/webp';

function readImageB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// A reference's image thumbnail — uses the presigned imageUrl (prod), falling back to
// a lazily-fetched base64 data URI (local dev, where there is no presigned URL).
function RefThumb({ reference, size = 56 }) {
  const [src, setSrc] = useState(reference.imageUrl || '');
  useEffect(() => {
    let alive = true;
    if (reference.imageUrl) { setSrc(reference.imageUrl); return undefined; }
    assemblyService.getReferenceImage(reference.uuid)
      .then((r) => { if (alive && r) setSrc(`data:${r.mimeType};base64,${r.base64Data}`); })
      .catch(() => {});
    return () => { alive = false; };
  }, [reference.uuid, reference.imageUrl]);
  return (
    <Box component="img" src={src || undefined} alt=""
      sx={{ width: size, height: size, objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover', flexShrink: 0 }} />
  );
}

// The day's Assembly References (description + one image, up to 5). Owns its own state
// and persists each add/remove immediately via its own endpoints (admin or the /me twin
// per `mine`) — so it stays outside the roster draft/save + memoization contract.
const DayReferences = memo(function DayReferences({ weekId, entryDate, initial, disabled, mine }) {
  const [refs, setRefs] = useState(initial || []);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const api = mine
    ? { add: assemblyService.myAddReference, remove: assemblyService.myRemoveReference }
    : { add: assemblyService.addReference, remove: assemblyService.removeReference };

  const canAdd = !disabled && refs.length < REF_MAX;

  const add = async () => {
    if (!description.trim() || !file) return;
    setBusy(true); setError('');
    try {
      const base64Data = await readImageB64(file);
      const list = await api.add(weekId, { entryDate, description: description.trim(), fileName: file.name, mimeType: file.type || undefined, base64Data });
      setRefs(list); setDescription(''); setFile(null);
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to add reference'); }
    finally { setBusy(false); }
  };

  const remove = async (refId) => {
    setBusy(true); setError('');
    try { setRefs(await api.remove(weekId, refId)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to remove reference'); }
    finally { setBusy(false); }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Assembly References <Typography component="span" variant="caption" color="text.secondary">({refs.length}/{REF_MAX})</Typography>
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
      <Stack spacing={1}>
        {refs.map((r) => (
          <Stack key={r.uuid} direction="row" spacing={1.5} alignItems="flex-start"
            sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <RefThumb reference={r} />
            <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'pre-wrap', minWidth: 0 }}>{r.description}</Typography>
            {!disabled && (
              <IconButton size="small" color="error" onClick={() => remove(r.uuid)} disabled={busy}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
        {refs.length === 0 && (
          <Typography variant="body2" color="text.secondary">No references added.</Typography>
        )}
      </Stack>
      {canAdd && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }} sx={{ mt: 1.5 }}>
          <TextField size="small" fullWidth multiline minRows={1} label="Description"
            value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
          <Button size="small" component="label" variant="outlined" startIcon={<AddPhotoIcon />} disabled={busy} sx={{ flexShrink: 0 }}>
            {file ? 'Change image' : 'Choose image'}
            <input hidden type="file" accept={REF_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <Button size="small" variant="contained" onClick={add} disabled={busy || !description.trim() || !file} sx={{ flexShrink: 0 }}>
            Add
          </Button>
        </Stack>
      )}
      {canAdd && file && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{file.name}</Typography>}
      {!disabled && refs.length >= REF_MAX && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Maximum {REF_MAX} references reached.</Typography>
      )}
    </Box>
  );
});

// One fillable slot. Memoized so typing in another slot's content (or on another
// day) doesn't re-render this slot and its participant Autocompletes.
const SlotRow = memo(function SlotRow({ slot: s, di, si, onSlotChange, targetTypes, classOptions, academicYearId, disabled }) {
  const onOpted = useCallback((e) => onSlotChange(di, si, { opted: e.target.checked }), [onSlotChange, di, si]);
  const onContent = useCallback((e) => onSlotChange(di, si, { content: e.target.value }), [onSlotChange, di, si]);
  const onParticipants = useCallback((rows) => onSlotChange(di, si, { participants: rows }), [onSlotChange, di, si]);
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, ml: s.depth ? s.depth * 2 : 0, opacity: s.opted === false ? 0.55 : 1 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 500 }}>{s.title}</Typography>
          {s.description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{s.description}</Typography>}
        </Box>
        <FormControlLabel control={<Switch size="small" checked={s.opted !== false} disabled={disabled} onChange={onOpted} />} label="Included" />
      </Stack>
      {s.opted !== false && (
        <Stack spacing={1.5}>
          {s.dayHint && <Chip size="small" color="primary" variant="outlined" label={`Today: ${s.dayHint}`} sx={{ alignSelf: 'flex-start' }} />}
          <TextField size="small" fullWidth multiline minRows={1}
            label="Content" placeholder={s.dayHint ? `Fill the ${s.dayHint}…` : undefined}
            value={s.content || ''} disabled={disabled}
            onChange={onContent}
            helperText={s.options?.length ? `Options: ${s.options.join(' · ')}` : undefined} />
          <Box>
            <Typography variant="caption" color="text.secondary">Speakers / performers</Typography>
            <ParticipantList value={s.participants} onChange={onParticipants}
              targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
              defaultType="student" addLabel="Add person / group" disabled={disabled} emptyText="No one assigned" />
          </Box>
        </Stack>
      )}
    </Box>
  );
});

// One day (anchors/owners/commanders/drummers + its slots). Memoized so a keystroke
// on another day is skipped entirely — the functional draft update preserves the
// object reference of every day the edit didn't touch.
const DayAccordion = memo(function DayAccordion({
  day: d, di, onDayChange, onSlotChange, targetTypes, classOptions, academicYearId, disabled, defaultExpanded, weekId, mine,
}) {
  const onAnchors = useCallback((rows) => onDayChange(di, { anchors: rows }), [onDayChange, di]);
  const onOwners = useCallback((rows) => onDayChange(di, { owners: rows }), [onDayChange, di]);
  const onCommanders = useCallback((rows) => onDayChange(di, { commanders: rows }), [onDayChange, di]);
  const onDrummers = useCallback((rows) => onDayChange(di, { drummers: rows }), [onDayChange, di]);
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 600 }}>{fmtDateDow(d.date)}</Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>{d.slots.length} slot(s)</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Anchors (MCs)</Typography>
            <ParticipantList value={d.anchors} onChange={onAnchors}
              targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
              roleFixed="anchor" defaultType="student" addLabel="Add anchor" disabled={disabled} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Day owner(s)</Typography>
            <ParticipantList value={d.owners} onChange={onOwners}
              targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
              roleFixed="day-owner" defaultType="employee" addLabel="Add owner" disabled={disabled} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Assembly commander(s)</Typography>
            <ParticipantList value={d.commanders} onChange={onCommanders}
              targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
              roleFixed="commander" defaultType="student" addLabel="Add commander" disabled={disabled} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Assembly drummer(s)</Typography>
            <ParticipantList value={d.drummers} onChange={onDrummers}
              targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
              roleFixed="drummer" defaultType="student" addLabel="Add drummer" disabled={disabled} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <DayReferences weekId={weekId} entryDate={d.date} initial={d.references} disabled={disabled} mine={mine} />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Roster slots</Typography>
        {d.slots.length === 0 && <Typography variant="body2" color="text.secondary">No roster slots for this day.</Typography>}
        <Stack spacing={2}>
          {d.slots.map((s, si) => (
            <SlotRow key={s.nodeId} slot={s} di={di} si={si} onSlotChange={onSlotChange}
              targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId} disabled={disabled} />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});

// The per-day roster editor (anchors/owners + fillable slots). Shared by the admin
// RosterEditor and the teacher PWA week screen. `days` is the editable draft;
// onDayChange(di, patch) and onSlotChange(di, si, patch) mutate it — pass STABLE
// (useCallback) handlers so the memoized day/slot/participant subtree can skip
// re-rendering everything the keystroke didn't touch.
export default function RosterDays({ days, onDayChange, onSlotChange, targetTypes, classOptions, academicYearId, disabled, weekId, mine }) {
  return (
    <>
      {days.map((d, di) => (
        <DayAccordion
          key={d.date} day={d} di={di} onDayChange={onDayChange} onSlotChange={onSlotChange}
          targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
          disabled={disabled} defaultExpanded={di === 0} weekId={weekId} mine={mine}
        />
      ))}
    </>
  );
}
