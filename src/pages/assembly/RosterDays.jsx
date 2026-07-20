import React from 'react';
import {
  Box, Typography, Grid, Stack, Accordion, AccordionSummary, AccordionDetails, Divider,
  Switch, FormControlLabel, TextField, Chip,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ParticipantList } from './rosterParticipants';

const fmt = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

// The per-day roster editor (anchors/owners + fillable slots). Shared by the admin
// RosterEditor and the teacher PWA week screen. `days` is the editable draft;
// onDayChange(di, patch) and onSlotChange(di, si, patch) mutate it.
export default function RosterDays({ days, onDayChange, onSlotChange, targetTypes, classOptions, academicYearId, disabled }) {
  return (
    <>
      {days.map((d, di) => (
        <Accordion key={d.date} defaultExpanded={di === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 600 }}>{fmt(d.date)}</Typography>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>{d.slots.length} slot(s)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Anchors (MCs)</Typography>
                <ParticipantList value={d.anchors} onChange={(rows) => onDayChange(di, { anchors: rows })}
                  targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
                  roleFixed="anchor" defaultType="student" addLabel="Add anchor" disabled={disabled} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Day owner(s)</Typography>
                <ParticipantList value={d.owners} onChange={(rows) => onDayChange(di, { owners: rows })}
                  targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
                  roleFixed="day-owner" defaultType="employee" addLabel="Add owner" disabled={disabled} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Roster slots</Typography>
            {d.slots.length === 0 && <Typography variant="body2" color="text.secondary">No roster slots for this day.</Typography>}
            <Stack spacing={2}>
              {d.slots.map((s, si) => (
                <Box key={s.nodeId} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, ml: s.depth ? s.depth * 2 : 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 500, flex: 1 }}>{s.title}</Typography>
                    {s.fillMode === 'roster' && <Chip size="small" label="roster" />}
                    {s.isOptional && (
                      <FormControlLabel control={<Switch size="small" checked={s.opted} disabled={disabled} onChange={(e) => onSlotChange(di, si, { opted: e.target.checked })} />} label="Included" />
                    )}
                  </Stack>
                  {(!s.isOptional || s.opted) && (
                    <Stack spacing={1.5}>
                      {s.dayHint && <Chip size="small" color="primary" variant="outlined" label={`Today: ${s.dayHint}`} sx={{ alignSelf: 'flex-start' }} />}
                      <TextField size="small" fullWidth multiline minRows={1}
                        label="Content" placeholder={s.dayHint ? `Fill the ${s.dayHint}…` : undefined}
                        value={s.content || ''} disabled={disabled}
                        onChange={(e) => onSlotChange(di, si, { content: e.target.value })}
                        helperText={s.options?.length ? `Options: ${s.options.join(' · ')}` : undefined} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Speakers / performers</Typography>
                        <ParticipantList value={s.participants} onChange={(rows) => onSlotChange(di, si, { participants: rows })}
                          targetTypes={targetTypes} classOptions={classOptions} academicYearId={academicYearId}
                          defaultType="student" addLabel="Add person / group" disabled={disabled} emptyText="No one assigned" />
                      </Box>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
