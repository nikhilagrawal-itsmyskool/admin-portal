import api from '../config/api';

// Assembly module API. Response envelopes are unwrapped to `.data`.
export const assemblyService = {
  getLookups: async () => (await api.get('/assembly/lookups')).data,

  // ---- Plans ----
  getPlans: async (params = {}) => (await api.get('/assembly/plans', { params })).data,
  getPlan: async (id) => (await api.get(`/assembly/plans/${id}`)).data, // plan + classes + days
  createPlan: async (data) => (await api.post('/assembly/plans', data)).data,
  updatePlan: async (id, data) => (await api.put(`/assembly/plans/${id}`, data)).data,
  deletePlan: async (id) => (await api.delete(`/assembly/plans/${id}`)).data,
  publishPlan: async (id) => (await api.post(`/assembly/plans/${id}/publish`)).data,
  getPlanClasses: async (id) => (await api.get(`/assembly/plans/${id}/classes`)).data,
  setPlanClasses: async (id, classIds) => (await api.put(`/assembly/plans/${id}/classes`, { classIds })).data,
  setPlanDays: async (id, days) => (await api.put(`/assembly/plans/${id}/days`, { days })).data,

  // ---- Nodes (tree) ----
  getTree: async (planId) => (await api.get(`/assembly/plans/${planId}/tree`)).data,
  createNode: async (planId, data) => (await api.post(`/assembly/plans/${planId}/nodes`, data)).data,
  reorderNodes: async (planId, parentId, order) => (await api.put(`/assembly/plans/${planId}/nodes/order`, { parentId, order })).data,
  getNode: async (id) => (await api.get(`/assembly/nodes/${id}`)).data,
  updateNode: async (id, data) => (await api.put(`/assembly/nodes/${id}`, data)).data,
  deleteNode: async (id) => (await api.delete(`/assembly/nodes/${id}`)).data,
  setNodeDays: async (id, days) => (await api.put(`/assembly/nodes/${id}/days`, { days })).data,
  setNodeResponsible: async (id, responsible) => (await api.put(`/assembly/nodes/${id}/responsible`, { responsible })).data,
  setNodeResources: async (id, resources) => (await api.put(`/assembly/nodes/${id}/resources`, { resources })).data,

  // ---- Special assemblies (nodes edited via the node endpoints above) ----
  getSpecials: async (planId, params = {}) => (await api.get(`/assembly/plans/${planId}/specials`, { params })).data,
  createSpecial: async (planId, data) => (await api.post(`/assembly/plans/${planId}/specials`, data)).data,
  getSpecial: async (id) => (await api.get(`/assembly/specials/${id}`)).data, // special + nodes
  updateSpecial: async (id, data) => (await api.put(`/assembly/specials/${id}`, data)).data,
  deleteSpecial: async (id) => (await api.delete(`/assembly/specials/${id}`)).data,
  publishSpecial: async (id) => (await api.post(`/assembly/specials/${id}/publish`)).data,
  createSpecialNode: async (specialId, data) => (await api.post(`/assembly/specials/${specialId}/nodes`, data)).data,
  reorderSpecialNodes: async (specialId, parentId, order) => (await api.put(`/assembly/specials/${specialId}/nodes/order`, { parentId, order })).data,

  // ---- Themes ----
  getThemes: async (params = {}) => (await api.get('/assembly/themes', { params })).data,
  createTheme: async (data) => (await api.post('/assembly/themes', data)).data,
  updateTheme: async (id, data) => (await api.put(`/assembly/themes/${id}`, data)).data,
  deleteTheme: async (id) => (await api.delete(`/assembly/themes/${id}`)).data,

  // ---- Resolve (preview) ----
  resolve: async (planId, date) => (await api.get('/assembly/resolve', { params: { planId, date } })).data,
};
