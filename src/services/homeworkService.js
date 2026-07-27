import api from '../config/api';

// Homework: a class teacher posts the day's homework as photos for a base class,
// as a draft, then Publishes it (visible to students) — Unpublish returns it to
// draft to fix. The admin surface (below) acts on any class; the teacher PWA uses
// the /me mirrors (scoped to the resolved class teacher).
export const homeworkService = {
  // The day's header + items (each item has a presigned imageUrl in prod).
  getDay: async ({ classId, date, academicYearId }) => {
    const response = await api.get('/homework/day', { params: { classId, date, academicYearId } });
    return response.data;
  },

  // Ensure a draft day exists for class+date (idempotent). Returns the day.
  ensureDay: async ({ classId, date, academicYearId }) => {
    const response = await api.post('/homework/day', { classId, date, academicYearId });
    return response.data;
  },

  // Add a photo: { classId, date, academicYearId?, subjectLabel?, note?,
  // image: { fileName, mimeType, base64Data } }. Returns the refreshed day.
  addItem: async (data) => {
    const response = await api.post('/homework/items', data);
    return response.data;
  },

  // Edit a photo's label/note (draft only). Returns the refreshed day.
  editItem: async (itemId, data) => {
    const response = await api.put(`/homework/items/${itemId}`, data);
    return response.data;
  },

  // Remove a photo (draft only): deletes the blob + soft-deletes. Returns the day.
  removeItem: async (itemId) => {
    const response = await api.delete(`/homework/items/${itemId}`);
    return response.data;
  },

  // Raw base64 for a single photo (fallback / local dev): { dataUri, mimeType }.
  getItemImage: async (itemId) => {
    const response = await api.get(`/homework/items/${itemId}/image`);
    return response.data;
  },

  publishDay: async (dayId) => {
    const response = await api.post(`/homework/day/${dayId}/publish`);
    return response.data;
  },

  unpublishDay: async (dayId) => {
    const response = await api.post(`/homework/day/${dayId}/unpublish`);
    return response.data;
  },

  // Append-only activity trail for a class+date.
  getAudit: async ({ classId, date }) => {
    const response = await api.get('/homework/audit', { params: { classId, date } });
    return response.data;
  },

  // ── Admin: class → class-teacher mapping override ──────────────────────────
  // Every base class with its resolved teacher (override vs timetable-derived).
  getClassTeachers: async (academicYearId) => {
    const response = await api.get('/homework/class-teachers', { params: { academicYearId } });
    return response.data;
  },

  setClassTeacher: async (classId, { teacherId, academicYearId }) => {
    const response = await api.put(`/homework/class-teachers/${classId}`, { teacherId, academicYearId });
    return response.data;
  },

  clearClassTeacher: async (classId, academicYearId) => {
    const response = await api.delete(`/homework/class-teachers/${classId}`, { params: { academicYearId } });
    return response.data;
  },
};
