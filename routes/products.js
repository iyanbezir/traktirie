const express = require('express');
const router = express.Router();
const { getDb, newId } = require('../lib/db');
const { requireUser } = require('../lib/auth');

function rowToProduct(row) {
  return {
    code: row.code,
    name: row.name,
    desc: row.description,
    price: row.price,
    icon: row.icon,
    type: row.type,
    downloadLink: row.download_link,
    deliveryNote: row.delivery_note,
    imageUrl: row.image_url
  };
}

async function getOwnerByUsername(db, username) {
  const r = await db.execute({
    sql: 'SELECT id, display_name, bio FROM profiles WHERE lower(username) = ?',
    args: [String(username).trim().toLowerCase()]
  });
  return r.rows[0] || null;
}

// GET /api/products?slug=  (public store)
// GET /api/products        (own products)
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();

    if (req.query.slug) {
      const owner = await getOwnerByUsername(db, req.query.slug);
      if (!owner) return res.status(404).json({ error: 'Shop not found.' });
      const settings = await db.execute({ sql: 'SELECT * FROM store_settings WHERE owner_id = ?', args: [owner.id] });
      const products = await db.execute({
        sql: 'SELECT * FROM products WHERE owner_id = ? ORDER BY created_at ASC',
        args: [owner.id]
      });
      const s = settings.rows[0];
      return res.json({
        store: {
          name: '@' + req.query.slug,
          avatarSeed: (s && s.avatar_seed) || req.query.slug,
          tagline: (s && s.tagline) || owner.bio || 'Digital store on TraktiRie',
          products: products.rows.map(rowToProduct)
        }
      });
    }

    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const products = await db.execute({
      sql: 'SELECT * FROM products WHERE owner_id = ? ORDER BY created_at ASC',
      args: [auth.user.id]
    });
    return res.json({ products: products.rows.map(rowToProduct) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const ownerId = auth.user.id;
    const db = getDb();
    const body = req.body || {};

    if (body.action === 'save-store') {
      await db.execute({
        sql: `INSERT INTO store_settings (owner_id, name, tagline, avatar_seed)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(owner_id) DO UPDATE SET name = excluded.name, tagline = excluded.tagline, avatar_seed = excluded.avatar_seed`,
        args: [ownerId, body.name || '', body.tagline || '', body.avatarSeed || '']
      });
      return res.json({ success: true });
    }

    const code = String(body.code || '').trim() || newId('P');
    const clean = {
      code,
      name: String(body.name || 'Product').trim().slice(0, 120),
      desc: String(body.desc || '').slice(0, 500),
      price: Math.max(0, Number(body.price) || 0),
      icon: body.icon || 'box',
      type: body.type || 'link',
      downloadLink: String(body.downloadLink || body.link || '').slice(0, 500),
      deliveryNote: String(body.deliveryNote || '').slice(0, 300),
      imageUrl: String(body.imageUrl || '').slice(0, 500)
    };
    await db.execute({
      sql: `INSERT INTO products (id, owner_id, code, name, description, price, icon, type, download_link, delivery_note, image_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(owner_id, code) DO UPDATE SET
              name = excluded.name, description = excluded.description, price = excluded.price,
              icon = excluded.icon, type = excluded.type, download_link = excluded.download_link,
              delivery_note = excluded.delivery_note, image_url = excluded.image_url`,
      args: [newId('PR'), ownerId, clean.code, clean.name, clean.desc, clean.price, clean.icon, clean.type, clean.downloadLink, clean.deliveryNote, clean.imageUrl]
    });
    return res.json({ success: true, product: clean });
  } catch (err) {
    next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'code is required.' });
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM products WHERE owner_id = ? AND code = ?', args: [auth.user.id, code] });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
