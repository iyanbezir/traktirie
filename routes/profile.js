const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { requireAuth, requireUser } = require('../lib/auth');

function rowToProfile(row) {
  if (!row) return null;
  return {
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio,
    role: row.role,
    avatarUrl: row.avatar_url,
    provider: row.provider,
    createdAt: row.created_at
  };
}

// GET /api/profile?username=xxx  (public)
// GET /api/profile               (own profile, needs auth)
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();

    if (req.query.username) {
      const uname = String(req.query.username).trim().toLowerCase();
      const r = await db.execute({
        sql: 'SELECT * FROM profiles WHERE lower(username) = ?',
        args: [uname]
      });
      return res.json({ profile: rowToProfile(r.rows[0]) });
    }

    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const authUser = auth.user;

    let r = await db.execute({ sql: 'SELECT * FROM profiles WHERE id = ?', args: [authUser.id] });
    if (!r.rows[0]) {
      const meta = authUser.user_metadata || {};
      const username = (meta.username || authUser.email.split('@')[0]).toLowerCase();
      const displayName = meta.displayName || username;
      await db.execute({
        sql: `INSERT INTO profiles (id, username, email, display_name, bio, role, provider, created_at)
              VALUES (?, ?, ?, ?, '', 'creator', ?, datetime('now'))
              ON CONFLICT(id) DO NOTHING`,
        args: [authUser.id, username, authUser.email, displayName, meta.provider || 'email']
      });
      await db.execute({
        sql: 'INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, 0)',
        args: [authUser.id]
      });
      r = await db.execute({ sql: 'SELECT * FROM profiles WHERE id = ?', args: [authUser.id] });
    }
    return res.json({ profile: rowToProfile(r.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body || {};
    const displayName = body.displayName != null ? String(body.displayName).slice(0, 80) : null;
    const bio = body.bio != null ? String(body.bio).slice(0, 300) : null;
    const avatarUrl = body.avatarUrl != null ? String(body.avatarUrl).slice(0, 500) : null;

    const sets = [];
    const args = [];
    if (displayName !== null) { sets.push('display_name = ?'); args.push(displayName); }
    if (bio !== null) { sets.push('bio = ?'); args.push(bio); }
    if (avatarUrl !== null) { sets.push('avatar_url = ?'); args.push(avatarUrl); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

    args.push(req.user.id);
    await db.execute({ sql: `UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`, args });
    const r = await db.execute({ sql: 'SELECT * FROM profiles WHERE id = ?', args: [req.user.id] });
    return res.json({ profile: rowToProfile(r.rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
