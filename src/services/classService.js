import api from '../config/api';

// Portal-wide selected academic year, set by AcademicYearProvider. Ordinary class
// dropdowns filter to it automatically; timetable pages opt out with allYears.
let _currentAcademicYearId = null;

// Readiness gate. The current year is resolved asynchronously at app start
// (AcademicYearProvider fetches the academic years, then calls setCurrentAcademicYear).
// A class dropdown that mounts at the same time would otherwise race and fetch before
// the year is known — the query omits academicYearId and the backend returns ALL classes
// (every year). getClasses awaits this promise so a cold load still filters to the year.
let _resolveReady;
const _ready = new Promise((resolve) => { _resolveReady = resolve; });
let _settled = false;
const _markReady = () => { if (!_settled) { _settled = true; _resolveReady(); } };

export const setCurrentAcademicYear = (id) => { _currentAcademicYearId = id || null; _markReady(); };

// Called by AcademicYearProvider when year resolution finishes without a usable year
// (e.g. the API failed), so dropdowns fall back to all classes instead of waiting.
export const markAcademicYearReady = () => { _markReady(); };

export const classService = {
  // Options:
  //   academicYearId / academic_year_id — restrict to that year (defaults to the
  //     portal-selected year). allYears: true bypasses year filtering entirely.
  //   includeCohort: true — include timetable cohort/composite classes (hidden by default).
  getClasses: async (params = {}) => {
    const { includeCohort, allYears, academic_year_id: ayLegacy, academicYearId, ...rest } = params;
    // Wait for the portal year to resolve so a cold load doesn't fire an unfiltered
    // (all-years) query. Skip when the caller wants all years or supplied its own year.
    // A short timeout guarantees the dropdown never blocks if year resolution stalls.
    if (!allYears && !academicYearId && !ayLegacy) {
      await Promise.race([_ready, new Promise((resolve) => setTimeout(resolve, 4000))]);
    }
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

  // Streams offered under a base class (e.g. XI-A -> [{code:'SCI',name:'Science'}, ...]).
  // Empty array for ordinary classes. Drives the stream picker on student admission/edit.
  getClassStreams: async (baseClassId) => {
    if (!baseClassId) return [];
    const response = await api.get('/classes/streams', { params: { baseClassId } });
    return response.data || [];
  },

  getSections: async (classId) => {
    const response = await api.get(`/classes/${classId}/sections`);
    return response.data;
  },
};
