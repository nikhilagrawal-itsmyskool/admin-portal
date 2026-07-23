import api from '../config/api';

// Portal-wide selected academic year, set by AcademicYearProvider. Ordinary class
// dropdowns filter to it automatically; timetable pages opt out with allYears.
let _currentAcademicYearId = null;
export const setCurrentAcademicYear = (id) => { _currentAcademicYearId = id || null; };

export const classService = {
  // Options:
  //   academicYearId / academic_year_id — restrict to that year (defaults to the
  //     portal-selected year). allYears: true bypasses year filtering entirely.
  //   includeCohort: true — include timetable cohort/composite classes (hidden by default).
  getClasses: async (params = {}) => {
    const { includeCohort, allYears, academic_year_id: ayLegacy, academicYearId, ...rest } = params;
    const ay = allYears ? undefined : (academicYearId || ayLegacy || _currentAcademicYearId || undefined);
    const query = { ...rest };
    if (ay) query.academicYearId = ay;
    if (includeCohort) query.includeCohort = 1;
    const response = await api.get('/classes/search', { params: query });
    return response.data;
  },

  getClassById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  getSections: async (classId) => {
    const response = await api.get(`/classes/${classId}/sections`);
    return response.data;
  },
};
