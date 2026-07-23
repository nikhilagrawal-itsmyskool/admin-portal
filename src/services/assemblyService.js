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
  setNodeDayContent: async (id, content) => (await api.put(`/assembly/nodes/${id}/day-content`, { content })).data,

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

  // ═══ House mode ═══════════════════════════════════════════════════════════

  // ---- Config (mode + branding) ----
  getConfig: async () => (await api.get('/assembly/config')).data, // { mode, title?, subtitle? }
  setConfig: async (data) => (await api.put('/assembly/config', data)).data,

  // ---- Houses & rotation (leadership lives in the student module) ----
  getHouses: async () => (await api.get('/assembly/houses')).data, // [{ houseId, name, rotationOrder?, incharge*, teachers }]
  setHouseRotation: async (houseId, sortOrder) => (await api.put(`/assembly/houses/${houseId}/rotation`, { sortOrder })).data,
  getRotation: async (planId, params = {}) => (await api.get(`/assembly/plans/${planId}/rotation`, { params })).data, // week calendar
  setWeekHouse: async (planId, weekStart, houseId) => (await api.put(`/assembly/plans/${planId}/rotation`, { weekStart, houseId })).data,

  // ---- Weekly roster (Phase B) ----
  ensureWeek: async (planId, weekStart) => (await api.post(`/assembly/plans/${planId}/weeks`, { weekStart })).data,
  listWeeks: async (planId, params = {}) => (await api.get(`/assembly/plans/${planId}/weeks`, { params })).data,
  getWeek: async (weekId) => (await api.get(`/assembly/weeks/${weekId}`)).data,
  saveRoster: async (weekId, data) => (await api.put(`/assembly/weeks/${weekId}/roster`, data)).data,
  submitWeek: async (weekId) => (await api.post(`/assembly/weeks/${weekId}/submit`)).data,
  approveWeek: async (weekId) => (await api.post(`/assembly/weeks/${weekId}/approve`)).data,
  unlockWeek: async (weekId, reason) => (await api.post(`/assembly/weeks/${weekId}/unlock`, { reason })).data,

  // ---- Checklist (Phase C) ----
  getChecklistItems: async () => (await api.get('/assembly/checklist/items')).data, // { items: [...] }
  createChecklistItem: async (data) => (await api.post('/assembly/checklist/items', data)).data,
  updateChecklistItem: async (id, data) => (await api.put(`/assembly/checklist/items/${id}`, data)).data,
  deleteChecklistItem: async (id) => (await api.delete(`/assembly/checklist/items/${id}`)).data,
  getWeekChecklist: async (weekId) => (await api.get(`/assembly/weeks/${weekId}/checklist`)).data,
  saveWeekChecklist: async (weekId, ticks, scope, date) => (await api.put(`/assembly/weeks/${weekId}/checklist`, { ticks, scope, date })).data,
  signoffChecklist: async (weekId, note, scope, date) => (await api.post(`/assembly/weeks/${weekId}/checklist/signoff`, { note, scope, date })).data,
  clearChecklistSignoff: async (weekId, date) => (await api.delete(`/assembly/weeks/${weekId}/checklist/signoff`, { params: date ? { date } : {} })).data,

  // ---- Grading + leaderboard (Phase D) ----
  getRubric: async () => (await api.get('/assembly/rubric')).data, // { metrics, penalties, config }
  setRubricConfig: async (data) => (await api.put('/assembly/rubric/config', data)).data,
  createMetric: async (data) => (await api.post('/assembly/rubric/metrics', data)).data,
  updateMetric: async (id, data) => (await api.put(`/assembly/rubric/metrics/${id}`, data)).data,
  deleteMetric: async (id) => (await api.delete(`/assembly/rubric/metrics/${id}`)).data,
  createPenalty: async (data) => (await api.post('/assembly/rubric/penalties', data)).data,
  updatePenalty: async (id, data) => (await api.put(`/assembly/rubric/penalties/${id}`, data)).data,
  deletePenalty: async (id) => (await api.delete(`/assembly/rubric/penalties/${id}`)).data,
  getEvaluators: async () => (await api.get('/assembly/evaluators')).data,
  addEvaluator: async (data) => (await api.post('/assembly/evaluators', data)).data,
  removeEvaluator: async (id) => (await api.delete(`/assembly/evaluators/${id}`)).data,
  getWeekGrades: async (weekId) => (await api.get(`/assembly/weeks/${weekId}/grades`)).data,
  saveGrade: async (weekId, data) => (await api.post(`/assembly/weeks/${weekId}/grades`, data)).data,
  deleteGrade: async (id) => (await api.delete(`/assembly/grades/${id}`)).data,
  getLeaderboard: async (from, to) => (await api.get('/assembly/leaderboard', { params: { from, to } })).data,

  // ---- Teacher PWA: my house-duty roster (derived, /me/assembly/*) ----
  // Derived roles for mobile tile gating — folded into /duties (the duties endpoint
  // already carries isHouseMember + isEvaluator, so no extra round-trip/route needed).
  myRoles: async () => {
    const d = (await api.get('/assembly/me/assembly/duties')).data;
    return { isHouseMember: !!d.isHouseMember, isEvaluator: !!d.isEvaluator };
  },
  myDuties: async (params = {}) => (await api.get('/assembly/me/assembly/duties', { params })).data,
  myEnsureWeek: async (planId, weekStart) => (await api.post(`/assembly/me/assembly/plans/${planId}/weeks`, { weekStart })).data,
  myWeek: async (weekId) => (await api.get(`/assembly/me/assembly/weeks/${weekId}`)).data,
  mySaveRoster: async (weekId, data) => (await api.put(`/assembly/me/assembly/weeks/${weekId}/roster`, data)).data,
  mySubmitWeek: async (weekId) => (await api.post(`/assembly/me/assembly/weeks/${weekId}/submit`)).data,
  myWeekChecklist: async (weekId) => (await api.get(`/assembly/me/assembly/weeks/${weekId}/checklist`)).data,
  mySaveChecklist: async (weekId, ticks, scope, date) => (await api.put(`/assembly/me/assembly/weeks/${weekId}/checklist`, { ticks, scope, date })).data,
  mySignoffChecklist: async (weekId, note, scope, date) => (await api.post(`/assembly/me/assembly/weeks/${weekId}/checklist/signoff`, { note, scope, date })).data,
  mySaveGrade: async (weekId, data) => (await api.post(`/assembly/me/assembly/weeks/${weekId}/grades`, data)).data,
};
