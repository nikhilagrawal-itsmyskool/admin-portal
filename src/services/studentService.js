import api from '../config/api';

export const studentService = {
  // ---- Search / list ----
  searchStudents: async (params = {}) => {
    // params: { name, classId, academicYearId, admissionNumber, phone }
    const response = await api.get('/students/search', { params });
    return response.data;
  },

  // ---- Student CRUD ----
  getStudentById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  createStudent: async (data) => {
    const response = await api.post('/students', data);
    return response.data;
  },

  updateStudent: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // ---- Guardians ----
  getGuardians: async (studentId) => {
    const response = await api.get(`/students/${studentId}/guardians`);
    return response.data; // { guardians: [...] }
  },

  createGuardian: async (studentId, data) => {
    const response = await api.post(`/students/${studentId}/guardians`, data);
    return response.data;
  },

  updateGuardian: async (studentId, guardianId, data) => {
    const response = await api.put(`/students/${studentId}/guardians/${guardianId}`, data);
    return response.data;
  },

  deleteGuardian: async (studentId, guardianId) => {
    const response = await api.delete(`/students/${studentId}/guardians/${guardianId}`);
    return response.data;
  },

  // ---- Houses ----
  getHouses: async () => {
    const response = await api.get('/students/houses');
    return response.data; // { houses: [...] }
  },

  createHouse: async (data) => {
    const response = await api.post('/students/houses', data);
    return response.data;
  },

  updateHouse: async (id, data) => {
    const response = await api.put(`/students/houses/${id}`, data);
    return response.data;
  },

  deleteHouse: async (id) => {
    const response = await api.delete(`/students/houses/${id}`);
    return response.data;
  },

  assignHouse: async (studentId, houseId) => {
    const response = await api.put(`/students/${studentId}/house`, { houseId });
    return response.data;
  },

  // ---- Photos (entityType: 'student' | 'guardian') ----
  getPhoto: async (entityType, entityId) => {
    const response = await api.get(`/students/photos/${entityType}/${entityId}`);
    return response.data; // { data: base64, mimeType, ... }
  },

  uploadPhoto: async (entityType, entityId, { fileName, mimeType, base64Data }) => {
    const response = await api.post(`/students/photos/${entityType}/${entityId}`, {
      fileName,
      mimeType,
      base64Data,
    });
    return response.data;
  },

  deletePhoto: async (entityType, entityId) => {
    const response = await api.delete(`/students/photos/${entityType}/${entityId}`);
    return response.data;
  },

  // ---- Promotion lifecycle ----
  promote: async (data) => {
    // { academicYearFromId, academicYearToId, items: [{ studentId, toClassId, rollNumber? }] }
    const response = await api.post('/students/promote', data);
    return response.data; // { done, skipped, results: [...] }
  },

  promoteClass: async (data) => {
    // { fromClassId, academicYearFromId, toClassId, academicYearToId, excludeStudentIds? }
    const response = await api.post('/students/promote-class', data);
    return response.data;
  },

  graduate: async (data) => {
    // { academicYearFromId, studentIds: [...] }
    const response = await api.post('/students/graduate', data);
    return response.data;
  },
};
