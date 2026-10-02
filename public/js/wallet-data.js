/**
 * TraktiRie Wallet — sekarang manggil /api/wallet (Turso di server).
 * Semua fungsi ASYNC. Balance tidak lagi bisa diubah lewat DevTools browser
 * karena perhitungannya jalan di server (lihat api/wallet.js).
 */

let _cache = null; // { balance, transactions, withdrawals, constants }

async function _load(force) {
  if (_cache && !force) return _cache;
  _cache = await window.TraktiRieBackend.apiFetch('/api/wallet');
  return _cache;
}

async function getWallet() {
  const w = await _load();
  return { balance: w.balance };
}

async function getBalance() {
  const w = await _load();
  return w.balance;
}

async function getTransactions() {
  const w = await _load();
  return w.transactions;
}

async function getWithdrawals() {
  const w = await _load();
  return w.withdrawals;
}

function getChannelsForType(type) {
  return type === 'bank' ? BANK_CHANNELS : EWALLET_CHANNELS;
}

/** Dipanggil setelah pembayaran QRIS dikonfirmasi sukses (lihat catatan keamanan di api/wallet.js). */
async function addBalance(amount, note = 'Balance top-up') {
  const r = await window.TraktiRieBackend.apiFetch('/api/wallet', {
    method: 'POST',
    body: JSON.stringify({ action: 'topup', amount, note })
  });
  await _load(true);
  return r.balance;
}

function validateWithdrawal({ type, channel, accountNumber, amount }) {
  // Validasi ringan di sisi UI saja — validasi final & yang mengikat tetap di server.
  if (!['ewallet', 'bank'].includes(type)) return { ok: false, reason: 'Invalid type' };
  if (!getChannelsForType(type).includes(channel)) return { ok: false, reason: 'Invalid channel' };
  if (!accountNumber || accountNumber.trim().length < 5) return { ok: false, reason: 'Invalid account number' };
  if (!amount || amount < WITHDRAW_MIN) return { ok: false, reason: `Minimal tarik saldo Rp${WITHDRAW_MIN.toLocaleString('id-ID')}` };
  return { ok: true };
}

async function requestWithdrawal({ type, channel, accountNumber, accountName, amount }) {
  try {
    const r = await window.TraktiRieBackend.apiFetch('/api/wallet', {
      method: 'POST',
      body: JSON.stringify({ action: 'withdraw', type, channel, accountNumber, accountName, amount })
    });
    await _load(true);
    return { success: true, request: r.request };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

async function checkMonthlySubscription() {
  const r = await window.TraktiRieBackend.apiFetch('/api/wallet', {
    method: 'POST',
    body: JSON.stringify({ action: 'check-subscription' })
  });
  if (r.charged) await _load(true);
  return r;
}

const WITHDRAW_MIN = 5000;
const WITHDRAW_FEE = 2500;
const EWALLET_CHANNELS = ['DANA', 'GOPAY', 'OVO'];
const BANK_CHANNELS = ['BANK BRI', 'BANK BNI', 'BANK BCA', 'SEABANK'];
const SUBSCRIPTION_FEE = 500;
const SUBSCRIPTION_MIN_BALANCE = 10000;

window.SWWallet = {
  getWallet, getBalance, addBalance,
  getTransactions, getWithdrawals,
  EWALLET_CHANNELS, BANK_CHANNELS, WITHDRAW_MIN, WITHDRAW_FEE,
  getChannelsForType, validateWithdrawal, requestWithdrawal,
  checkMonthlySubscription,
  SUBSCRIPTION_FEE, SUBSCRIPTION_MIN_BALANCE
};
