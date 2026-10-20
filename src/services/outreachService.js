import api from '../config/api';

// Outreach "Moments": staff compose a photo+text post for an audience (whole school /
// grade / class), attach photos, then Publish (parents get an in-app notification and see
// it in the app feed). Unpublish hides it again. Mirrors the homework/feedback service style.
export const outreachService = {
  // Admin list of moments. Optional { status: 'draft'|'published', classId }.
  list: async (params = {}) => {
    const response = await api.get('/outreach/moments', { params });
    return response.data;
  },

  // Full moment (photos + audience + reaction summary).
  getById: async (id) => {
    const response = await api.get(`/outreach/moments/${id}`);
    return response.data;
  },

  // Grades + base classes for the audience picker: { grades:[{grade}], classes:[{classId,name,grade}] }.
  audienceOptions: async () => {
    const response = await api.get('/outreach/audience-options');
    return response.data;
  },

  // Create a draft. { title?, body?, audience: [{ scope:'school'|'grade'|'class', refId? }] }.
  create: async (data) => {
    const response = await api.post('/outreach/moments', data);
    return response.data;
  },

  // Edit a draft's text/audience. { title?, body?, audience? }.
  update: async (id, data) => {
    const response = await api.put(`/outreach/moments/${id}`, data);
    return response.data;
  },

  // Add a photo to a draft: { caption?, image: { fileName, mimeType, base64Data } }.
  addPhoto: async (id, data) => {
    const response = await api.post(`/outreach/moments/${id}/photos`, data);
    return response.data;
  },

  removePhoto: async (id, photoId) => {
    const response = await api.delete(`/outreach/moments/${id}/photos/${photoId}`);
    return response.data;
  },

  // Raw base64 for a photo (fallback / local dev): { dataUri, mimeType, fileName }.
  getPhotoImage: async (id, photoId) => {
    const response = await api.get(`/outreach/moments/${id}/photos/${photoId}/image`);
    return response.data;
  },

  // Publish → fans an in-app notification to the audience families. Requires ≥1 photo.
  publish: async (id) => {
    const response = await api.post(`/outreach/moments/${id}/publish`);
    return response.data;
  },

  unpublish: async (id) => {
    const response = await api.post(`/outreach/moments/${id}/unpublish`);
    return response.data;
  },

  getAudit: async (id) => {
    const response = await api.get(`/outreach/moments/${id}/audit`);
    return response.data;
  },

  // ── Teacher PWA (own-class) — the /me surface used on phones ──────────────────
  me: {
    // Classes this teacher is the class teacher of (can post for).
    classes: async (academicYearId) =>
      (await api.get('/outreach/me/classes', { params: { academicYearId } })).data,
    // Moments this teacher authored.
    posted: async () => (await api.get('/outreach/me/posted')).data,
    // Create a draft for the teacher's own class. { classId, title?, body? } (audience forced to the class).
    create: async (data) => (await api.post('/outreach/me/moments', data)).data,
    addPhoto: async (id, data) => (await api.post(`/outreach/me/moments/${id}/photos`, data)).data,
    removePhoto: async (id, photoId) => (await api.delete(`/outreach/me/moments/${id}/photos/${photoId}`)).data,
    publish: async (id) => (await api.post(`/outreach/me/moments/${id}/publish`)).data,
    unpublish: async (id) => (await api.post(`/outreach/me/moments/${id}/unpublish`)).data,
  },
};

// Reaction token → emoji, for displaying the parent reaction tally.
export const REACTION_EMOJI = { love: '❤️', like: '👍', clap: '👏', smile: '😊', celebrate: '🎉' };

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

// File -> raw base64 (strips the data: URI prefix), for the photo payload.
export function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Turn selected File[] into the image payloads addPhoto expects.
export async function filesToImages(files) {
  const out = [];
  for (const f of files) {
    out.push({ fileName: f.name, mimeType: f.type, base64Data: await readFileB64(f) });
  }
  return out;
}
