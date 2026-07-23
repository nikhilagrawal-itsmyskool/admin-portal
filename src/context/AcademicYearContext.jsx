import React, { createContext, useContext, useEffect, useState } from 'react';
import { academicCalendarService } from '../services/academicCalendarService';
import { setCurrentAcademicYear } from '../services/classService';

// Portal-wide selected academic year. Defaults to the current year and is used to
// scope data fetches (starting with the class dropdowns). The selected id is also
// pushed into classService so ordinary class dropdowns filter to it automatically.
const AcademicYearContext = createContext({ years: [], academicYearId: '', setAcademicYearId: () => {} });

export const useAcademicYear = () => useContext(AcademicYearContext);

export function AcademicYearProvider({ children }) {
  const [years, setYears] = useState([]);
  const [academicYearId, setYear] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const rows = (await academicCalendarService.getAcademicYears()) || [];
        setYears(rows);
        const current = rows.find((r) => r.isCurrent) || rows[0];
        const id = current?.uuid || '';
        setYear(id);
        setCurrentAcademicYear(id);
      } catch { /* years are optional; dropdowns fall back to all classes */ }
    })();
  }, []);

  const setAcademicYearId = (id) => {
    setYear(id);
    setCurrentAcademicYear(id);
  };

  return (
    <AcademicYearContext.Provider value={{ years, academicYearId, setAcademicYearId }}>
      {children}
    </AcademicYearContext.Provider>
  );
}
