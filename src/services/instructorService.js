const API_BASE =
  `${import.meta.env.VITE_BACK_END_SERVER_URL}`.replace(/\/+$/, '') + '/instructors';

const authHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const msg = data?.error || data?.err || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export async function index(q) {
  const url = q ? `${API_BASE}?q=${encodeURIComponent(q)}` : API_BASE;
  return fetchJson(url);
}

export async function show(id) {
  return fetchJson(`${API_BASE}/${id}`);
}

export async function create(payload) {
  return fetchJson(`${API_BASE}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function update(id, payload) {
  return fetchJson(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function remove(id) {
  return fetchJson(`${API_BASE}/${id}`, { method: 'DELETE' });
}



export async function invite(instructorId) {
  const r = await fetch(`${API_BASE}/${instructorId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { url, expiresAt }
}

export async function linkUser(instructorId, { email }) {
  const r = await fetch(`${API_BASE}/${instructorId}/link-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // updated instructor
}

export default { index, show, create, update, remove };