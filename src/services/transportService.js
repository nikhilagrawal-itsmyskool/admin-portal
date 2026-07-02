import api from '../config/api';

export const transportService = {
  // Lookups (vehicle types, ownership, directions, attendance statuses)
  getLookups: async () => {
    const response = await api.get('/transport/lookups');
    return response.data;
  },

  // ---- Stops ----
  getStops: async (params = {}) => {
    const response = await api.get('/transport/stops', { params });
    return response.data;
  },
  createStop: async (data) => {
    const response = await api.post('/transport/stops', data);
    return response.data;
  },
  // Grid/bulk upsert: { stops: [{ name, km, landmark? }] } -> { created, updated, skipped, errors }
  bulkUpsertStops: async (stops) => {
    const response = await api.post('/transport/stops/bulk', { stops });
    return response.data;
  },
  updateStop: async (id, data) => {
    const response = await api.put(`/transport/stops/${id}`, data);
    return response.data;
  },
  deleteStop: async (id) => {
    const response = await api.delete(`/transport/stops/${id}`);
    return response.data;
  },

  // ---- Vehicles ----
  getVehicles: async (params = {}) => {
    const response = await api.get('/transport/vehicles', { params });
    return response.data;
  },
  getVehicle: async (id) => {
    const response = await api.get(`/transport/vehicles/${id}`);
    return response.data;
  },
  createVehicle: async (data) => {
    const response = await api.post('/transport/vehicles', data);
    return response.data;
  },
  updateVehicle: async (id, data) => {
    const response = await api.put(`/transport/vehicles/${id}`, data);
    return response.data;
  },
  deleteVehicle: async (id) => {
    const response = await api.delete(`/transport/vehicles/${id}`);
    return response.data;
  },

  // ---- Routes ----
  getRoutes: async (params = {}) => {
    const response = await api.get('/transport/routes', { params });
    return response.data;
  },
  getRoute: async (id) => {
    const response = await api.get(`/transport/routes/${id}`);
    return response.data; // route + vehicle + resolved staff names + ordered stops
  },
  createRoute: async (data) => {
    const response = await api.post('/transport/routes', data);
    return response.data;
  },
  updateRoute: async (id, data) => {
    const response = await api.put(`/transport/routes/${id}`, data);
    return response.data;
  },
  deleteRoute: async (id) => {
    const response = await api.delete(`/transport/routes/${id}`);
    return response.data;
  },
  addRouteStops: async (routeId, stops) => {
    // stops = [{ stopId, scheduledTime? }]
    const response = await api.post(`/transport/routes/${routeId}/stops`, { stops });
    return response.data; // { stops: [...] }
  },
  reorderRouteStops: async (routeId, order) => {
    // order = [routeStopUuid, ...]
    const response = await api.put(`/transport/routes/${routeId}/stops/order`, { order });
    return response.data; // { stops: [...] }
  },
  removeRouteStop: async (routeId, routeStopId) => {
    const response = await api.delete(`/transport/routes/${routeId}/stops/${routeStopId}`);
    return response.data; // { stops: [...] }
  },
  getRouteStudents: async (routeId) => {
    const response = await api.get(`/transport/routes/${routeId}/students`);
    return response.data; // { students: [...] }
  },

  // ---- Student assignments + reports ----
  getAssignments: async (params = {}) => {
    const response = await api.get('/transport/assignments', { params });
    return response.data;
  },
  createAssignment: async (data) => {
    const response = await api.post('/transport/assignments', data);
    return response.data;
  },
  updateAssignment: async (id, data) => {
    const response = await api.put(`/transport/assignments/${id}`, data);
    return response.data;
  },
  deleteAssignment: async (id) => {
    const response = await api.delete(`/transport/assignments/${id}`);
    return response.data;
  },
  getStudentReport: async (studentId, params = {}) => {
    const response = await api.get(`/transport/reports/student/${studentId}`, { params });
    return response.data; // { studentId, morning, evening }
  },

  // ---- Attendance ----
  getAttendanceRoster: async ({ routeId, date }) => {
    const response = await api.get('/transport/attendance/roster', { params: { routeId, date } });
    return response.data; // { session, students }
  },
  openAttendanceSession: async (data) => {
    const response = await api.post('/transport/attendance/sessions', data);
    return response.data;
  },
  saveAttendanceMarks: async (sessionId, marks) => {
    const response = await api.post(`/transport/attendance/sessions/${sessionId}/marks`, { marks });
    return response.data;
  },
  finalizeAttendanceSession: async (sessionId) => {
    const response = await api.post(`/transport/attendance/sessions/${sessionId}/finalize`);
    return response.data;
  },
  getAttendanceSession: async (id) => {
    const response = await api.get(`/transport/attendance/sessions/${id}`);
    return response.data;
  },
  listAttendanceSessions: async (params = {}) => {
    const response = await api.get('/transport/attendance/sessions', { params });
    return response.data; // { sessions: [...] }
  },
  editAttendanceRecord: async (recordId, data) => {
    const response = await api.put(`/transport/attendance/records/${recordId}`, data);
    return response.data;
  },
};
