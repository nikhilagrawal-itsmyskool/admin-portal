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

  // Videos = YouTube links (several per moment). { url, caption? }.
  addVideo: async (id, data) => (await api.post(`/outreach/moments/${id}/videos`, data)).data,
  removeVideo: async (id, videoId) => (await api.delete(`/outreach/moments/${id}/videos/${videoId}`)).data,

  // Scheduled publish — publishAt is an ISO datetime (UTC). unschedule clears it (back to draft).
  schedule: async (id, publishAt) => (await api.post(`/outreach/moments/${id}/schedule`, { publishAt })).data,
  unschedule: async (id) => (await api.post(`/outreach/moments/${id}/unschedule`)).data,

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
// Sanity cap on the ORIGINAL file before downscaling (reject absurd files, e.g. a RAW).
export const PHOTO_MAX_BYTES = 40 * 1024 * 1024;
// Delivery size: resize to this long-edge + JPEG quality in the browser before upload. Not
// editing (no crop/filter) — just sizing for the feed, like WhatsApp's HD. Keeps 50-photo
// posts fast and light on R2 + parents' data, and comfortably under the backend's 5 MB cap.
const DOWNSCALE_MAX_EDGE = 1920;
const DOWNSCALE_QUALITY = 0.85;

// Resize one image file in-browser and return the { fileName, mimeType, base64Data } payload.
export function downscaleImage(file, maxEdge = DOWNSCALE_MAX_EDGE, quality = DOWNSCALE_QUALITY) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Data = dataUrl.split(',')[1];
      const fileName = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      resolve({ fileName, mimeType: 'image/jpeg', base64Data });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read "${file.name}"`)); };
    img.src = url;
  });
}

// Turn selected File[] into downscaled image payloads. onProgress(done, total) optional.
export async function filesToImages(files, onProgress) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    out.push(await downscaleImage(files[i]));
    if (onProgress) onProgress(i + 1, files.length);
  }
  return out;
}
