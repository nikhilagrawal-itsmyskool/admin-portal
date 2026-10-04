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
  setBrandingText: async (body) => (await api.put('/examination/branding', body)).data,

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
  mySign: async (examId, paperId, sectionId, signatureBase64) =>
    (await api.post(`/examination/me/exam/rosters/${examId}/${paperId}/${sectionId}/sign`, { signatureBase64 })).data,

  // Admin/incharge sign-any (guarded exam.manage).
  adminRoster: async (id, paperId, sectionId) =>
    (await api.get(`/examination/examinations/${id}/rosters/${paperId}/${sectionId}`)).data,
  adminMark: async (id, paperId, sectionId, marks) =>
    (await api.post(`/examination/examinations/${id}/rosters/${paperId}/${sectionId}/mark`, { marks })).data,
  adminSign: async (id, paperId, sectionId, signatureBase64) =>
    (await api.post(`/examination/examinations/${id}/rosters/${paperId}/${sectionId}/sign`, { signatureBase64 })).data,

  // Class-wise attendance sheet (exam.manage) — one section, one date, across rooms.
  classAttendance: async (id, sectionId, date) =>
    (await api.get(`/examination/examinations/${id}/class-attendance/${sectionId}/${date}`)).data,
  markClassAttendance: async (id, sectionId, date, marks) =>
    (await api.post(`/examination/examinations/${id}/class-attendance/${sectionId}/${date}`, { marks })).data,

  // ── Phase 4: seating rooms ──────────────────────────────────────────────────
  // Rooms: { examId, rooms:[{uuid,name,sortOrder,allocations:[{uuid,sectionClassId,sectionName,grade,rollFrom,rollTo}]}] }
  getRooms: async (id) => (await api.get(`/examination/examinations/${id}/rooms`)).data,
  // Rooms with allocations resolved for one exam date (per-date override or base). Adds
  // { examDate, dateHasCustom, rooms:[{ ...room, hasOverride }] }.
  getRoomsForDate: async (id, date) => (await api.get(`/examination/examinations/${id}/rooms/date/${date}`)).data,
  saveRoom: async (id, body) => (await api.post(`/examination/examinations/${id}/rooms`, body)).data,
  deleteRoom: async (id, roomId) => (await api.delete(`/examination/examinations/${id}/rooms/${roomId}`)).data,
  // examDate present → save this room's one-day override; absent → the base plan.
  saveRoomAllocations: async (id, roomId, allocations, examDate) =>
    (await api.put(`/examination/examinations/${id}/rooms/${roomId}/allocations`, { allocations, examDate })).data,
  customiseSeatingDay: async (id, date) =>
    (await api.post(`/examination/examinations/${id}/seating/date/${date}/customise`, {})).data,
  revertSeatingDay: async (id, date) =>
    (await api.post(`/examination/examinations/${id}/seating/date/${date}/revert`, {})).data,
  copyRooms: async (id, sourceExamId) =>
    (await api.post(`/examination/examinations/${id}/rooms/copy`, { sourceExamId })).data,

  // Room invigilators: { examId, rooms, dates, gradesByDate, activeByDate, assignments:[{examDate,roomId,employeeId,employeeName}], conflicts }
  getRoomInvigilators: async (id) => (await api.get(`/examination/examinations/${id}/room-invigilators`)).data,
  saveRoomInvigilatorsForDate: async (id, date, assignments) =>
    (await api.put(`/examination/examinations/${id}/room-invigilators/date/${date}`, { assignments })).data,

  // Day-level reliever pool (break cover). Returns the refreshed room-invigilator view.
  saveRelieversForDate: async (id, date, employeeIds) =>
    (await api.put(`/examination/examinations/${id}/relievers/date/${date}`, { employeeIds })).data,

  // Room roster: { room, examDate, rollNumbersAvailable, sections:[{sectionClassId,sectionName,grade,subjectLabel,rollFrom,rollTo,students:[{studentId,name,admissionNumber,rollNumber,paperId,status}]}], total, marked, signed, signedByName, signedAt }
  adminRoomRoster: async (id, roomId, date) =>
    (await api.get(`/examination/examinations/${id}/room-rosters/${roomId}/${date}`)).data,
  adminRoomMark: async (id, roomId, date, marks) =>
    (await api.post(`/examination/examinations/${id}/room-rosters/${roomId}/${date}/mark`, { marks })).data,
  adminRoomSign: async (id, roomId, date, signatureBase64) =>
    (await api.post(`/examination/examinations/${id}/room-rosters/${roomId}/${date}/sign`, { signatureBase64 })).data,
  // AV room: add/remove a student for a date (action 'add' | 'remove'). Returns the AV roster.
  adminAvStudent: async (id, roomId, date, studentId, action) =>
    (await api.post(`/examination/examinations/${id}/room-rosters/${roomId}/${date}/av-students`, { studentId, action })).data,

  // Per-room plan image: { fileId, dataUri }
  getRoomImage: async (id, roomId) => (await api.get(`/examination/examinations/${id}/rooms/${roomId}/image`)).data,
  setRoomImage: async (id, roomId, imageBase64, mimeType, fileName) =>
    (await api.put(`/examination/examinations/${id}/rooms/${roomId}/image`, { imageBase64, mimeType, fileName })).data,
  deleteRoomImage: async (id, roomId) => (await api.delete(`/examination/examinations/${id}/rooms/${roomId}/image`)).data,

  // Seating-plan image (uploaded photo of the room plan): { fileId, dataUri }
  getSeatingImage: async (id) => (await api.get(`/examination/examinations/${id}/seating-image`)).data,
  setSeatingImage: async (id, imageBase64, mimeType, fileName) =>
    (await api.put(`/examination/examinations/${id}/seating-image`, { imageBase64, mimeType, fileName })).data,
  deleteSeatingImage: async (id) => (await api.delete(`/examination/examinations/${id}/seating-image`)).data,

  // /me room duties (PWA)
  myRooms: async () => (await api.get('/examination/me/exam/rooms')).data,
  myRoomRoster: async (examId, roomId, date) =>
    (await api.get(`/examination/me/exam/rooms/${examId}/${roomId}/${date}`)).data,
  myRoomMark: async (examId, roomId, date, marks) =>
    (await api.post(`/examination/me/exam/rooms/${examId}/${roomId}/${date}/mark`, { marks })).data,
  myRoomSign: async (examId, roomId, date, signatureBase64) =>
    (await api.post(`/examination/me/exam/rooms/${examId}/${roomId}/${date}/sign`, { signatureBase64 })).data,
  myAvStudent: async (examId, roomId, date, studentId, action) =>
    (await api.post(`/examination/me/exam/rooms/${examId}/${roomId}/${date}/av-students`, { studentId, action })).data,

  // ── Report cards: marks (subject teacher) + co-scholastic (class teacher) + progress ──
  myReportSubjects: async (ay) => (await api.get('/examination/me/report/subjects', { params: ay ? { ay } : {} })).data,
  myReportMarks: async (classId, subjectCode, term, ay) =>
    (await api.get(`/examination/me/report/marks/${classId}/${subjectCode}/${term}`, { params: ay ? { ay } : {} })).data,
  saveReportMarks: async (classId, subjectCode, term, entries, ay) =>
    (await api.post(`/examination/me/report/marks/${classId}/${subjectCode}/${term}`, { entries }, { params: ay ? { ay } : {} })).data,
  myReportClasses: async (ay) => (await api.get('/examination/me/report/classes', { params: ay ? { ay } : {} })).data,
  myReportCoscholastic: async (classId, term, ay) =>
    (await api.get(`/examination/me/report/coscholastic/${classId}/${term}`, { params: ay ? { ay } : {} })).data,
  saveReportCoscholastic: async (classId, term, entries, ay) =>
    (await api.post(`/examination/me/report/coscholastic/${classId}/${term}`, { entries }, { params: ay ? { ay } : {} })).data,
  // Marks/co-scholastic submit (validated complete) + admin lock/unlock.
  submitReportMarks: async (classId, subjectCode, term, ay) =>
    (await api.post('/examination/me/report/submit-marks', { classId, subjectCode, term }, { params: ay ? { ay } : {} })).data,
  submitReportCoscholastic: async (classId, term, ay) =>
    (await api.post('/examination/me/report/submit-coscholastic', { classId, term }, { params: ay ? { ay } : {} })).data,
  // target: a subjectCode, '__cosch__', or '__all__' (whole class). admin/incharge/god.
  setReportLock: async (classId, term, target, locked, ay) =>
    (await api.post('/examination/report/lock', { classId, term, target, locked }, { params: ay ? { ay } : {} })).data,
  setReportClassExcluded: async (classId, excluded, ay) =>
    (await api.post('/examination/report/exclude-class', { classId, excluded }, { params: ay ? { ay } : {} })).data,
  // Class-teacher report-card review: view own class's cards + OK (approve) them.
  myReportCards: async (classId, term, ay) =>
    (await api.get(`/examination/me/report/cards/${classId}/${term}`, { params: ay ? { ay } : {} })).data,
  approveReportCards: async (classId, term, studentIds, approve, ay) =>
    (await api.post('/examination/me/report/approve', { classId, term, studentIds, approve }, { params: ay ? { ay } : {} })).data,
  reportProgress: async (term, ay) =>
    (await api.get(`/examination/report/progress/${term}`, { params: ay ? { ay } : {} })).data,
  reportMapping: async (classId, ay) =>
    (await api.get(`/examination/report/mapping/${classId}`, { params: ay ? { ay } : {} })).data,
  // action: 'add' | 'remove' — additive subject teacher (on top of the syllabus teacher).
  setReportTeacher: async (classId, subjectCode, teacherId, action, ay) =>
    (await api.post(`/examination/report/mapping/${classId}`, { subjectCode, teacherId, action }, { params: ay ? { ay } : {} })).data,
  reportClassTeachers: async (classId, ay) =>
    (await api.get(`/examination/report/class-teachers/${classId}`, { params: ay ? { ay } : {} })).data,
  setReportClassTeacher: async (classId, teacherId, allSubjects, action, ay) =>
    (await api.post(`/examination/report/class-teachers/${classId}`, { teacherId, allSubjects, action }, { params: ay ? { ay } : {} })).data,
  // Remark-suggestion library: teachers read /me (picker); admins manage via /report.
  myRemarkTemplates: async () => (await api.get('/examination/me/report/remark-templates')).data,
  remarkTemplates: async () => (await api.get('/examination/report/remark-templates')).data,
  saveRemarkTemplate: async (payload) => (await api.post('/examination/report/remark-templates', { ...payload, action: 'save' })).data,
  deleteRemarkTemplate: async (uuid) => (await api.post('/examination/report/remark-templates', { uuid, action: 'delete' })).data,
  reportClasses: async (ay) => (await api.get('/examination/report/classes', { params: ay ? { ay } : {} })).data,
  coscholasticProgress: async (term, ay) =>
    (await api.get(`/examination/report/coscholastic-progress/${term}`, { params: ay ? { ay } : {} })).data,
  reportCards: async (classId, term, ay) =>
    (await api.get(`/examination/report/cards/${classId}/${term}`, { params: ay ? { ay } : {} })).data,
  recordReportPrint: async (classId, term, studentIds, ay) =>
    (await api.post(`/examination/report/cards/${classId}/${term}`, { studentIds }, { params: ay ? { ay } : {} })).data,
  reportPhoto: async (studentId) => (await api.get(`/examination/report/photo/${studentId}`)).data,
  getReportScheme: async (band, ay) =>
    (await api.get(`/examination/report/scheme/${encodeURIComponent(band)}`, { params: ay ? { ay } : {} })).data,
  saveReportScheme: async (band, payload, ay) =>
    (await api.post(`/examination/report/scheme/${encodeURIComponent(band)}`, payload, { params: ay ? { ay } : {} })).data,
  getReportConfig: async (ay) => (await api.get('/examination/report/config', { params: ay ? { ay } : {} })).data,
  setReportConfig: async (term2StartsOn, remarkRequiredFinal, ay) =>
    (await api.post('/examination/report/config', { term2StartsOn, remarkRequiredFinal }, { params: ay ? { ay } : {} })).data,
};
