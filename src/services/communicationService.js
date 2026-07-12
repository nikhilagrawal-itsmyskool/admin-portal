import api from '../config/api';

export const communicationService = {
  // Lookups
  getChannels: async () => {
    const response = await api.get('/communication/lookups/channels');
    return response.data; // { channels: [{ value, label }] }
  },

  // Variables the backend auto-fills per recipient (by audience type + union).
  // The Compose UI subtracts these from a template's variables so it only prompts
  // for the sender-supplied ones.
  getVariables: async () => {
    const response = await api.get('/communication/lookups/variables');
    return response.data; // { autoVariables: { student, employee }, autoVariablesAll: [...] }
  },

  // Templates
  listTemplates: async () => {
    const response = await api.get('/communication/templates');
    return response.data; // { templates: [...] }
  },

  getTemplate: async (id) => {
    const response = await api.get(`/communication/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await api.post('/communication/templates', data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await api.put(`/communication/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id) => {
    const response = await api.delete(`/communication/templates/${id}`);
    return response.data;
  },

  restoreTemplate: async (id) => {
    const response = await api.post(`/communication/templates/${id}/restore`);
    return response.data;
  },

  // Messages
  sendMessage: async (data) => {
    const response = await api.post('/communication/messages', data);
    return response.data; // { jobId, status }
  },

  previewMessage: async (data) => {
    const response = await api.post('/communication/messages/preview', data);
    return response.data; // { availableChannels, targetCount, counts, recipients }
  },

  listMessages: async () => {
    const response = await api.get('/communication/messages');
    return response.data; // { jobs: [...] }
  },

  getMessage: async (id) => {
    const response = await api.get(`/communication/messages/${id}`);
    return response.data; // job + recipients
  },

  cancelMessage: async (id) => {
    const response = await api.post(`/communication/messages/${id}/cancel`);
    return response.data;
  },
};
