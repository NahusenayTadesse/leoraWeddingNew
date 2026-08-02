/**
 * assets/js/auth.js
 * Shared helpers for talking to the PHP auth/session API from any page.
 * Include with: <script src="assets/js/auth.js"></script>
 */
window.Leora = window.Leora || {};

Leora.csrfToken = null;

Leora.api = async function (path, { method = 'GET', body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Leora.csrfToken && method !== 'GET') headers['X-CSRF-Token'] = Leora.csrfToken;

  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : null,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON response */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

/** Call once per page load. Returns {logged_in, user, couple_id, plan} */
Leora.checkAuth = async function () {
  const data = await Leora.api('/api/auth/me.php');
  if (data.csrf_token) Leora.csrfToken = data.csrf_token;
  return data;
};

Leora.login = (email, password, remember = false) =>
  Leora.api('/api/auth/login.php', { method: 'POST', body: { email, password, remember } });

Leora.register = (payload) =>
  Leora.api('/api/auth/register.php', { method: 'POST', body: payload });

Leora.logout = async function () {
  await Leora.api('/api/auth/logout.php', { method: 'POST' });
  window.location.href = 'leora-events-login.html';
};
