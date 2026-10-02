const express = require('express');
const router = express.Router();
const { getDb, newId } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const WITHDRAW_MIN = 5000;
const WITHDRAW_FEE = 2500;
const EWALLET_CHANNELS = ['DANA', 'GOPAY', 'OVO'];
const BANK_CHANNELS = ['BANK BRI', 'BANK BNI', 'BANK BCA', 'SEABANK'];
const SUBSCRIPTION_FEE = 500;
const SUBSCRIPTION_MIN_BALANCE = 10000;

async function ensureWallet(db, userId) {
  await db.execute({ sql: 'INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, 0)', args: [userId] });
  const r = await db.execute({ sql: 'SELECT * FROM wallets WHERE user_id = ?', args: [userId] });
  return r.rows[0];
}

function txToCamel(row) {
  return { id: row.id, type: row.type, amount: row.amount, status: row.status, note: row.note, createdAt: row.created_at };
}
function wdToCamel(row) {
  return {
    id: row.id, type: row.type, channel: row.channel, accountNumber: row.account_number,
    accountName: row.account_name, amount: row.amount, fee: row.fee, total: row.total,
    status: row.status, createdAt: row.created_at
  };
}

async function logTx(db, userId, type, amount, status, note) {
  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, user_id, type, amount, status, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [newId('TX'), userId, type, amount, status, note || '']
  });
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const wallet = await ensureWallet(db, userId);
    const tx = await db.execute({
      sql: 'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200',
      args: [userId]
    });
    const wd = await db.execute({
      sql: 'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      args: [userId]
    });
    return res.json({
      balance: wallet.balance,
      transactions: tx.rows.map(txToCamel),
      withdrawals: wd.rows.map(wdToCamel),
      constants: { WITHDRAW_MIN, WITHDRAW_FEE, EWALLET_CHANNELS, BANK_CHANNELS }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const body = req.body || {};
    const action = body.action;

    if (action === 'topup') {
      // NOTE: trusted from client until real payment webhooks are wired.
      const amount = Math.max(0, Math.floor(Number(body.amount) || 0));
      if (amount < 1000) return res.status(400).json({ error: 'Invalid top-up amount.' });
      await ensureWallet(db, userId);
      await db.execute({ sql: 'UPDATE wallets SET balance = balance + ? WHERE user_id = ?', args: [amount, userId] });
      await logTx(db, userId, 'topup', amount, 'success', body.note || 'Balance top-up');
      const wallet = await ensureWallet(db, userId);
      return res.json({ success: true, balance: wallet.balance });
    }

    if (action === 'withdraw') {
      const type = body.type;
      const channel = body.channel;
      const accountNumber = String(body.accountNumber || '').trim();
      const accountName = String(body.accountName || '').trim();
      const amount = Math.floor(Number(body.amount) || 0);

      if (!['ewallet', 'bank'].includes(type)) return res.status(400).json({ error: 'Invalid type.' });
      const allowed = type === 'ewallet' ? EWALLET_CHANNELS : BANK_CHANNELS;
      if (!allowed.includes(channel)) return res.status(400).json({ error: 'Invalid channel.' });
      if (accountNumber.length < 5) return res.status(400).json({ error: 'Invalid account number.' });
      if (!amount || amount < WITHDRAW_MIN) {
        return res.status(400).json({ error: `Minimum withdrawal is Rp${WITHDRAW_MIN.toLocaleString('id-ID')}` });
      }

      const fee = WITHDRAW_FEE;
      const total = amount + fee;
      const wallet = await ensureWallet(db, userId);
      if (total > wallet.balance) return res.status(400).json({ error: 'Insufficient balance (including fee).' });

      const id = newId('WD');
      await db.execute({ sql: 'UPDATE wallets SET balance = balance - ? WHERE user_id = ?', args: [total, userId] });
      await db.execute({
        sql: `INSERT INTO withdrawals (id, user_id, type, channel, account_number, account_name, amount, fee, total, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
        args: [id, userId, type, channel, accountNumber, accountName, amount, fee, total]
      });
      await logTx(db, userId, 'withdraw', -total, 'pending', `Withdraw to ${channel} (${accountNumber})`);

      return res.json({
        success: true,
        request: { id, type, channel, accountNumber, accountName, amount, fee, total, status: 'pending' }
      });
    }

    if (action === 'check-subscription') {
      const wallet = await ensureWallet(db, userId);
      const thisMonth = new Date().toISOString().slice(0, 7);
      if (wallet.last_subscription_check === thisMonth) {
        return res.json({ charged: false, reason: 'already_checked_this_month' });
      }
      if (wallet.balance >= SUBSCRIPTION_MIN_BALANCE) {
        await db.execute({
          sql: 'UPDATE wallets SET balance = balance - ?, last_subscription_check = ? WHERE user_id = ?',
          args: [SUBSCRIPTION_FEE, thisMonth, userId]
        });
        await db.execute({ sql: 'UPDATE admin_wallet SET balance = balance + ? WHERE id = 1', args: [SUBSCRIPTION_FEE] });
        await logTx(db, userId, 'subscription_fee', -SUBSCRIPTION_FEE, 'success', 'Monthly store subscription fee');
        return res.json({ charged: true, amount: SUBSCRIPTION_FEE });
      }
      await db.execute({ sql: 'UPDATE wallets SET last_subscription_check = ? WHERE user_id = ?', args: [thisMonth, userId] });
      return res.json({ charged: false, reason: 'balance_below_minimum' });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
