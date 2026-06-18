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

  // Purchase Batches (bulk)
  createBulkPurchase: async (data) => {
    const response = await api.post('/medical/purchases/bulk', data);
    return response.data;
  },

  getPurchaseBatches: async (filters = {}) => {
    const response = await api.get('/medical/purchases/batches', { params: filters });
    return response.data;
  },

  getPurchaseBatchById: async (batchId) => {
    const response = await api.get(`/medical/purchases/batches/${batchId}`);
    return response.data;
  },

  updatePurchaseBatch: async (batchId, data) => {
    const response = await api.put(`/medical/purchases/batches/${batchId}`, data);
    return response.data;
  },

  deletePurchaseBatch: async (batchId) => {
    const response = await api.delete(`/medical/purchases/batches/${batchId}`);
    return response.data;
  },

  restorePurchaseBatch: async (batchId) => {
    const response = await api.post(`/medical/purchases/batches/${batchId}/restore`);
    return response.data;
  },

  uploadBill: async (batchId, data) => {
    const response = await api.post(`/medical/purchases/batches/${batchId}/bill`, data);
    return response.data;
  },

  getBill: async (batchId) => {
    const response = await api.get(`/medical/purchases/batches/${batchId}/bill`);
    return response.data;
  },

  deleteBill: async (batchId) => {
    const response = await api.delete(`/medical/purchases/batches/${batchId}/bill`);
    return response.data;
  },

  // Expiring Purchases
  getExpiringPurchases: async (days = 60) => {
    const response = await api.get('/medical/purchases/expiring', { params: { days } });
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
