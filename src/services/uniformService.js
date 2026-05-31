import api from '../config/api';

const uniformService = {
  // Lookups
  getLookups: async () => {
    const response = await api.get('/uniform/lookups');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/uniform/stats');
    return response.data;
  },

  // Items & Sizes
  getItems: async (filters = {}) => {
    const response = await api.get('/uniform/items', { params: filters });
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/uniform/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/uniform/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/uniform/items/${id}`);
    return response.data;
  },

  createSize: async (itemId, data) => {
    const response = await api.post(`/uniform/items/${itemId}/sizes`, data);
    return response.data;
  },

  updateSize: async (itemId, sizeId, data) => {
    const response = await api.put(`/uniform/items/${itemId}/sizes/${sizeId}`, data);
    return response.data;
  },

  deleteSize: async (itemId, sizeId) => {
    const response = await api.delete(`/uniform/items/${itemId}/sizes/${sizeId}`);
    return response.data;
  },

  // Purchases
  getPurchases: async (filters = {}) => {
    const response = await api.get('/uniform/purchases', { params: filters });
    return response.data;
  },

  getPurchaseById: async (id) => {
    const response = await api.get(`/uniform/purchases/${id}`);
    return response.data;
  },

  createPurchase: async (data) => {
    const response = await api.post('/uniform/purchases', data);
    return response.data;
  },

  deletePurchase: async (id) => {
    const response = await api.delete(`/uniform/purchases/${id}`);
    return response.data;
  },

  uploadPurchaseBill: async (id, billData) => {
    const response = await api.put(`/uniform/purchases/${id}/bill`, billData);
    return response.data;
  },

  getPurchaseBill: async (id) => {
    const response = await api.get(`/uniform/purchases/${id}/bill`);
    return response.data;
  },

  deletePurchaseBill: async (id) => {
    const response = await api.delete(`/uniform/purchases/${id}/bill`);
    return response.data;
  },

  // Sets
  getSets: async (filters = {}) => {
    const response = await api.get('/uniform/sets', { params: filters });
    return response.data;
  },

  getSetById: async (id) => {
    const response = await api.get(`/uniform/sets/${id}`);
    return response.data;
  },

  expandSet: async (id) => {
    const response = await api.get(`/uniform/sets/${id}/expand`);
    return response.data;
  },

  createSet: async (data) => {
    const response = await api.post('/uniform/sets', data);
    return response.data;
  },

  updateSet: async (id, data) => {
    const response = await api.put(`/uniform/sets/${id}`, data);
    return response.data;
  },

  deleteSet: async (id) => {
    const response = await api.delete(`/uniform/sets/${id}`);
    return response.data;
  },

  // Sales
  getSales: async (filters = {}) => {
    const response = await api.get('/uniform/sales', { params: filters });
    return response.data;
  },

  getSaleById: async (id) => {
    const response = await api.get(`/uniform/sales/${id}`);
    return response.data;
  },

  createSale: async (data) => {
    const response = await api.post('/uniform/sales', data);
    return response.data;
  },

  addPayment: async (saleId, data) => {
    const response = await api.post(`/uniform/sales/${saleId}/payments`, data);
    return response.data;
  },

  createReturn: async (saleId, data) => {
    const response = await api.post(`/uniform/sales/${saleId}/returns`, data);
    return response.data;
  },

  getReturnEvidence: async (saleId, returnId) => {
    const response = await api.get(`/uniform/sales/${saleId}/returns/${returnId}/evidence`);
    return response.data;
  },
};

export default uniformService;
