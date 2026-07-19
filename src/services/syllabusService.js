import api from '../config/api';

export const syllabusService = {
  // Lookups (months, entry types, terms, layouts, progress statuses)
  getLookups: async () => {
    const response = await api.get('/syllabus/lookups');
    return response.data;
  },
  // Grades derived from class names, each with its sections
  getGrades: async (params = {}) => {
    const response = await api.get('/syllabus/grades', { params });
    return response.data; // [{ grade, sections: [{ classId, className }] }]
  },

  // ---- Subjects ----
  getSubjects: async (params = {}) => {
    const response = await api.get('/syllabus/subjects', { params });
    return response.data;
  },
  createSubject: async (data) => {
    const response = await api.post('/syllabus/subjects', data);
    return response.data;
  },
  updateSubject: async (id, data) => {
    const response = await api.put(`/syllabus/subjects/${id}`, data);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await api.delete(`/syllabus/subjects/${id}`);
    return response.data;
  },

  // ---- Plans ----
  getSyllabi: async (params = {}) => {
    // params: { academicYearId, grade, subjectId }
    const response = await api.get('/syllabus/syllabi', { params });
    return response.data;
  },
  getSyllabus: async (id) => {
    const response = await api.get(`/syllabus/syllabi/${id}`);
    return response.data; // header + subjectName + ordered entries
  },
  createSyllabus: async (data) => {
    const response = await api.post('/syllabus/syllabi', data);
    return response.data;
  },
  updateSyllabus: async (id, data) => {
    const response = await api.put(`/syllabus/syllabi/${id}`, data);
    return response.data;
  },
  deleteSyllabus: async (id) => {
    const response = await api.delete(`/syllabus/syllabi/${id}`);
    return response.data;
  },

  // ---- Entries ----
  addEntry: async (syllabusId, data) => {
    const response = await api.post(`/syllabus/syllabi/${syllabusId}/entries`, data);
    return response.data;
  },
  bulkEntries: async (syllabusId, { mode, entries }) => {
    const response = await api.post(`/syllabus/syllabi/${syllabusId}/entries/bulk`, { mode, entries });
    return response.data; // full ordered entry list
  },
  reorderEntries: async (syllabusId, order) => {
    // order = [entryUuid, ...]
    const response = await api.put(`/syllabus/syllabi/${syllabusId}/entries/order`, { order });
    return response.data; // full ordered entry list
  },
  updateEntry: async (entryId, data) => {
    const response = await api.put(`/syllabus/entries/${entryId}`, data);
    return response.data;
  },
  deleteEntry: async (entryId) => {
    const response = await api.delete(`/syllabus/entries/${entryId}`);
    return response.data;
  },

  // ---- Progress (per section) ----
  getProgressRoster: async (syllabusId, classId) => {
    const response = await api.get(`/syllabus/syllabi/${syllabusId}/progress`, { params: { classId } });
    return response.data; // { syllabusId, classId, className, counts, entries }
  },
  markProgress: async (data) => {
    // { entryId, classId, status, coveredDate?, remark? }
    const response = await api.post('/syllabus/progress', data);
    return response.data;
  },
  markProgressBulk: async (data) => {
    // { classId, marks: [{ entryId, status, coveredDate?, remark? }] }
    const response = await api.post('/syllabus/progress/bulk', data);
    return response.data; // { marked }
  },
};
