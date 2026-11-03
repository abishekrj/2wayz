const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed.')
  return data
}

export const adminApi = {
  login: (email, password) => request('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/admin/auth/logout', { method: 'POST' }),
  me: () => request('/admin/auth/me'),
  sections: () => request('/homepage/admin'),
  uploadImage: async (file) => { const form = new FormData(); form.append('image', file); const response = await fetch(`${API_BASE}/homepage/admin/upload`, { method: 'POST', credentials: 'include', body: form }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Image upload failed.'); return data },
  saveSection: (slug, section) => request(`/homepage/admin/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(section) }),
  pages: () => request('/cms-pages/admin'),
  savePage: (slug, page) => request(`/cms-pages/admin/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(page) }),
  users: (search = '', page = 1) => request(`/users/admin?search=${encodeURIComponent(search)}&page=${page}`),
  registerUser: (name, phone, password) => request('/users/register', { method: 'POST', body: JSON.stringify({ name, phone, password }) }),
  passengerLogin: (phone, password) => request('/users/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  passengerMe: () => request('/users/me'),
  passengerLogout: () => request('/users/logout', { method: 'POST' })
}