import { supabase } from './contexts/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (response.status === 303) {
    return response.json(); // Handle duplicate URL redirect data
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Notes
  getNotes: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return request(`/notes?${searchParams.toString()}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),

  // Lists
  getLists: () => request('/lists'),
  createList: (data) => request('/lists', { method: 'POST', body: JSON.stringify(data) }),
  updateList: (id, data) => request(`/lists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteList: (id) => request(`/lists/${id}`, { method: 'DELETE' }),

  // Processing
  processUrl: (url) => request('/process-url', { method: 'POST', body: JSON.stringify({ url }) }),
  processImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/process-image`, {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  // Queue
  getQueueStats: () => request('/queue/stats'),

  // Settings
  getSettings: () => request('/settings'),
  setGeminiKey: (key) => request('/settings/gemini-key', { method: 'POST', body: JSON.stringify({ key }) }),
};
