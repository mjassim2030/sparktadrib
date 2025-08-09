// src/services/instructorService.js

const API_BASE = `${import.meta.env.VITE_BACK_END_SERVER_URL}`.replace(/\/+$/, "") + "/instructors";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const msg = data?.error || data?.err || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

const normalizeShallow = (i) => ({
  id: String(i?._id ?? i?.id ?? ""),
  name: i?.name || i?.email || String(i?._id ?? i?.id ?? ""),
  email: i?.email || "",
});

/* CREATE: POST /instructors */
export async function create(payload) {
  return fetchJson(`${API_BASE}/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(payload),
    // credentials: "include", // uncomment if your API uses cookies
  });
}

/* INDEX: GET /instructors -> normalized [{ id, name, email }] */
export async function index() {
  const json = await fetchJson(`${API_BASE}`, {
    method: "GET",
    headers: { Accept: "application/json", ...authHeader() },
    // credentials: "include",
  });

  const arr = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.results)
    ? json.results
    : [];

  return arr.map(normalizeShallow);
}

/* Optional helpers (use if needed) */

/* SHOW: GET /instructors/:id -> full object from API */
export async function show(id) {
  return fetchJson(`${API_BASE}/${encodeURIComponent(String(id))}`, {
    method: "GET",
    headers: { Accept: "application/json", ...authHeader() },
  });
}

/* UPDATE: PATCH /instructors/:id */
export async function update(id, payload) {
  return fetchJson(`${API_BASE}/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });
}

/* DESTROY: DELETE /instructors/:id */
export async function destroy(id) {
  return fetchJson(`${API_BASE}/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
}