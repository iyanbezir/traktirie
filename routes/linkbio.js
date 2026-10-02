const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { requireUser, requireAuth } = require('../lib/auth');

async function getOwnerByUsername(db, username) {
  const r = await db.execute({
    sql: 'SELECT id, display_name, bio, avatar_url FROM profiles WHERE lower(username) = ?',
    args: [String(username).trim().toLowerCase()]
  });
  return r.rows[0] || null;
}

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();

    if (req.query.slug) {
      const owner = await getOwnerByUsername(db, req.query.slug);
      if (!owner) return res.status(404).json({ error: 'Creator not found.' });
      const r = await db.execute({ sql: 'SELECT config_json FROM linkbio_config WHERE owner_id = ?', args: [owner.id] });
      const config = r.rows[0] ? JSON.parse(r.rows[0].config_json) : {};
      return res.json({
        profile: { displayName: owner.display_name, bio: owner.bio, avatarUrl: owner.avatar_url },
        config
      });
    }

    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const r = await db.execute({ sql: 'SELECT config_json FROM linkbio_config WHERE owner_id = ?', args: [auth.user.id] });
    return res.json({ config: r.rows[0] ? JSON.parse(r.rows[0].config_json) : {} });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const config = (req.body && req.body.config) || {};
    await db.execute({
      sql: `INSERT INTO linkbio_config (owner_id, config_json) VALUES (?, ?)
            ON CONFLICT(owner_id) DO UPDATE SET config_json = excluded.config_json`,
      args: [req.user.id, JSON.stringify(config)]
    });
    return res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
