const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

function rowToConfig(row) {
  if (!row) return { status: 'disconnected', paired: false, pairingCode: null, phone: null };
  return {
    status: row.status,
    paired: !!row.paired,
    pairingCode: row.pairing_code,
    phone: row.phone
  };
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const r = await db.execute({ sql: 'SELECT * FROM wa_config WHERE owner_id = ?', args: [req.user.id] });
    return res.json({ config: rowToConfig(r.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;
    const body = req.body || {};

    async function upsert(fields) {
      const cur = await db.execute({ sql: 'SELECT * FROM wa_config WHERE owner_id = ?', args: [ownerId] });
      const merged = { ...rowToConfig(cur.rows[0]), ...fields };
      await db.execute({
        sql: `INSERT INTO wa_config (owner_id, status, paired, pairing_code, phone, last_paired)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(owner_id) DO UPDATE SET
                status = excluded.status, paired = excluded.paired,
                pairing_code = excluded.pairing_code, phone = excluded.phone`,
        args: [ownerId, merged.status, merged.paired ? 1 : 0, merged.pairingCode, merged.phone]
      });
      return merged;
    }

    if (body.action === 'generate-code') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const cfg = await upsert({ status: 'pairing', pairingCode: code, paired: false });
      return res.json({ config: cfg });
    }
    if (body.action === 'confirm') {
      const cfg = await upsert({ status: 'connected', paired: true, phone: body.phone || null, pairingCode: null });
      return res.json({ config: cfg });
    }
    if (body.action === 'disconnect') {
      const cfg = await upsert({ status: 'disconnected', paired: false, pairingCode: null, phone: null });
      return res.json({ config: cfg });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
