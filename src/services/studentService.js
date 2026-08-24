import api from '../config/api';

export const studentService = {
  // ---- Search / list ----
  searchStudents: async (params = {}, signal) => {
    // params: { name, classId, academicYearId, admissionNumber, phone, unreachable }
    // signal: optional AbortSignal so callers (e.g. type-ahead) can cancel stale requests
    const response = await api.get('/students/search', { params, signal });
    return response.data;
  },

  // Effective-contact breakdown for a cohort (counts only — no numbers). Same
  // filters as searchStudents; ignores the `unreachable` flag server-side so the
  // summary always covers the whole cohort. Returns { total, unreachable, breakdown }.
  getCommsSummary: async (params = {}, signal) => {
    const response = await api.get('/students/comms-summary', { params, signal });
    return response.data;
  },

  // Command-palette omni-search: matches name / admission / parent names / phone.
  // Scope defaults to the current session server-side (current-year hits ranked
  // first, flagged inCurrentYear). Pass academicYearId to scope explicitly, or
  // academicYearId='all' to search the whole-school population.
  omniSearch: async (q, signal, { academicYearId } = {}) => {
    const params = { q };
    if (academicYearId) params.academicYearId = academicYearId;
    const response = await api.get('/students/omni-search', { params, signal });
    return response.data; // { results: [...] }
  },

  // Class strength board: per-class active head-count + last admission for a year
  // (defaults to the current session when academicYearId is omitted).
  getClassStrength: async (academicYearId) => {
    const response = await api.get('/students/class-strength', {
      params: academicYearId ? { academicYearId } : {},
    });
    return response.data; // { academicYearId, classes: [...] }
  },

  // ---- Student CRUD ----
  getStudentById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  createStudent: async (data) => {
    const response = await api.post('/students', data);
    return response.data;
  },

  updateStudent: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // ---- Guardians ----
  getGuardians: async (studentId) => {
    const response = await api.get(`/students/${studentId}/guardians`);
    return response.data; // { guardians: [...] }
  },

  createGuardian: async (studentId, data) => {
    const response = await api.post(`/students/${studentId}/guardians`, data);
    return response.data;
  },

  updateGuardian: async (studentId, guardianId, data) => {
    const response = await api.put(`/students/${studentId}/guardians/${guardianId}`, data);
    return response.data;
  },

  deleteGuardian: async (studentId, guardianId) => {
    const response = await api.delete(`/students/${studentId}/guardians/${guardianId}`);
    return response.data;
  },

  // ---- Houses ----
  getHouses: async () => {
    const response = await api.get('/students/houses');
    return response.data; // { houses: [...] }
  },

  // House-balance analytics for a year (defaults to the current session when omitted).
  getHouseAnalytics: async (academicYearId) => {
    const response = await api.get('/students/houses/analytics', {
      params: academicYearId ? { academicYearId } : {},
    });
    return response.data; // { summary, houses, grades, unassigned, siblingsClustered }
  },

  createHouse: async (data) => {
    const response = await api.post('/students/houses', data);
    return response.data;
  },

  updateHouse: async (id, data) => {
    const response = await api.put(`/students/houses/${id}`, data);
    return response.data;
  },

  deleteHouse: async (id) => {
    const response = await api.delete(`/students/houses/${id}`);
    return response.data;
  },

  assignHouse: async (studentId, houseId) => {
    const response = await api.put(`/students/${studentId}/house`, { houseId });
    return response.data;
  },

  // ---- House staff (in-charge / co-in-charge / member teachers) ----
  getHouseTeachers: async (houseId) => {
    const response = await api.get(`/students/houses/${houseId}/teachers`);
    return response.data; // { teachers: [...] }
  },

  setHouseTeachers: async (houseId, teachers) => {
    const response = await api.put(`/students/houses/${houseId}/teachers`, { teachers });
    return response.data; // { teachers: [...] }
  },

  // ---- Lookups (per-school reference data) ----
  getLookups: async (type) => {
    // type: category | blood_group | nationality | country | mother_tongue | relationship | state | city | locality
    const response = await api.get('/students/lookups', { params: type ? { type } : {} });
    return response.data; // { lookups: [...] }
  },

  createLookup: async (data) => {
    // { lookupType, code, label, extra? }
    const response = await api.post('/students/lookups', data);
    return response.data;
  },

  suggestPincode: async (pincode) => {
    const response = await api.get(`/students/lookups/pincode/${pincode}`);
    return response.data; // { suggestion: { stateCode, cityCode, localityCode } | null }
  },

  // ---- Addresses ----
  getAddresses: async (studentId) => {
    const response = await api.get(`/students/${studentId}/addresses`);
    return response.data; // { addresses: [...] }
  },

  createAddress: async (studentId, data) => {
    const response = await api.post(`/students/${studentId}/addresses`, data);
    return response.data;
  },

  updateAddress: async (studentId, addressId, data) => {
    const response = await api.put(`/students/${studentId}/addresses/${addressId}`, data);
    return response.data;
  },

  deleteAddress: async (studentId, addressId) => {
    const response = await api.delete(`/students/${studentId}/addresses/${addressId}`);
    return response.data;
  },

  // ---- Siblings ----
  getSiblings: async (studentId) => {
    const response = await api.get(`/students/${studentId}/siblings`);
    return response.data; // { siblings: [...] }
  },

  linkSibling: async (studentId, siblingStudentId) => {
    const response = await api.post(`/students/${studentId}/siblings`, { siblingStudentId });
    return response.data; // { siblings: [...] }
  },

  unlinkSibling: async (studentId, siblingStudentId) => {
    const response = await api.delete(`/students/${studentId}/siblings/${siblingStudentId}`);
    return response.data;
  },

  // ---- Photos (entityType: 'student' | 'guardian'; variant: 'original' | 'thumb') ----
  getPhoto: async (entityType, entityId, variant) => {
    const response = await api.get(`/students/photos/${entityType}/${entityId}`, {
      params: variant ? { variant } : {},
    });
    return response.data; // { data: base64, mimeType, ... }
  },

  uploadPhoto: async (entityType, entityId, { fileName, mimeType, base64Data }, variant) => {
    const response = await api.post(`/students/photos/${entityType}/${entityId}`, {
      fileName,
      mimeType,
      base64Data,
    }, { params: variant ? { variant } : {} });
    return response.data;
  },

  deletePhoto: async (entityType, entityId, variant) => {
    const response = await api.delete(`/students/photos/${entityType}/${entityId}`, {
      params: variant ? { variant } : {},
    });
    return response.data;
  },

  // ---- Bulk class edit ----
  // Roster for the bulk-edit grid: every active student in the class for the year,
  // ordered by admission date, with roll / house / father-mother-guardian contacts.
  // Contacts are masked server-side unless the caller is admin/god.
  getBulkClassRoster: async ({ classId, academicYearId }, signal) => {
    const response = await api.get('/students/bulk-class', {
      params: { classId, academicYearId },
      signal,
    });
    return response.data; // { students: [...] }
  },

  // Apply staged grid edits. items: [{ studentId, rollNumber?, houseId?, examOnly?, contacts? }]
  // where contacts = { father?: { mobile?, whatsapp? }, mother?: {...}, guardian?: {...} }.
  bulkUpdateClass: async ({ classId, academicYearId, items }) => {
    const response = await api.post('/students/bulk-update', { classId, academicYearId, items });
    return response.data; // { updated, failed, results: [...] }
  },

  // ---- Promotion lifecycle ----
  promote: async (data) => {
    // { academicYearFromId, academicYearToId, items: [{ studentId, toClassId, rollNumber? }] }
    const response = await api.post('/students/promote', data);
    return response.data; // { done, skipped, results: [...] }
  },

  promoteClass: async (data) => {
    // { fromClassId, academicYearFromId, toClassId, academicYearToId, excludeStudentIds? }
    const response = await api.post('/students/promote-class', data);
    return response.data;
  },

  graduate: async (data) => {
    // { academicYearFromId, studentIds: [...] }
    const response = await api.post('/students/graduate', data);
    return response.data;
  },

  // ---- Section move (intra-year, single student) ----
  // Current enrolment + same-grade target sections (headcount + next free roll).
  getMoveSectionOptions: async (studentId, signal) => {
    const response = await api.get('/students/move-section', { params: { studentId }, signal });
    return response.data; // { student, current, targets: [...] }
  },

  // { studentId, toClassId, autoRoll? , rollNumber? }
  moveSection: async (data) => {
    const response = await api.post('/students/move-section', data);
    return response.data; // { done, fromClassName, toClassName, rollNumber, academicYearName }
  },
};
