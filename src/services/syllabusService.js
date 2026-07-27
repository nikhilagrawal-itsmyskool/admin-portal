import api from '../config/api';

export const syllabusService = {
  // Lookups (months, entry types, terms, layouts, progress statuses)
  getLookups: async () => {
    const response = await api.get('/syllabus/lookups');
    return response.data;
  },
  // Grades derived from base class names, each with its base sections
  getGrades: async (params = {}) => {
    const response = await api.get('/syllabus/grades', { params });
    return response.data; // [{ grade, sections: [{ classId, className }] }]
  },
  // Stream catalog (class_stream), e.g. [{ code: 'SCI', name: 'Science' }]
  getStreams: async () => {
    const response = await api.get('/syllabus/streams');
    return response.data;
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
    return response.data; // header + subjectName + componentLayout + ordered entries
  },
  getSyllabusSource: async (id) => {
    const response = await api.get(`/syllabus/syllabi/${id}/source`);
    return response.data; // { fileName, mimeType, base64Data }
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

  // ---- Plan ↔ teacher assignment (per section) ----
  getPlanTeachers: async (syllabusId) => {
    const response = await api.get(`/syllabus/syllabi/${syllabusId}/teachers`);
    return response.data; // [{ uuid, classId, className, teacherId, teacherName }]
  },
  getTeacherSuggestions: async (syllabusId) => {
    // Live timetable resolve: per section, the teacher who teaches the matching
    // subject in the timetable. [{ classId, className, teacherId, teacherName, matchedSubject }]
    const response = await api.get(`/syllabus/syllabi/${syllabusId}/teacher-suggestions`);
    return response.data;
  },
  assignTeacher: async (syllabusId, { classId, teacherId }) => {
    const response = await api.post(`/syllabus/syllabi/${syllabusId}/teachers`, { classId, teacherId });
    return response.data;
  },
  unassignTeacher: async (assignmentId) => {
    const response = await api.delete(`/syllabus/teachers/${assignmentId}`);
    return response.data;
  },

  // ---- Teacher PWA: my assigned plans (employee token) ----
  getMyPlans: async () => {
    const response = await api.get('/syllabus/my-plans');
    return response.data; // [{ assignmentId, syllabusId, grade, subjectName, layout, classId, className, totalTopics, coveredTopics }]
  },

  // ---- Model papers ----
  getModelPapers: async (params = {}) => {
    // params: { academicYearId, grade, streamCode, subjectId, exam }
    const response = await api.get('/syllabus/model-papers', { params });
    return response.data; // [{ uuid, subjectId, subjectName, streamCode, exam, answerKeyReleased, docs:[...] }]
  },
  uploadModelPaper: async (data) => {
    // { academicYearId, grade, streamCode?, subjectId, exam, docType, fileName, base64Data, pdfFileName?, pdfBase64Data? }
    const response = await api.post('/syllabus/model-papers/upload', data);
    return response.data; // the refreshed paper
  },
  setAnswerKeyReleased: async (paperId, released) => {
    const response = await api.put(`/syllabus/model-papers/${paperId}/answer-key`, { released });
    return response.data;
  },
  deleteModelPaperDoc: async (docId) => {
    const response = await api.delete(`/syllabus/model-papers/docs/${docId}`);
    return response.data;
  },
  deleteModelPaper: async (paperId) => {
    // Removes the whole row (header + every document). Admin/god only.
    const response = await api.delete(`/syllabus/model-papers/${paperId}`);
    return response.data;
  },
  getModelPaperFile: async (docId, format = 'pdf') => {
    const response = await api.get(`/syllabus/model-papers/docs/${docId}/file`, { params: { format } });
    return response.data; // { fileName, mimeType, base64Data }
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
