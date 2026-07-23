import React, { useState, useEffect } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { academicCalendarService } from '../../../services/academicCalendarService';
import { classService } from '../../../services/classService';

// Academic-year dropdown. Auto-selects the first year when none is chosen.
export function AcademicYearSelect({ value, onChange, size = 'small', sx }) {
  const [years, setYears] = useState([]);

  useEffect(() => {
    let active = true;
    academicCalendarService.getAcademicYears()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : (data.academicYears || []);
        setYears(list);
        if (!value && list.length > 0) onChange(list[0].uuid);
      })
      .catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TextField select label="Academic Year" size={size} value={value || ''}
      onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 220, ...sx }}>
      {years.length === 0 && <MenuItem value="" disabled>No academic years</MenuItem>}
      {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}</MenuItem>)}
    </TextField>
  );
}

// Class dropdown. Classes are not academic-year scoped in the core schema.
export function ClassSelect({ value, onChange, size = 'small', sx }) {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    let active = true;
    classService.getClasses({ includeCohort: true })
      .then((data) => { if (active) setClasses(Array.isArray(data) ? data : (data.classes || [])); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <TextField select label="Class" size={size} value={value || ''}
      onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 220, ...sx }}>
      {classes.length === 0 && <MenuItem value="" disabled>No classes</MenuItem>}
      {classes.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
    </TextField>
  );
}
