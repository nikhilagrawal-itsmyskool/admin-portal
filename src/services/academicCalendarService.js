import api from '../config/api';

export const academicCalendarService = {
  getAcademicYears: async () => {
    const response = await api.get('/academic-years');
    return response.data;
  },

  getCurrentAcademicYear: async () => {
    const response = await api.get('/academic-years/current');
    return response.data;
  },

  getAcademicYearById: async (id) => {
    const response = await api.get(`/academic-years/${id}`);
    return response.data;
  },
};
