const API_BASE = 'https://youcan-backend.onrender.com';

export async function getToken(role = 'guest', user = 'WebUser') {
  const res = await fetch(`${API_BASE}/api/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role, user })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to get token');
  return data.token;
}
