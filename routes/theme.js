const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { requireUser, requireAuth } = require('../lib/auth');

async function getOwnerIdByUsername(db, username) {
  const r = await db.execute({
    sql: 'SELECT id FROM profiles WHERE lower(username) = ?',
    args: [String(username).trim().toLowerCase()]
  });
  return r.rows[0] ? r.rows[0].id : null;
}

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const scope = req.query.scope === 'shop' ? 'shop' : 'linkbio';

    if (req.query.slug) {
      const ownerId = await getOwnerIdByUsername(db, req.query.slug);
      if (!ownerId) return res.status(404).json({ error: 'Creator not found.' });
      const r = await db.execute({
        sql: 'SELECT theme_json FROM themes WHERE owner_id = ? AND scope = ?',
        args: [ownerId, scope]
      });
      return res.json({ theme: r.rows[0] ? JSON.parse(r.rows[0].theme_json) : null });
    }

    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const r = await db.execute({
      sql: 'SELECT theme_json FROM themes WHERE owner_id = ? AND scope = ?',
      args: [auth.user.id, scope]
    });
    return res.json({ theme: r.rows[0] ? JSON.parse(r.rows[0].theme_json) : null });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const scope = req.query.scope === 'shop' ? 'shop' : 'linkbio';
    const theme = (req.body && req.body.theme) || {};
    await db.execute({
      sql: `INSERT INTO themes (owner_id, scope, theme_json) VALUES (?, ?, ?)
            ON CONFLICT(owner_id, scope) DO UPDATE SET theme_json = excluded.theme_json`,
      args: [req.user.id, scope, JSON.stringify(theme)]
    });
    return res.json({ success: true, theme });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
