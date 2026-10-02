/**
 * TraktiRie Open Commission — settings & order sekarang di Turso
 * lewat /api/commission. WA pairing lewat /api/wa.
 * Config bot WA eksternal (URL/API key) tetap lokal per-browser (bukan data user).
 */

function defaultSettings() {
  return {
    isOpen: true,
    title: 'Open Commission',
    description: 'I'm currently open for commissions. Choose a service type, fill the form + media references, then pay via QR.',
    types: [
      { id: 't1', name: 'Mograph', price: 250000, desc: 'Motion graphics / animasi singkat' },
      { id: 't2', name: 'GFX Design', price: 100000, desc: 'Graphic design (logo, banner, dll)' },
      { id: 't3', name: 'Poster / Browser', price: 75000, desc: 'Poster, thumbnail, visual browser' },
      { id: 't4', name: 'Video Editing', price: 150000, desc: 'Edit video up to 5 minutes' }
    ]
  };
}

/** Ambil settings commission publik (untuk halaman /username/commission). */
async function getCommissionSettingsForSlug(slug) {
  try {
    const { settings } = await window.TraktiRieBackend.apiFetch('/api/commission?slug=' + encodeURIComponent(slug));
    return settings;
  } catch (e) {
    return defaultSettings();
  }
}

/** Settings toko sendiri (dashboard, butuh login). */
async function getCommissionSettings() {
  const { settings } = await window.TraktiRieBackend.apiFetch('/api/commission');
  return settings;
}

async function saveCommissionSettings(s) {
  await window.TraktiRieBackend.apiFetch('/api/commission', {
    method: 'POST',
    body: JSON.stringify({ action: 'save-settings', title: s.title, description: s.description, types: s.types })
  });
  return s;
}

async function toggleCommission(isOpen) {
  const r = await window.TraktiRieBackend.apiFetch('/api/commission', {
    method: 'POST',
    body: JSON.stringify({ action: 'toggle', isOpen })
  });
  return r;
}

async function getOrders() {
  const { orders } = await window.TraktiRieBackend.apiFetch('/api/commission?action=orders');
  return orders;
}

/** Buat order baru (dipanggil dari halaman publik commission, TIDAK butuh login). */
async function addOrder(order) {
  const { order: saved } = await window.TraktiRieBackend.apiFetch('/api/commission', {
    method: 'POST',
    body: JSON.stringify({ action: 'order', ...order })
  });
  return saved;
}

/* ============================================================
 * WA pairing (per creator, di Turso lewat /api/wa)
 * ============================================================ */

async function getWAConfig() {
  const { config } = await window.TraktiRieBackend.apiFetch('/api/wa');
  return config;
}

async function generatePairingCode() {
  const { config } = await window.TraktiRieBackend.apiFetch('/api/wa', {
    method: 'POST',
    body: JSON.stringify({ action: 'generate-code' })
  });
  return config.pairingCode;
}

async function confirmPairing(phone) {
  const { config } = await window.TraktiRieBackend.apiFetch('/api/wa', {
    method: 'POST',
    body: JSON.stringify({ action: 'confirm', phone })
  });
  return config;
}

async function disconnectWA() {
  await window.TraktiRieBackend.apiFetch('/api/wa', {
    method: 'POST',
    body: JSON.stringify({ action: 'disconnect' })
  });
}

/* ============================================================
 * Notifikasi WA (ke bot eksternal) — tetap sama seperti sebelumnya,
 * ini cuma format pesan + panggil API bot pihak ketiga, bukan data TraktiRie.
 * ============================================================ */

function buildWANotification(order) {
  return (
    '*Order Commission Baru!*\n\n' +
    'ID: ' + order.id + '\n' +
    'Jenis: ' + (order.typeName || '-') + '\n' +
    'Harga: Rp' + Number(order.price || 0).toLocaleString('id-ID') + '\n' +
    'Pembeli: ' + (order.buyerName || '-') + '\n' +
    'WA: ' + (order.buyerPhone || '-') + '\n' +
    (order.message ? 'Message: ' + order.message + '\n' : '') +
    (order.exampleLink ? 'Referensi: ' + order.exampleLink + '\n' : '') +
    '\n— TraktiRie'
  );
}

function buildOrderCard(order) {
  const harga = 'Rp' + Number(order.price || 0).toLocaleString('id-ID');
  const time = new Date(order.createdAt || Date.now()).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const lines = [
    '╭───「 *TraktiRie · Open Commission* 」',
    '│',
    '│ 📋 *Detail Order*',
    '│ Order  : ' + (order.id || '-'),
    '│ Service   : ' + (order.typeName || '-'),
    '│ From   : ' + (order.buyerName || '-'),
    '│ WA     : ' + (order.buyerPhone || '-'),
    '│ Harga  : ' + harga,
    '│ Status : ' + (order.status || 'pending'),
    '│ Waktu  : ' + time
  ];
  if (order.message) {
    lines.push('│', '│ 💬 Message');
    String(order.message).split('\n').forEach((row) => lines.push('│ ' + row));
  }
  if (order.exampleLink) lines.push('│', '│ 🔗 Referensi', '│ ' + order.exampleLink);
  if (order.exampleMedia) lines.push('│', '│ 📎 Media: ' + order.exampleMedia);
  lines.push('│', '╰──────────────────', '_Notifikasi · TraktiRie_');
  return lines.join('\n');
}

const ORDER_NOTIFY_EXAMPLE = {
  number: '62812xxxxxxx', text: 'Order Commission baru', title: 'TraktiRie · Open Commission',
  jasa: 'Logo Design', dari: '@customer', harga: 'Rp75.000', order_id: 'ORD-XXXX',
  status: 'pending', note: 'Has reference link', photos: ['https://example.com/ref.jpg'],
  videos: [], links: ['https://traktirie.app/order/ORD-XXXX']
};

function getBotApiConfig() {
  try {
    const raw = localStorage.getItem('sw_bot_api');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { baseUrl: '', apiKey: '', creatorPhone: '' };
}

function saveBotApiConfig(cfg) {
  localStorage.setItem('sw_bot_api', JSON.stringify(cfg));
}

async function sendWANotification(order) {
  const message = buildWANotification(order);
  const card = buildOrderCard(order);
  const cfg = await getWAConfig();
  const bot = getBotApiConfig();

  const pushLog = (status, detail) => {
    try {
      const logs = JSON.parse(localStorage.getItem('sw_wa_logs') || '[]');
      logs.unshift({ at: new Date().toISOString(), orderId: order.id, status, detail: detail || '', message });
      localStorage.setItem('sw_wa_logs', JSON.stringify(logs.slice(0, 30)));
    } catch (e) {}
  };

  if (bot.baseUrl && bot.apiKey && bot.creatorPhone) {
    try {
      const links = [];
      if (order.exampleLink) links.push(order.exampleLink);
      const res = await fetch(String(bot.baseUrl).replace(/\/+$/, '') + '/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': bot.apiKey },
        body: JSON.stringify({
          number: bot.creatorPhone, text: message, title: 'TraktiRie · Open Commission',
          jasa: order.typeName, dari: order.buyerName, harga: 'Rp' + Number(order.price || 0).toLocaleString('id-ID'),
          order_id: order.id, status: order.status || 'pending', note: order.message || '',
          photos: [], videos: [], links
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        pushLog('sent', data.mode || 'api');
        return { success: true, message, mode: data.mode || 'api', data };
      }
      pushLog('failed', data.error || res.statusText);
      return { success: false, reason: 'api_error', error: data.error || 'Bot menolak request', message, card, example: ORDER_NOTIFY_EXAMPLE };
    } catch (err) {
      pushLog('failed', err.message || 'network');
      return { success: false, reason: 'network', error: err.message || 'Failed hubungi bot', message, card, example: ORDER_NOTIFY_EXAMPLE };
    }
  }

  if (!cfg.paired) {
    pushLog('failed', 'not_paired');
    return { success: false, reason: 'not_paired', error: 'WhatsApp not paired / bot API not set in dashboard', message, card, example: ORDER_NOTIFY_EXAMPLE };
  }

  pushLog('queued', 'local_sim');
  return { success: true, message, mode: 'local_sim' };
}

if (typeof window !== 'undefined') {
  window.SWCommission = {
    defaultSettings,
    getCommissionSettingsForSlug, getCommissionSettings, saveCommissionSettings, toggleCommission,
    getOrders, addOrder,
    getWAConfig, generatePairingCode, confirmPairing, disconnectWA,
    buildWANotification, buildOrderCard, sendWANotification,
    getBotApiConfig, saveBotApiConfig, ORDER_NOTIFY_EXAMPLE
  };
}
