const { createClient } = require('@supabase/supabase-js');

let _admin = null;

function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.');
    }
    _admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return _admin;
}

/**
 * Express middleware: verify Bearer token from Supabase Auth.
 * On success sets req.user. On failure sends 401/500 JSON.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Not logged in (missing token).' });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Session invalid or expired.' });
    }
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth check failed: ' + err.message });
  }
}

/**
 * Optional helper for route handlers that still use the old style.
 * Returns { user } or { error, status }.
 */
async function requireUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Not logged in (missing token).', status: 401 };
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return { error: 'Session invalid or expired.', status: 401 };
    }
    return { user: data.user };
  } catch (err) {
    return { error: 'Auth check failed: ' + err.message, status: 500 };
  }
}

module.exports = { getSupabaseAdmin, requireAuth, requireUser };
