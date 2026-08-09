import React, { useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Stack, Accordion, AccordionSummary, AccordionDetails, Divider,
  Switch, FormControlLabel, TextField, Chip,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ParticipantList } from './rosterParticipants';
import { fmtDate } from '../../utils/date';

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
  day: d, di, onDayChange, onSlotChange, targetTypes, classOptions, academicYearId, disabled, defaultExpanded,
}) {
  const onAnchors = useCallback((rows) => onDayChange(di, { anchors: rows }), [onDayChange, di]);
  const onOwners = useCallback((rows) => onDayChange(di, { owners: rows }), [onDayChange, di]);
  const onCommanders = useCallback((rows) => onDayChange(di, { commanders: rows }), [onDayChange, di]);
  const onDrummers = useCallback((rows) => onDayChange(di, { drummers: rows }), [onDayChange, di]);
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 600 }}>{fmtDate(d.date)}</Typography>
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
export default function RosterDays({ days, onDayChange, onSlotChange, targetTypes, classOptions, academicYearId, disabled }) {
  return (
    <>
      {days.map((d, di) => (
        <DayAccordion
          key={d.date} day={d} di={di} onDayChange={onDayChange} onSlotChange={onSlotChange}
          targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
          disabled={disabled} defaultExpanded={di === 0}
        />
      ))}
    </>
  );
}
