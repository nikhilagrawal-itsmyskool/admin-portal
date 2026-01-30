import api from '../config/api';

export const medicalService = {
  // Lookup data
  getUnits: async () => {
    const response = await api.get('/medical/units');
    return response.data;
  },

  // Medical Items
  getItems: async (search = '') => {
    const response = await api.get('/medical/items', {
      params: search ? { search } : {},
    });
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/medical/items/${id}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/medical/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/medical/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/medical/items/${id}`);
    return response.data;
  },

  // Purchase Logs
  getPurchases: async (filters = {}) => {
    // filters: { itemId, startDate, endDate }
    const response = await api.get('/medical/purchases', { params: filters });
    return response.data;
  },

  getPurchaseById: async (id) => {
    const response = await api.get(`/medical/purchases/${id}`);
    return response.data;
  },

  createPurchase: async (data) => {
    const response = await api.post('/medical/purchases', data);
    return response.data;
  },

  updatePurchase: async (id, data) => {
    const response = await api.put(`/medical/purchases/${id}`, data);
    return response.data;
  },

  deletePurchase: async (id) => {
    const response = await api.delete(`/medical/purchases/${id}`);
    return response.data;
  },

  // Issue Logs
  getIssues: async (params = {}) => {
    const response = await api.get('/medical/issues', { params });
    return response.data;
  },

  getIssueById: async (id) => {
    const response = await api.get(`/medical/issues/${id}`);
    return response.data;
  },

  createIssue: async (data) => {
    const response = await api.post('/medical/issues', data);
    return response.data;
  },

  updateIssue: async (id, data) => {
    const response = await api.put(`/medical/issues/${id}`, data);
    return response.data;
  },

  deleteIssue: async (id) => {
    const response = await api.delete(`/medical/issues/${id}`);
    return response.data;
  },
};
