// src/services/courseService.js

const API_BASE =
  `${import.meta.env.VITE_BACK_END_SERVER_URL}`.replace(/\/+$/, '') + '/courses';

const authHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchJson(url, options = {}) {
  // Merge headers so Authorization is always included
  
  const headers = {
    Accept: 'application/json',
    ...authHeader(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 204) return null; // No Content (e.g., DELETE)

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON or empty body — keep data as null
  }

  if (!res.ok) {
    const msg = data?.error || data?.err || data?.message || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

/** LIST: returns an array of courses */
export async function index(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${API_BASE}/?${qs}` : `${API_BASE}/`;
  const data = await fetchJson(url, {
    headers: { ...authHeader() },
  });
  // API returns { page, limit, total, items }; normalize to array for the UI
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

/** SHOW: returns one course */
export async function show(hootId) {
  return fetchJson(`${API_BASE}/${hootId}`, {
    headers: { ...authHeader() },
  });
}

/** CREATE: returns created course */
export async function create(hootFormData) {
  return fetchJson(`${API_BASE}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(hootFormData),
  });
}

/** UPDATE (PUT): returns updated course */
export async function update(hootId, hootFormData) {
  return fetchJson(`${API_BASE}/${hootId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(hootFormData),
  });
}

/** DELETE: backend sends 204; return {_id} so caller can update state */
export async function deleteHoot(hootId) {
  await fetchJson(`${API_BASE}/${hootId}`, {
    method: 'DELETE',
    headers: { ...authHeader() },
  });
  return { _id: hootId };
}

export default { index, show, create, update, deleteHoot };