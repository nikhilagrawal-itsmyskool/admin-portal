import React, { useState, useMemo, useEffect } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, TextField, MenuItem, Stack } from '@mui/material';
import TimetableGrid from './TimetableGrid';
import TeacherName from './TeacherName';
import { classService } from '../../../services/classService';

// Toggle between per-class and per-teacher grid views over a set of entries.
export default function GridViewer({ config, entries = [] }) {
  const [mode, setMode] = useState('class');
  const [selectedId, setSelectedId] = useState('');
  const [classNameById, setClassNameById] = useState({});

  useEffect(() => {
    classService.getClasses()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.classes || []);
        const map = {};
        list.forEach((c) => { map[c.uuid] = c.name; });
        setClassNameById(map);
      })
      .catch(() => {});
  }, []);

  const classIds = useMemo(() => [...new Set(entries.map((e) => e.classId))], [entries]);
  const teacherIds = useMemo(() => [...new Set(entries.map((e) => e.teacherId))], [entries]);
  const options = mode === 'class' ? classIds : teacherIds;

  useEffect(() => {
    if (options.length > 0 && !options.includes(selectedId)) setSelectedId(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entries]);

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <ToggleButtonGroup size="small" exclusive value={mode}
          onChange={(e, v) => { if (v) setSelectedId(''); if (v) setMode(v); }}>
          <ToggleButton value="class">By Class</ToggleButton>
          <ToggleButton value="teacher">By Teacher</ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label={mode === 'class' ? 'Class' : 'Teacher'} value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)} sx={{ minWidth: 240 }}>
          {options.length === 0 && <MenuItem value="" disabled>None</MenuItem>}
          {options.map((id) => (
            <MenuItem key={id} value={id}>
              {mode === 'class' ? (classNameById[id] || id) : <TeacherName id={id} />}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TimetableGrid config={config} entries={entries} mode={mode} selectedId={selectedId} classNameById={classNameById} />
    </Box>
  );
}
