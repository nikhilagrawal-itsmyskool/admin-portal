import api from '../config/api';

export const hiringService = {
  // Lookups (all dropdown catalogs in one call)
  getLookups: async () => {
    const response = await api.get('/hiring/lookups');
    return response.data;
  },

  // Candidates
  getCandidates: async (filters = {}) => {
    const response = await api.get('/hiring/candidates', { params: filters });
    return response.data;
  },

  getCandidateById: async (id) => {
    const response = await api.get(`/hiring/candidates/${id}`);
    return response.data;
  },

  createCandidate: async (data) => {
    const response = await api.post('/hiring/candidates', data);
    return response.data;
  },

  updateCandidate: async (id, data) => {
    const response = await api.put(`/hiring/candidates/${id}`, data);
    return response.data;
  },

  deleteCandidate: async (id) => {
    const response = await api.delete(`/hiring/candidates/${id}`);
    return response.data;
  },

  // Stages
  addStage: async (candidateId, data) => {
    const response = await api.post(`/hiring/candidates/${candidateId}/stages`, data);
    return response.data;
  },

  updateStage: async (candidateId, stageId, data) => {
    const response = await api.put(`/hiring/candidates/${candidateId}/stages/${stageId}`, data);
    return response.data;
  },

  deleteStage: async (candidateId, stageId) => {
    const response = await api.delete(`/hiring/candidates/${candidateId}/stages/${stageId}`);
    return response.data;
  },

  // Files (photo / resume). data = { kind, fileName, mimeType, base64Data }
  uploadFile: async (candidateId, data) => {
    const response = await api.post(`/hiring/candidates/${candidateId}/files`, data);
    return response.data;
  },

  deleteFile: async (candidateId, kind) => {
    const response = await api.delete(`/hiring/candidates/${candidateId}/files/${kind}`);
    return response.data;
  },

  getFile: async (fileId) => {
    const response = await api.get(`/hiring/files/${fileId}`);
    return response.data;
  },
};
