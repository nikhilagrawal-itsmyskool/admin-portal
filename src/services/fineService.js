import api from '../config/api';

export const fineService = {
  // Stats
  getStats: async () => {
    const response = await api.get('/fine/stats');
    return response.data;
  },

  // Lookups
  getCategories: async () => {
    const response = await api.get('/fine/categories');
    return response.data;
  },

  getStatuses: async () => {
    const response = await api.get('/fine/statuses');
    return response.data;
  },

  getDecisions: async () => {
    const response = await api.get('/fine/decisions');
    return response.data;
  },

  getPaymentMethods: async () => {
    const response = await api.get('/fine/payment-methods');
    return response.data;
  },

  // Incidents
  getIncidents: async (filters = {}) => {
    const response = await api.get('/fine/incidents', { params: filters });
    return response.data;
  },

  getIncidentById: async (id) => {
    const response = await api.get(`/fine/incidents/${id}`);
    return response.data;
  },

  createIncident: async (data) => {
    const response = await api.post('/fine/incidents', data);
    return response.data;
  },

  updateIncident: async (id, data) => {
    const response = await api.put(`/fine/incidents/${id}`, data);
    return response.data;
  },

  deleteIncident: async (id) => {
    const response = await api.delete(`/fine/incidents/${id}`);
    return response.data;
  },

  // Notes
  getNotes: async (incidentId) => {
    const response = await api.get(`/fine/incidents/${incidentId}/notes`);
    return response.data;
  },

  addNote: async (incidentId, data) => {
    const response = await api.post(`/fine/incidents/${incidentId}/notes`, data);
    return response.data;
  },

  // Evidence
  uploadEvidence: async (incidentId, data) => {
    const response = await api.post(`/fine/incidents/${incidentId}/evidence`, data);
    return response.data;
  },

  getEvidence: async (incidentId, evidenceId) => {
    const response = await api.get(`/fine/incidents/${incidentId}/evidence/${evidenceId}`);
    return response.data;
  },

  deleteEvidence: async (incidentId, evidenceId) => {
    const response = await api.delete(`/fine/incidents/${incidentId}/evidence/${evidenceId}`);
    return response.data;
  },

  // Collection
  collectFine: async (incidentId, data) => {
    const response = await api.post(`/fine/incidents/${incidentId}/collect`, data);
    return response.data;
  },

  getReceipt: async (incidentId) => {
    const response = await api.get(`/fine/incidents/${incidentId}/receipt`);
    return response.data;
  },
};
