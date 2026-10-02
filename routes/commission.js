const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { requireUser } = require('../lib/auth');

function defaultTypes() {
  return [
    { id: 't1', name: 'Mograph', price: 250000, desc: 'Motion graphics / short animation' },
    { id: 't2', name: 'GFX Design', price: 100000, desc: 'Graphic design (logo, banner, etc.)' },
    { id: 't3', name: 'Poster / Browser', price: 75000, desc: 'Poster, thumbnail, browser visual' },
    { id: 't4', name: 'Video Editing', price: 150000, desc: 'Edit video up to 5 minutes' }
  ];
}

function orderRowToFlat(row) {
  const detail = JSON.parse(row.detail_json || '{}');
  return {
    id: row.id,
    typeId: row.type_id,
    typeName: row.type_name,
    price: row.price,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_contact,
    message: detail.message || '',
    exampleLink: detail.exampleLink || null,
    exampleMedia: detail.exampleMedia || null,
    exampleMediaCount: detail.exampleMediaCount || null,
    status: row.status,
    createdAt: row.created_at
  };
}

async function getOwnerIdByUsername(db, username) {
  const r = await db.execute({
    sql: 'SELECT id FROM profiles WHERE lower(username) = ?',
    args: [String(username).trim().toLowerCase()]
  });
  return r.rows[0] ? r.rows[0].id : null;
}

async function readSettings(db, ownerId) {
  const r = await db.execute({ sql: 'SELECT * FROM commission_settings WHERE owner_id = ?', args: [ownerId] });
  if (!r.rows[0]) {
    return { isOpen: true, title: 'Open Commission', description: '', types: defaultTypes() };
  }
  const row = r.rows[0];
  return {
    isOpen: !!row.is_open,
    title: row.title,
    description: row.description,
    types: JSON.parse(row.types_json || '[]')
  };
}

// GET /api/commission?slug=  (public settings)
// GET /api/commission?action=orders  (owner orders)
// GET /api/commission  (owner settings)
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();

    if (req.query.slug) {
      const ownerId = await getOwnerIdByUsername(db, req.query.slug);
      if (!ownerId) return res.status(404).json({ error: 'Creator not found.' });
      const settings = await readSettings(db, ownerId);
      return res.json({ settings });
    }

    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const ownerId = auth.user.id;

    if (req.query.action === 'orders') {
      const r = await db.execute({
        sql: 'SELECT * FROM commission_orders WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100',
        args: [ownerId]
      });
      return res.json({ orders: r.rows.map(orderRowToFlat) });
    }

    const settings = await readSettings(db, ownerId);
    return res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// POST /api/commission
router.post('/', async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body || {};

    // Public order
    if (body.action === 'order') {
      const ownerId = await getOwnerIdByUsername(db, body.slug);
      if (!ownerId) return res.status(404).json({ error: 'Creator not found.' });
      const id = 'ORD-' + Date.now().toString(36).toUpperCase();
      const detail = {
        message: body.message || '',
        exampleLink: body.exampleLink || null,
        exampleMedia: body.exampleMedia || null,
        exampleMediaCount: body.exampleMediaCount || null
      };
      await db.execute({
        sql: `INSERT INTO commission_orders (id, owner_id, buyer_name, buyer_contact, type_id, type_name, price, detail_json, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
        args: [
          id, ownerId,
          String(body.buyerName || '').slice(0, 100),
          String(body.buyerPhone || '').slice(0, 100),
          String(body.typeId || ''),
          String(body.typeName || ''),
          Math.max(0, Number(body.price) || 0),
          JSON.stringify(detail)
        ]
      });
      return res.json({
        success: true,
        order: {
          id, typeId: body.typeId, typeName: body.typeName, price: body.price,
          buyerName: body.buyerName, buyerPhone: body.buyerPhone,
          message: detail.message, exampleLink: detail.exampleLink,
          exampleMedia: detail.exampleMedia, exampleMediaCount: detail.exampleMediaCount,
          status: 'pending', createdAt: new Date().toISOString()
        }
      });
    }

    // Owner actions
    const auth = await requireUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const ownerId = auth.user.id;

    if (body.action === 'toggle') {
      const cur = await readSettings(db, ownerId);
      const isOpen = body.isOpen != null ? !!body.isOpen : !cur.isOpen;
      await db.execute({
        sql: `INSERT INTO commission_settings (owner_id, is_open, title, description, types_json)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(owner_id) DO UPDATE SET is_open = excluded.is_open`,
        args: [ownerId, isOpen ? 1 : 0, cur.title, cur.description, JSON.stringify(cur.types)]
      });
      return res.json({ success: true, isOpen });
    }

    if (body.action === 'save-settings') {
      const title = String(body.title || 'Open Commission').slice(0, 100);
      const description = String(body.description || '').slice(0, 500);
      const types = Array.isArray(body.types) ? body.types.slice(0, 30) : defaultTypes();
      const cur = await readSettings(db, ownerId);
      await db.execute({
        sql: `INSERT INTO commission_settings (owner_id, is_open, title, description, types_json)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(owner_id) DO UPDATE SET title = excluded.title, description = excluded.description, types_json = excluded.types_json`,
        args: [ownerId, cur.isOpen ? 1 : 0, title, description, JSON.stringify(types)]
      });
      return res.json({ success: true, settings: { isOpen: cur.isOpen, title, description, types } });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
