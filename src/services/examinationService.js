import api from '../config/api';

// Examination module: exam header + config, the grade×date datesheet grid, and
// per-(date, section) invigilator assignment. v1 is the admit-card foundation.
export const examinationService = {
  list: async (params = {}) => (await api.get('/examination/examinations', { params })).data,
  create: async (body) => (await api.post('/examination/examinations', body)).data,
  get: async (id) => (await api.get(`/examination/examinations/${id}`)).data,
  update: async (id, body) => (await api.patch(`/examination/examinations/${id}`, body)).data,
  remove: async (id) => (await api.delete(`/examination/examinations/${id}`)).data,

  // Datesheet grid: { examId, status, grades:[{grade,seq}], dates:[iso], papers:[{grade,examDate,subjectLabel}] }
  getGrid: async (id) => (await api.get(`/examination/examinations/${id}/grid`)).data,
  savePapers: async (id, papers) => (await api.put(`/examination/examinations/${id}/papers`, { papers })).data,

  // Invigilators: { examId, dates:[iso], sections:[{classId,name,grade,seq}], gradesByDate, assignments, conflicts }
  getInvigilators: async (id) => (await api.get(`/examination/examinations/${id}/invigilators`)).data,
  saveInvigilators: async (id, assignments) =>
    (await api.put(`/examination/examinations/${id}/invigilators`, { assignments })).data,
};
