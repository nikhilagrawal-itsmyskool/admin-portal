import api from '../config/api';

// Staff document handbook (policy documents staff must read & sign). Manager calls need
// documents.manage (god/admin); /me calls are scoped to the logged-in employee. Backed by
// the core-api `employee` module (base path /employees).
export const documentService = {
  // ── Manager ───────────────────────────────────────────────────────────────
  list: async (includeArchived = false) =>
    (await api.get('/employees/documents', { params: includeArchived ? { includeArchived: 1 } : {} })).data,
  get: async (id) => (await api.get(`/employees/documents/${id}`)).data,
  create: async (data) => (await api.post('/employees/documents', data)).data,
  update: async (id, data) => (await api.put(`/employees/documents/${id}`, data)).data,
  archive: async (id) => (await api.post(`/employees/documents/${id}/archive`)).data,
  acks: async (id) => (await api.get(`/employees/documents/${id}/acks`)).data,
  ackArtifact: async (ackId, which = 'signature') =>
    (await api.get(`/employees/documents/acks/${ackId}/artifact`, { params: { which } })).data,
  docPdf: async (id) => (await api.get(`/employees/documents/${id}/pdf`)).data,

  // ── Employee /me ────────────────────────────────────────────────────────────
  myList: async () => (await api.get('/employees/me/documents')).data,
  myGet: async (id) => (await api.get(`/employees/me/documents/${id}`)).data,
  acknowledge: async (id, data) => (await api.post(`/employees/me/documents/${id}/acknowledge`, data)).data,
  uploadSigned: async (id, data) => (await api.post(`/employees/me/documents/${id}/upload-signed`, data)).data,
  myDocPdf: async (id) => (await api.get(`/employees/me/documents/${id}/pdf`)).data,
  myArtifact: async (id, which = 'signature') =>
    (await api.get(`/employees/me/documents/${id}/artifact`, { params: { which } })).data,
};
