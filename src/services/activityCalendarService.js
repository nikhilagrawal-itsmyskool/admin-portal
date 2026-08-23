import api from '../config/api';

// The academic (activity) calendar module: per-(school, academic-year) dated entries
// grouped by configurable types ("columns"), plus holidays. Distinct from
// academicCalendarService, which wraps the /academic-years dropdown lookup.
export const activityCalendarService = {
  // Types ("columns")
  getTypes: async () => (await api.get('/academic-calendar/types')).data,
  createType: async (body) => (await api.post('/academic-calendar/types', body)).data,
  updateType: async (id, body) => (await api.put(`/academic-calendar/types/${id}`, body)).data,
  deleteType: async (id) => (await api.delete(`/academic-calendar/types/${id}`)).data,

  // Month/range grid: { academicYearId, from, to, types, days:[{date, weekday, isWeeklyOff, holiday, entries}] }
  getCalendar: async (params) => (await api.get('/academic-calendar/calendar', { params })).data,

  // Entries
  addEntry: async (body) => (await api.post('/academic-calendar/entries', body)).data,
  updateEntry: async (id, body) => (await api.put(`/academic-calendar/entries/${id}`, body)).data,
  deleteEntry: async (id) => (await api.delete(`/academic-calendar/entries/${id}`)).data,

  // Holidays
  listHolidays: async (params) => (await api.get('/academic-calendar/holidays', { params })).data,
  setHoliday: async (body) => (await api.post('/academic-calendar/holidays', body)).data,
  deleteHoliday: async (id) => (await api.delete(`/academic-calendar/holidays/${id}`)).data,

  // Import (xlsx) — preview returns the diff; apply writes it.
  importPreview: async (body) => (await api.post('/academic-calendar/import/preview', body)).data,
  importApply: async (body) => (await api.post('/academic-calendar/import/apply', body)).data,
};
