import api from '../config/api';

export const academicCalendarService = {
  getAcademicYears: async () => {
    const response = await api.get('/academic-years/search');
    return response.data; // [{ uuid, name, isCurrent }] — newest first, exactly one isCurrent
  },

  // The canonical "current" session. Derived from the same list (single source of
  // truth): the backend flags exactly one row isCurrent (today-in-range, else the
  // latest-starting year). Returns { uuid, name, isCurrent } or null.
  getCurrentAcademicYear: async () => {
    const response = await api.get('/academic-years/search');
    const rows = response.data || [];
    return rows.find((r) => r.isCurrent) || rows[0] || null;
  },

  getAcademicYearById: async (id) => {
    const response = await api.get(`/academic-years/${id}`);
    return response.data;
  },
};
