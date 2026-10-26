import React, { createContext, useContext, useEffect, useState } from 'react';
import { academicCalendarService } from '../services/academicCalendarService';
import { setCurrentAcademicYear, markAcademicYearReady } from '../services/classService';

// Portal-wide selected academic year. Defaults to the current year and is used to
// scope data fetches (starting with the class dropdowns). The selected id is also
// pushed into classService so ordinary class dropdowns filter to it automatically.
const AcademicYearContext = createContext({ years: [], academicYearId: '', ready: false, setAcademicYearId: () => {} });

export const useAcademicYear = () => useContext(AcademicYearContext);

export function AcademicYearProvider({ children }) {
  const [years, setYears] = useState([]);
  const [academicYearId, setYear] = useState('');
  // `ready` flips true once the current year is resolved (or the lookup failed).
  // Year-scoped pages wait on this so they fetch ONCE with the real id instead of
  // firing first with an empty id and re-fetching when it resolves (double-fetch).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = (await academicCalendarService.getAcademicYears()) || [];
        setYears(rows);
        const current = rows.find((r) => r.isCurrent) || rows[0];
        const id = current?.uuid || '';
        setYear(id);
        setCurrentAcademicYear(id);
      } catch {
        /* years are optional; unblock class dropdowns so they fall back to all classes */
        markAcademicYearReady();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setAcademicYearId = (id) => {
    setYear(id);
    setCurrentAcademicYear(id);
  };

  return (
    <AcademicYearContext.Provider value={{ years, academicYearId, ready, setAcademicYearId }}>
      {children}
    </AcademicYearContext.Provider>
  );
}
