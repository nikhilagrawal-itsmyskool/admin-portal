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
  // data.privilege: 0 = normal user, 14 = super admin.
  syncEmployee: async (employeeId, data = {}) => (await api.post(`/biometric/employees/${employeeId}/sync`, data)).data,
  unsyncEmployee: async (employeeId, data = {}) => (await api.post(`/biometric/employees/${employeeId}/unsync`, data)).data,
  // Change a synced employee's device role. data: { deviceSn?, privilege: 0 | 14 }.
  setPrivilege: async (employeeId, data = {}) => (await api.post(`/biometric/employees/${employeeId}/privilege`, data)).data,

  // Push all not-yet-synced active employees (who already have a device number) to a device.
  // data: { privilege?: 0 | 14, dryRun?: boolean }. dryRun returns { candidates } without syncing.
  syncAll: async (sn, data = {}) => (await api.post(`/biometric/devices/${encodeURIComponent(sn)}/sync-all`, data)).data,
  // Preview who "Sync all un-synced" would push, without syncing.
  syncAllPreview: async (sn, data = {}) => (await api.post(`/biometric/devices/${encodeURIComponent(sn)}/sync-all`, { ...data, dryRun: true })).data,
  // Reconcile one device now (suspend inactive, restore reactivated employees).
  reconcileDevice: async (sn) => (await api.post(`/biometric/devices/${encodeURIComponent(sn)}/reconcile`)).data,

  listEnrollments: async (params = {}) => (await api.get('/biometric/enrollments', { params })).data,
  listPunches: async (params = {}) => (await api.get('/biometric/punches', { params })).data,
};
