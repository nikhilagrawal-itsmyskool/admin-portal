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

  // ── Phase 2: roster + dues gate, admit cards, printing, overrides, branding ──
  // Roster: { section, thresholds:{current,prior}, students:[{studentId,name,admissionNumber,currentDue,priorDue,blocked,overridden,printable}] }
  roster: async (id, sectionId) =>
    (await api.get(`/examination/examinations/${id}/classes/${sectionId}/roster`)).data,
  printPreview: async (id, sectionId, cardsPerPage) =>
    (await api.get(`/examination/examinations/${id}/classes/${sectionId}/print-preview`, { params: { cardsPerPage } })).data,
  // Admit-card render data: { exam:{name,academicYearName,cardsPerPage}, section:{name,grade}, branding:{logoDataUri,stampDataUri}, papers:[{examDate,subjectLabel}], cards:[{admitCardId,studentId,name,rollNo,qrDataUri}] }
  admitCards: async (id, sectionId, studentIds) =>
    (await api.get(`/examination/examinations/${id}/classes/${sectionId}/admit-cards`,
      { params: studentIds && studentIds.length ? { studentIds: studentIds.join(',') } : {} })).data,
  recordPrint: async (id, sectionId, body) =>
    (await api.post(`/examination/examinations/${id}/classes/${sectionId}/print`, body)).data,
  printLog: async (id) => (await api.get(`/examination/examinations/${id}/print-log`)).data,

  listOverrides: async (id) => (await api.get(`/examination/examinations/${id}/dues-overrides`)).data,
  createOverrides: async (id, studentIds, reason) =>
    (await api.post(`/examination/examinations/${id}/dues-overrides`, { studentIds, reason })).data,
  revokeOverride: async (id, studentId) =>
    (await api.delete(`/examination/examinations/${id}/dues-overrides/${studentId}`)).data,

  // Central branding (logo + office stamp). kind = 'logo' | 'stamp'.
  getBranding: async () => (await api.get('/examination/branding')).data,
  setBranding: async (kind, imageBase64, mimeType, fileName) =>
    (await api.put(`/examination/branding/${kind}`, { imageBase64, mimeType, fileName })).data,

  // Staff QR verify → live admit-card view.
  verify: async (admitCardId) => (await api.get(`/examination/verify/${admitCardId}`)).data,
};
