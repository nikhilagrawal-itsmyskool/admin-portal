import api from '../config/api';

export const sportsService = {
  // Lookups
  getUnits: async () => {
    const response = await api.get('/sports/lookups/units');
    return response.data;
  },

  getSportTypes: async () => {
    const response = await api.get('/sports/lookups/sport-types');
    return response.data;
  },

  getCategories: async (sportType) => {
    const params = sportType ? { sportType } : {};
    const response = await api.get('/sports/lookups/categories', { params });
    return response.data;
  },

  getConditions: async () => {
    const response = await api.get('/sports/lookups/conditions');
    return response.data;
  },

  // Sport In-charges (per sport type; multiple allowed)
  getIncharges: async () => {
    const response = await api.get('/sports/sports/incharges');
    return response.data;
  },

  getInchargesBySport: async (sportType) => {
    const response = await api.get(`/sports/sports/${sportType}/incharges`);
    return response.data;
  },

  setIncharges: async (sportType, inChargeIds) => {
    const response = await api.put(`/sports/sports/${sportType}/incharges`, { inChargeIds });
    return response.data;
  },

  // Items CRUD
  getItems: async (filters = {}) => {
    const response = await api.get('/sports/items', { params: filters });
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/sports/items/${id}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/sports/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/sports/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/sports/items/${id}`);
    return response.data;
  },

  // Purchase Batches
  createBulkPurchase: async (data) => {
    const response = await api.post('/sports/purchases/bulk', data);
    return response.data;
  },

  getPurchaseBatches: async (filters = {}) => {
    const response = await api.get('/sports/purchases/batches', { params: filters });
    return response.data;
  },

  getPurchaseBatchById: async (batchId) => {
    const response = await api.get(`/sports/purchases/batches/${batchId}`);
    return response.data;
  },

  updatePurchaseBatch: async (batchId, data) => {
    const response = await api.put(`/sports/purchases/batches/${batchId}`, data);
    return response.data;
  },

  deletePurchaseBatch: async (batchId) => {
    const response = await api.delete(`/sports/purchases/batches/${batchId}`);
    return response.data;
  },

  restorePurchaseBatch: async (batchId) => {
    const response = await api.post(`/sports/purchases/batches/${batchId}/restore`);
    return response.data;
  },

  uploadSportBill: async (batchId, data) => {
    const response = await api.post(`/sports/purchases/batches/${batchId}/bill`, data);
    return response.data;
  },

  getSportBill: async (batchId) => {
    const response = await api.get(`/sports/purchases/batches/${batchId}/bill`);
    return response.data;
  },

  deleteSportBill: async (batchId) => {
    const response = await api.delete(`/sports/purchases/batches/${batchId}/bill`);
    return response.data;
  },

  // Purchases CRUD
  getPurchases: async (filters = {}) => {
    const response = await api.get('/sports/purchases', { params: filters });
    return response.data;
  },

  getPurchaseById: async (id) => {
    const response = await api.get(`/sports/purchases/${id}`);
    return response.data;
  },

  createPurchase: async (data) => {
    const response = await api.post('/sports/purchases', data);
    return response.data;
  },

  updatePurchase: async (id, data) => {
    const response = await api.put(`/sports/purchases/${id}`, data);
    return response.data;
  },

  deletePurchase: async (id) => {
    const response = await api.delete(`/sports/purchases/${id}`);
    return response.data;
  },

  // Issues CRUD + Return
  getIssues: async (filters = {}) => {
    const response = await api.get('/sports/issues', { params: filters });
    return response.data;
  },

  getIssueById: async (id) => {
    const response = await api.get(`/sports/issues/${id}`);
    return response.data;
  },

  createIssue: async (data) => {
    const response = await api.post('/sports/issues', data);
    return response.data;
  },

  updateIssue: async (id, data) => {
    const response = await api.put(`/sports/issues/${id}`, data);
    return response.data;
  },

  deleteIssue: async (id) => {
    const response = await api.delete(`/sports/issues/${id}`);
    return response.data;
  },

  returnIssue: async (id, data) => {
    const response = await api.put(`/sports/issues/${id}/return`, data);
    return response.data;
  },

  // Breakages CRUD
  getBreakages: async (filters = {}) => {
    const response = await api.get('/sports/breakages', { params: filters });
    return response.data;
  },

  getBreakageById: async (id) => {
    const response = await api.get(`/sports/breakages/${id}`);
    return response.data;
  },

  createBreakage: async (data) => {
    const response = await api.post('/sports/breakages', data);
    return response.data;
  },

  updateBreakage: async (id, data) => {
    const response = await api.put(`/sports/breakages/${id}`, data);
    return response.data;
  },

  deleteBreakage: async (id) => {
    const response = await api.delete(`/sports/breakages/${id}`);
    return response.data;
  },

  getBreakageImage: async (id) => {
    const response = await api.get(`/sports/breakages/${id}/image`);
    return response.data;
  },

  deleteBreakageImage: async (id) => {
    const response = await api.delete(`/sports/breakages/${id}/image`);
    return response.data;
  },
};
