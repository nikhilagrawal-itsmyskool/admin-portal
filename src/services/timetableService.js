import api from "../config/api";

const BASE = "/timetable";

export const timetableService = {
  // Lookups (enum dropdowns)
  getLookups: async () => {
    const response = await api.get(`${BASE}/lookups`);
    return response.data;
  },

  // Subjects
  getSubjects: async () => {
    const response = await api.get(`${BASE}/subjects`);
    return response.data; // { subjects: [...] }
  },
  createSubject: async (data) => {
    const response = await api.post(`${BASE}/subjects`, data);
    return response.data;
  },
  updateSubject: async (id, data) => {
    const response = await api.put(`${BASE}/subjects/${id}`, data);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await api.delete(`${BASE}/subjects/${id}`);
    return response.data;
  },

  // Class subjects (filter: classId, academicYearId)
  getClassSubjects: async (params = {}) => {
    const response = await api.get(`${BASE}/class-subjects`, { params });
    return response.data; // { classSubjects: [...] }
  },
  createClassSubject: async (data) => {
    const response = await api.post(`${BASE}/class-subjects`, data);
    return response.data;
  },
  updateClassSubject: async (id, data) => {
    const response = await api.put(`${BASE}/class-subjects/${id}`, data);
    return response.data;
  },
  deleteClassSubject: async (id) => {
    const response = await api.delete(`${BASE}/class-subjects/${id}`);
    return response.data;
  },

  // Teaching assignments (filter: classId, teacherId, academicYearId)
  getTeachingAssignments: async (params = {}) => {
    const response = await api.get(`${BASE}/teaching-assignments`, { params });
    return response.data; // { assignments: [...] }
  },
  createTeachingAssignment: async (data) => {
    const response = await api.post(`${BASE}/teaching-assignments`, data);
    return response.data;
  },
  updateTeachingAssignment: async (id, data) => {
    const response = await api.put(`${BASE}/teaching-assignments/${id}`, data);
    return response.data;
  },
  deleteTeachingAssignment: async (id) => {
    const response = await api.delete(`${BASE}/teaching-assignments/${id}`);
    return response.data;
  },

  // Class teachers (filter: classId, academicYearId)
  getClassTeachers: async (params = {}) => {
    const response = await api.get(`${BASE}/class-teachers`, { params });
    return response.data; // { classTeachers: [...] }
  },
  createClassTeacher: async (data) => {
    const response = await api.post(`${BASE}/class-teachers`, data);
    return response.data;
  },
  updateClassTeacher: async (id, data) => {
    const response = await api.put(`${BASE}/class-teachers/${id}`, data);
    return response.data;
  },
  deleteClassTeacher: async (id) => {
    const response = await api.delete(`${BASE}/class-teachers/${id}`);
    return response.data;
  },

  // Clone a whole section's academic setup onto another section in the same year.
  // The class teacher is NOT copied (per-section difference). Body:
  // { sourceClassId, targetClassId, academicYearId }
  cloneClassSetup: async (data) => {
    const response = await api.post(`${BASE}/clone-class-setup`, data);
    return response.data; // { classSubjects, teachingAssignments, electiveBands, electiveOfferings }
  },

  // Wings (named class sets) (filter: academicYearId)
  getWings: async (params = {}) => {
    const response = await api.get(`${BASE}/wings`, { params });
    return response.data; // { wings: [...] }
  },
  createWing: async (data) => {
    const response = await api.post(`${BASE}/wings`, data);
    return response.data;
  },
  updateWing: async (id, data) => {
    const response = await api.put(`${BASE}/wings/${id}`, data);
    return response.data;
  },
  deleteWing: async (id) => {
    const response = await api.delete(`${BASE}/wings/${id}`);
    return response.data;
  },

  // Class groups / cohorts (filter: academicYearId). A cohort is a set of
  // co-scheduled classes (a composite class like XI-A); membership is class-level.
  getClassGroups: async (params = {}) => {
    const response = await api.get(`${BASE}/class-groups`, { params });
    return response.data; // { classGroups: [...] }
  },
  createClassGroup: async (data) => {
    const response = await api.post(`${BASE}/class-groups`, data);
    return response.data;
  },
  updateClassGroup: async (id, data) => {
    const response = await api.put(`${BASE}/class-groups/${id}`, data);
    return response.data;
  },
  deleteClassGroup: async (id) => {
    const response = await api.delete(`${BASE}/class-groups/${id}`);
    return response.data;
  },

  // Elective bands + offerings (filter: classId, classGroupId, academicYearId)
  getElectiveBands: async (params = {}) => {
    const response = await api.get(`${BASE}/elective-bands`, { params });
    return response.data; // { bands: [...] }
  },
  getElectiveBand: async (id) => {
    const response = await api.get(`${BASE}/elective-bands/${id}`);
    return response.data;
  },
  createElectiveBand: async (data) => {
    const response = await api.post(`${BASE}/elective-bands`, data);
    return response.data;
  },
  updateElectiveBand: async (id, data) => {
    const response = await api.put(`${BASE}/elective-bands/${id}`, data);
    return response.data;
  },
  deleteElectiveBand: async (id) => {
    const response = await api.delete(`${BASE}/elective-bands/${id}`);
    return response.data;
  },
  addElectiveOffering: async (bandId, data) => {
    const response = await api.post(
      `${BASE}/elective-bands/${bandId}/offerings`,
      data,
    );
    return response.data;
  },
  deleteElectiveOffering: async (offeringId) => {
    const response = await api.delete(
      `${BASE}/elective-offerings/${offeringId}`,
    );
    return response.data;
  },

  // Grid config / days / slots
  getConfigs: async (params = {}) => {
    const response = await api.get(`${BASE}/configs`, { params });
    return response.data; // { configs: [...] }
  },
  getConfig: async (id) => {
    const response = await api.get(`${BASE}/configs/${id}`);
    return response.data; // includes days[].slots[]
  },
  createConfig: async (data) => {
    const response = await api.post(`${BASE}/configs`, data);
    return response.data;
  },
  updateConfig: async (id, data) => {
    const response = await api.put(`${BASE}/configs/${id}`, data);
    return response.data;
  },
  deleteConfig: async (id) => {
    const response = await api.delete(`${BASE}/configs/${id}`);
    return response.data;
  },
  // Lock lifecycle: only a locked config can be generated; locked is immutable.
  lockConfig: async (id) => {
    const response = await api.post(`${BASE}/configs/${id}/lock`);
    return response.data;
  },
  unlockConfig: async (id) => {
    const response = await api.post(`${BASE}/configs/${id}/unlock`);
    return response.data;
  },
  cloneConfig: async (id, data = {}) => {
    const response = await api.post(`${BASE}/configs/${id}/clone`, data);
    return response.data; // new draft config (includes days[].slots[])
  },
  createDay: async (configId, data) => {
    const response = await api.post(`${BASE}/configs/${configId}/days`, data);
    return response.data;
  },
  updateDay: async (dayId, data) => {
    const response = await api.put(`${BASE}/days/${dayId}`, data);
    return response.data;
  },
  deleteDay: async (dayId) => {
    const response = await api.delete(`${BASE}/days/${dayId}`);
    return response.data;
  },
  createSlot: async (dayId, data) => {
    const response = await api.post(`${BASE}/days/${dayId}/slots`, data);
    return response.data;
  },
  // Copy all slots from another day onto this (empty) day of the same config.
  cloneDaySlots: async (dayId, data) => {
    const response = await api.post(`${BASE}/days/${dayId}/clone-slots`, data);
    return response.data; // updated target day incl. slots
  },
  updateSlot: async (slotId, data) => {
    const response = await api.put(`${BASE}/slots/${slotId}`, data);
    return response.data;
  },
  deleteSlot: async (slotId) => {
    const response = await api.delete(`${BASE}/slots/${slotId}`);
    return response.data;
  },

  // Teacher constraints (filter: teacherId, academicYearId)
  getTeacherConstraints: async (params = {}) => {
    const response = await api.get(`${BASE}/teacher-constraints`, { params });
    return response.data; // { constraints: [...] }
  },
  createTeacherConstraint: async (data) => {
    const response = await api.post(`${BASE}/teacher-constraints`, data);
    return response.data;
  },
  updateTeacherConstraint: async (id, data) => {
    const response = await api.put(`${BASE}/teacher-constraints/${id}`, data);
    return response.data;
  },
  deleteTeacherConstraint: async (id) => {
    const response = await api.delete(`${BASE}/teacher-constraints/${id}`);
    return response.data;
  },

  // Seasons (bell timings): a reusable named set of per-slot clock times layered
  // over the grid's base times. See the timetable module DESIGN.md.
  getSeasons: async () => {
    const response = await api.get(`${BASE}/seasons`);
    return response.data; // { seasons: [...] }
  },
  getSeason: async (id) => {
    const response = await api.get(`${BASE}/seasons/${id}`);
    return response.data; // includes slotTimes[] + activations[]
  },
  createSeason: async (data) => {
    const response = await api.post(`${BASE}/seasons`, data);
    return response.data;
  },
  updateSeason: async (id, data) => {
    const response = await api.put(`${BASE}/seasons/${id}`, data);
    return response.data;
  },
  deleteSeason: async (id) => {
    const response = await api.delete(`${BASE}/seasons/${id}`);
    return response.data;
  },
  getSeasonSlotTimes: async (id) => {
    const response = await api.get(`${BASE}/seasons/${id}/slot-times`);
    return response.data; // { slotTimes: [...] }
  },
  // Bulk upsert per-slot times: { slotTimes: [{ timeSlotId, startTime, endTime }] }
  setSeasonSlotTimes: async (id, data) => {
    const response = await api.put(`${BASE}/seasons/${id}/slot-times`, data);
    return response.data; // { slotTimes: [...] }
  },
  // Seed a season's slot times from a config's base times: { configId }
  prefillSeason: async (id, data) => {
    const response = await api.post(`${BASE}/seasons/${id}/prefill`, data);
    return response.data; // { slotTimes: [...] }
  },
  deleteSeasonSlotTime: async (slotTimeId) => {
    const response = await api.delete(`${BASE}/season-slot-times/${slotTimeId}`);
    return response.data;
  },

  // Season activations: dated windows selecting which season is in effect.
  getSeasonActivations: async (params = {}) => {
    const response = await api.get(`${BASE}/season-activations`, { params });
    return response.data; // { activations: [...] }
  },
  createSeasonActivation: async (data) => {
    const response = await api.post(`${BASE}/season-activations`, data);
    return response.data;
  },
  updateSeasonActivation: async (id, data) => {
    const response = await api.put(`${BASE}/season-activations/${id}`, data);
    return response.data;
  },
  deleteSeasonActivation: async (id) => {
    const response = await api.delete(`${BASE}/season-activations/${id}`);
    return response.data;
  },

  // Generation
  feasibility: async (data) => {
    const response = await api.post(`${BASE}/feasibility`, data);
    return response.data;
  },
  generate: async (data) => {
    const response = await api.post(`${BASE}/generate`, data);
    return response.data; // { runId, status }
  },
  // Run history (filter: academicYearId, configId, status)
  getRuns: async (params = {}) => {
    const response = await api.get(`${BASE}/runs`, { params });
    return response.data; // { runs: [...] }
  },
  getRun: async (id) => {
    const response = await api.get(`${BASE}/runs/${id}`);
    return response.data;
  },
  getCandidates: async (id) => {
    const response = await api.get(`${BASE}/runs/${id}/candidates`);
    return response.data; // { candidates: [...] }
  },
  // Rendered timetable export (format: 'xlsx' | 'pdf'); returns base64 JSON
  // { fileName, mimeType, data } — decode to a Blob to download (see downloadRunExport).
  exportRun: async (id, format = "xlsx") => {
    const response = await api.get(`${BASE}/runs/${id}/export`, {
      params: { format },
    });
    return response.data;
  },
  publish: async (data) => {
    const response = await api.post(`${BASE}/publish`, data);
    return response.data;
  },
  getPublished: async (academicYearId, wingId) => {
    const params = { academicYearId };
    if (wingId) params.wingId = wingId;
    const response = await api.get(`${BASE}/published`, { params });
    return response.data; // { publishedTimetable, entries, config }
  },
  getPublishedList: async (academicYearId) => {
    const response = await api.get(`${BASE}/published-list`, {
      params: { academicYearId },
    });
    return response.data; // { published: [{ uuid, wingId, wingName, entryCount, ... }] }
  },
  validateMove: async (data) => {
    const response = await api.post(`${BASE}/validate-move`, data);
    return response.data;
  },
  // Manual editing of the published master (Edit mode). Body carries publishedTimetableId.
  movePublishedEntry: async (id, data) => {
    const response = await api.put(`${BASE}/published/entries/${id}/move`, data);
    return response.data;
  },
  editPublishedEntry: async (id, data) => {
    const response = await api.put(`${BASE}/published/entries/${id}`, data);
    return response.data;
  },
  swapPublishedEntries: async (data) => {
    const response = await api.post(`${BASE}/published/swap`, data);
    return response.data;
  },

  // Today's published day for a class: { localDate, dayOfWeek, seasonName, slots:[{ timeSlotId, slotType, label, startTime, endTime, entries:[{subjectName, teacherName}] }], nowSlotId, nextSlotId, note? }
  getClassToday: async (classId, at) => {
    const response = await api.get(`${BASE}/today`, { params: at ? { classId, at } : { classId } });
    return response.data;
  },
};
