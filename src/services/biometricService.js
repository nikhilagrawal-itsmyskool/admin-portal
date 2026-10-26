import api from '../config/api';

// Biometric attendance devices (ESSL K30 Pro, ZKTeco iclock). Device registry + employee
// sync (push users to the device). Mirrors the core-api `biometric` module. The device's
// own /iclock/* push endpoints are machine-facing (not called from here).
export const biometricService = {
  listDevices: async () => (await api.get('/biometric/devices')).data,
  registerDevice: async (data) => (await api.post('/biometric/devices', data)).data,
  getDevice: async (sn) => (await api.get(`/biometric/devices/${encodeURIComponent(sn)}`)).data,
  updateDevice: async (sn, data) => (await api.put(`/biometric/devices/${encodeURIComponent(sn)}`, data)).data,

  // Push a staff member to the device(s): assigns device_number if needed + enqueues the user.
  syncEmployee: async (employeeId, data = {}) => (await api.post(`/biometric/employees/${employeeId}/sync`, data)).data,
  unsyncEmployee: async (employeeId, data = {}) => (await api.post(`/biometric/employees/${employeeId}/unsync`, data)).data,

  listEnrollments: async (params = {}) => (await api.get('/biometric/enrollments', { params })).data,
  listPunches: async (params = {}) => (await api.get('/biometric/punches', { params })).data,
};
