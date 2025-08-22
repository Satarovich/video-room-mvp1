// src/api.js
const API_BASE = 'https://youcan-backend.onrender.com'; // твой Render-бэкенд

export async function getToken(role = 'guest', user = 'WebUser') {
  const res = await fetch(`${API_BASE}/api/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role, user })
  });

  let data = {};
  try { data = await res.json(); } catch { /* оставим пустым */ }

  if (!res.ok) {
    const msg = (data && (data.error || data.detail)) ? JSON.stringify(data) : `HTTP ${res.status}`;
    throw new Error(`Token error: ${msg}`);
  }
  if (!data?.token) {
    throw new Error('Token error: empty response');
  }
  return data.token;
}
