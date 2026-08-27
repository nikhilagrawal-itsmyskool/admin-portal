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
  // Targeted saves for the phone (one grade / one day, doesn't touch the rest).
  savePapersForGrade: async (id, grade, papers) =>
    (await api.put(`/examination/examinations/${id}/papers/${encodeURIComponent(grade)}`, { papers })).data,
  saveInvigilatorsForDate: async (id, date, assignments) =>
    (await api.put(`/examination/examinations/${id}/invigilators/date/${date}`, { assignments })).data,

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
  // The year's fee cycles (id, name, dueDate) — for the "clear dues till …" picker.
  feeCycles: async (id) => (await api.get(`/examination/examinations/${id}/fee-cycles`)).data,

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

  // ── Phase 3: invigilator PWA (/me) + signature ──────────────────────────────
  getMySignature: async () => (await api.get('/examination/me/signature')).data,
  saveMySignature: async (imageBase64, mimeType = 'image/png', fileName = 'signature.png') =>
    (await api.put('/examination/me/signature', { imageBase64, mimeType, fileName })).data,
  myInvigilations: async () => (await api.get('/examination/me/exam/invigilations')).data,
  // Read-only "Exam Schedule" (any staff): published exams + a datesheet grid.
  mySchedule: async (params = {}) => (await api.get('/examination/me/exam/schedule', { params })).data,
  myScheduleGrid: async (examId) => (await api.get(`/examination/me/exam/schedule/${examId}`)).data,
  // Student 360 exam block (exam.view): dues/override/admit-card status per published exam.
  studentExamStatus: async (studentId) => (await api.get(`/examination/examinations/student/${studentId}/status`)).data,
  myRoster: async (examId, paperId, sectionId) =>
    (await api.get(`/examination/me/exam/rosters/${examId}/${paperId}/${sectionId}`)).data,
  myMark: async (examId, paperId, sectionId, marks) =>
    (await api.post(`/examination/me/exam/rosters/${examId}/${paperId}/${sectionId}/mark`, { marks })).data,
  mySign: async (examId, paperId, sectionId) =>
    (await api.post(`/examination/me/exam/rosters/${examId}/${paperId}/${sectionId}/sign`)).data,

  // Admin/incharge sign-any (guarded exam.manage).
  adminRoster: async (id, paperId, sectionId) =>
    (await api.get(`/examination/examinations/${id}/rosters/${paperId}/${sectionId}`)).data,
  adminMark: async (id, paperId, sectionId, marks) =>
    (await api.post(`/examination/examinations/${id}/rosters/${paperId}/${sectionId}/mark`, { marks })).data,
  adminSign: async (id, paperId, sectionId) =>
    (await api.post(`/examination/examinations/${id}/rosters/${paperId}/${sectionId}/sign`)).data,
};
