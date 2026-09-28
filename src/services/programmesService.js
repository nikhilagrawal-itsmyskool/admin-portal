import api from '../config/api';

// Client for the `programmes` module (developmental programmes; Spoken English &
// Life Communication = code "SELC"). Mirrors syllabusService's shape.
export const programmesService = {
  // Lookups: { programmes:[{code,name}], months, workflowStatuses, assessmentBands }
  getLookups: async () => (await api.get('/programmes/lookups')).data,

  // Grades derived from base class names, each with its base sections.
  getGrades: async (params = {}) => (await api.get('/programmes/grades', { params })).data,

  // Programme catalog rows.
  getCatalog: async () => (await api.get('/programmes/catalog')).data,

  // A programme + its seeded masters (fieldTypes, materialTypes, domains, skills, stages).
  getProgramme: async (code) => (await api.get(`/programmes/catalog/${code}`)).data,

  // Update programme settings (motto, philosophy, teacherGuidance[]). God-only.
  updateProgramme: async (code, data) => (await api.put(`/programmes/catalog/${code}`, data)).data,

  // ---- Units (admin editor) ----
  getUnits: async (params = {}) => (await api.get('/programmes/units', { params })).data,
  getUnit: async (id) => (await api.get(`/programmes/units/${id}`)).data,
  createUnit: async (data) => (await api.post('/programmes/units', data)).data,
  updateUnit: async (id, data) => (await api.put(`/programmes/units/${id}`, data)).data,
  deleteUnit: async (id) => (await api.delete(`/programmes/units/${id}`)).data,

  // ---- Teacher reader ----
  // params: { programme, grade, month, academicYearId }
  getTeach: async (params = {}) => (await api.get('/programmes/teach', { params })).data,

  // ---- Source documents ----
  listSources: async (params = {}) => (await api.get('/programmes/sources', { params })).data,
  // Returns { fileName, mimeType, base64 }
  downloadSource: async (grade, params = {}) =>
    (await api.get(`/programmes/sources/${encodeURIComponent(grade)}/file`, { params })).data,
  // body: { base64Data, fileName, academicYearId }; params: { programme }
  uploadSource: async (grade, params, body) =>
    (await api.post(`/programmes/sources/${encodeURIComponent(grade)}`, body, { params })).data,
};

// Only one programme is live today; the reader/editor target it. The catalog page
// is generic, so a second programme would slot in without code changes elsewhere.
export const SELC = 'SELC';
