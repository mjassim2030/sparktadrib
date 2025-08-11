// src/services/instructorService.js

const API_BASE = `${import.meta.env.VITE_BACK_END_SERVER_URL}`.replace(/\/+$/, "") + "/instructors";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

/** Keep original shape; add `_id` (convenience) and `bio` for UI use */
const normalizeShallow = (i) => ({
  id: String(i?._id ?? i?.id ?? ""),
  _id: String(i?._id ?? i?.id ?? ""), // optional convenience for components expecting _id
  name: i?.name || i?.email || String(i?._id ?? i?.id ?? ""),
  email: i?.email || "",
  bio: i?.bio || "",
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
  });
}

/**
 * INDEX: GET /instructors -> normalized [{ id, _id, name, email, bio }]
 * Accepts either a search string (q) or an object of query params.
 *   - index()              -> all
 *   - index("ali")         -> ?q=ali
 *   - index({ q: "ali" })  -> ?q=ali
 */
export async function index(q) {
  const params = new URLSearchParams();
  if (typeof q === "string" && q.trim()) {
    params.set("q", q.trim());
  } else if (q && typeof q === "object") {
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        params.set(k, String(v).trim());
      }
    }
  }
  const url = params.toString() ? `${API_BASE}?${params.toString()}` : `${API_BASE}`;

  const json = await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json", ...authHeader() },
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