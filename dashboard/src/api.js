const BASE = import.meta.env.VITE_API_URL || '/api';

async function req(method, path, body) {
  const token = localStorage.getItem('b20_token');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) => req('POST', '/auth/login', { username, password }),
  me: () => req('GET', '/auth/me'),
  changePassword: (oldPassword, newPassword) => req('PATCH', '/auth/change-password', { oldPassword, newPassword }),

  // Rankings
  getRankTypes: () => req('GET', '/ranks/types'),
  getRanks: (typeId) => req('GET', `/ranks${typeId ? `?typeId=${typeId}` : ''}`),

  // Weapons & Specialties
  getWeapons: () => req('GET', '/weapons'),
  createWeapon: (data) => req('POST', '/weapons', data),
  deleteWeapon: (id) => req('DELETE', `/weapons/${id}`),

  getSpecialties: (weaponId) => req('GET', `/specialties${weaponId ? `?weaponId=${weaponId}` : ''}`),
  createSpecialty: (data) => req('POST', '/specialties', data),
  deleteSpecialty: (id) => req('DELETE', `/specialties/${id}`),

  // Soldiers
  getSoldiers: (params) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.weaponId) q.set('weaponId', params.weaponId);
    if (params?.specialtyId) q.set('specialtyId', params.specialtyId);
    return req('GET', `/soldiers?${q.toString()}`);
  },
  getSoldier: (id) => req('GET', `/soldiers/${id}`),
  createSoldier: (data) => req('POST', '/soldiers', data),
  updateSoldier: (id, data) => req('PUT', `/soldiers/${id}`, data),
  deleteSoldier: (id) => req('DELETE', `/soldiers/${id}`),

  // Exams
  getExams: (params) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.weaponId) q.set('weaponId', params.weaponId);
    return req('GET', `/exams?${q.toString()}`);
  },
  getExam: (id) => req('GET', `/exams/${id}`),
  createExam: (data) => req('POST', '/exams', data),
  updateExam: (id, data) => req('PUT', `/exams/${id}`, data),
  deleteExam: (id) => req('DELETE', `/exams/${id}`),

  // Results
  getResults: (params) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.weaponId) q.set('weaponId', params.weaponId);
    if (params?.soldierId) q.set('soldierId', params.soldierId);
    if (params?.page) q.set('page', params.page);
    if (params?.limit) q.set('limit', params.limit);
    return req('GET', `/results?${q.toString()}`);
  },
  getStats: () => req('GET', '/results/stats'),
  getResult: (id) => req('GET', `/results/${id}`),
  createResult: (data) => req('POST', '/results', data),
  deleteResult: (id) => req('DELETE', `/results/${id}`),

  // Fitness
  getFitnessExercises: () => req('GET', '/fitness/exercises'),
  createFitnessExercise: (data) => req('POST', '/fitness/exercises', data),
  deleteFitnessExercise: (id) => req('DELETE', `/fitness/exercises/${id}`),
  createFitnessResult: (data) => req('POST', '/fitness/results', data),

  // Announcements
  getAnnouncements: () => req('GET', '/announcements'),
  createAnnouncement: (data) => req('POST', '/announcements', data),
  deleteAnnouncement: (id) => req('DELETE', `/announcements/${id}`),

  // Users (commander)
  getUsers: () => req('GET', '/users'),
  createUser: (data) => req('POST', '/users', data),
  updateUserPassword: (id, password) => req('PATCH', `/users/${id}/password`, { password }),
  toggleUser: (id) => req('PATCH', `/users/${id}/toggle`),
  deleteUser: (id) => req('DELETE', `/users/${id}`),

  // Notifications
  getNotifications: () => req('GET', '/notifications'),
  markNotificationRead: (id) => req('PATCH', `/notifications/${id}/read`),
  markAllNotificationsRead: () => req('PATCH', '/notifications/read-all'),
  getUnreadCount: () => req('GET', '/notifications/unread-count'),

  // Distinctions
  distinguishSoldier: (id, badge, citation) => req('POST', `/soldiers/${id}/distinguish`, { badge, citation }),
  removeDistinction: (id) => req('DELETE', `/soldiers/${id}/distinguish`),
};
