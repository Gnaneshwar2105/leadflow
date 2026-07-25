const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/auth/me', { token }),
  listUsers: (token) => request('/auth/users', { token }),

  submitPublicLead: (payload) => request('/public/leads', { method: 'POST', body: payload }),

  listLeads: (token, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    return request(`/leads?${qs.toString()}`, { token });
  },
  getLead: (token, id) => request(`/leads/${id}`, { token }),
  updateStatus: (token, id, status) => request(`/leads/${id}/status`, { method: 'PATCH', body: { status }, token }),
  assignLead: (token, id, userId) => request(`/leads/${id}/assign`, { method: 'PATCH', body: { userId }, token }),
  addNote: (token, id, text) => request(`/leads/${id}/notes`, { method: 'POST', body: { text }, token }),
  deleteLead: (token, id) => request(`/leads/${id}`, { method: 'DELETE', token }),
};
