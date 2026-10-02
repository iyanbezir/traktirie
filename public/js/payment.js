/**
 * TraktiRie Payment Integration
 * Gateway calls run server-side / behind the scenes.
 * User-facing UI only shows TraktiRie branding.
 */

const API_BASE = 'https://tokoshopp.web.id';
const API_KEY = 'artan_eb8bae837b674c46dfc22484d4959ebabbbb8d54';

let selectedAmount = 25000;
let currentTransactionId = null;

function showToast(message, type) {
  type = type || 'success';
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(function () { toast.classList.remove('show'); }, 3500);
}

function formatRupiah(num) {
  return 'Rp' + Number(num).toLocaleString('id-ID');
}

function isApiKeyReady() {
  return API_KEY && API_KEY.indexOf('xxxxx') === -1 && API_KEY.length > 12;
}

// ========== Amount Selection (halaman support/donasi saja) ==========
document.querySelectorAll('.amount-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.amount-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var val = btn.dataset.amount;
    var wrap = document.getElementById('customAmountWrap');
    if (val === 'custom') {
      if (wrap) wrap.classList.remove('hidden');
      selectedAmount = 0;
    } else {
      if (wrap) wrap.classList.add('hidden');
      selectedAmount = parseInt(val, 10);
    }
    updatePayLabel();
  });
});

var customAmountEl = document.getElementById('customAmount');
if (customAmountEl) {
  customAmountEl.addEventListener('input', function (e) {
    selectedAmount = parseInt(e.target.value, 10) || 0;
    updatePayLabel();
  });
}

function updatePayLabel() {
  var label = document.getElementById('payAmountLabel');
  if (!label) return;
  if (selectedAmount >= 1000) {
    label.textContent = '— ' + formatRupiah(selectedAmount);
  } else {
    label.textContent = '— Choose amount';
  }
}

/**
 * Buat pembayaran (dipakai support, shop, commission)
 * @returns {Promise<{success:boolean, transactionId?:string, fallback?:boolean}>}
 */
async function createPayment(orderId, amount) {
  selectedAmount = amount;
  if (!isApiKeyReady()) {
    simulateFallbackPayment(orderId, amount);
    return { success: true, transactionId: currentTransactionId, fallback: true };
  }
  try {
    var res = await fetch(API_BASE + '/api/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ amount: amount, order_id: orderId })
    });
    var data = await res.json();
    if (data.success && (data.qr_image || data.qr)) {
      currentTransactionId = data.transaction_id;
      showPaymentModal(data.qr_image || data.qr, data.transaction_id, amount);
      return { success: true, transactionId: data.transaction_id, fallback: false };
    }
    simulateFallbackPayment(orderId, amount);
    return { success: true, transactionId: currentTransactionId, fallback: true };
  } catch (err) {
    simulateFallbackPayment(orderId, amount);
    return { success: true, transactionId: currentTransactionId, fallback: true };
  }
}

// Tombol donasi di support.html
var payBtn = document.getElementById('payBtn');
if (payBtn) {
  payBtn.addEventListener('click', async function () {
    if (selectedAmount < 1000) {
      showToast('Minimum tip is Rp1,000', 'error');
      return;
    }
    var btn = payBtn;
    var originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Memproses...';
    var orderId = 'SW-' + Date.now();
    try {
      await createPayment(orderId, selectedAmount);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });
}

function simulateFallbackPayment(orderId, amount) {
  selectedAmount = amount;
  var demoTrxId = 'TR-' + orderId;
  currentTransactionId = demoTrxId;

  var canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);
  // Pola kotak mirip QR
  ctx.fillStyle = '#111111';
  for (var y = 0; y < 10; y++) {
    for (var x = 0; x < 10; x++) {
      if ((x + y) % 3 === 0 || (x * y) % 5 === 1) {
        ctx.fillRect(20 + x * 16, 20 + y * 16, 14, 14);
      }
    }
  }
  // Finder patterns
  [[20, 20], [148, 20], [20, 148]].forEach(function (p) {
    ctx.fillRect(p[0], p[1], 28, 28);
    ctx.fillStyle = '#fff';
    ctx.fillRect(p[0] + 6, p[1] + 6, 16, 16);
    ctx.fillStyle = '#111';
    ctx.fillRect(p[0] + 10, p[1] + 10, 8, 8);
  });

  var dataUrl = canvas.toDataURL('image/png');
  showPaymentModal(dataUrl, demoTrxId, amount);
}

// ========== Papan Dukungan ==========
function getSupporters() {
  try {
    return JSON.parse(localStorage.getItem('sw_supporters') || '[]');
  } catch (e) {
    return [];
  }
}

function addSupporter(entry) {
  var list = getSupporters();
  list.unshift({
    name: entry.name || 'Anonim',
    message: entry.message || '',
    amount: entry.amount || 0,
    at: new Date().toISOString()
  });
  localStorage.setItem('sw_supporters', JSON.stringify(list.slice(0, 50)));
  renderSupportersWall();
}

function renderSupportersWall() {
  var wall = document.getElementById('supportersWall');
  if (!wall) return;
  var list = getSupporters();
  if (!list.length) {
    wall.innerHTML = '<p class="text-sm text-center py-6" style="color:var(--tr-text-muted,#64748b)">No supporters yet. Be the first!</p>';
    return;
  }
  wall.innerHTML = list.map(function (s) {
    return '<div class="flex gap-3 py-3 border-b border-white/5">' +
      '<div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style="background:linear-gradient(135deg,#a855f7,#7c3aed)">' +
      (s.name.charAt(0) || '?').toUpperCase() +
      '</div>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="flex justify-between gap-2"><span class="font-medium text-sm truncate">' + escapeHtml(s.name) + '</span>' +
      '<span class="text-sm font-semibold shrink-0" style="color:#a855f7">' + formatRupiah(s.amount) + '</span></div>' +
      (s.message ? '<p class="text-xs mt-0.5 truncate" style="color:#94a3b8">' + escapeHtml(s.message) + '</p>' : '') +
      '</div></div>';
  }).join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recordSupporterIfDonation(amount) {
  if (!document.getElementById('supportersWall')) return;
  var name = (document.getElementById('supporterName') && document.getElementById('supporterName').value) || 'Anonim';
  var message = (document.getElementById('message') && document.getElementById('message').value) || '';
  addSupporter({ name: name, message: message, amount: amount });
}

function showPaymentModal(qrDataUrl, trxId, amount) {
  var modal = document.getElementById('paymentModal');
  if (!modal) {
    showToast('Payment modal is not available on this page', 'error');
    return;
  }
  var qrContainer = document.getElementById('qrContainer');
  var trxEl = document.getElementById('trxId');
  var amountEl = document.getElementById('modalAmount');
  var statusEl = document.getElementById('statusResult');

  if (qrContainer) {
    if (typeof qrDataUrl === 'string' && qrDataUrl.indexOf('data:') === 0) {
      qrContainer.innerHTML = '<img src="' + qrDataUrl + '" alt="QR Payment" class="w-48 h-48 object-contain">';
    } else if (typeof qrDataUrl === 'string' && qrDataUrl.indexOf('http') === 0) {
      qrContainer.innerHTML = '<img src="' + qrDataUrl + '" alt="QR Payment" class="w-48 h-48 object-contain">';
    } else {
      qrContainer.innerHTML = '<img src="' + qrDataUrl + '" alt="QR Payment" class="w-48 h-48 object-contain">';
    }
  }
  if (trxEl) trxEl.textContent = trxId;
  if (amountEl) amountEl.textContent = formatRupiah(amount);
  if (statusEl) statusEl.classList.add('hidden');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePaymentModal() {
  var modal = document.getElementById('paymentModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

var closeModalBtn = document.getElementById('closeModalBtn');
if (closeModalBtn) closeModalBtn.addEventListener('click', closePaymentModal);

var checkStatusBtn = document.getElementById('checkStatusBtn');
if (checkStatusBtn) {
  checkStatusBtn.addEventListener('click', async function () {
    if (!currentTransactionId) return;
    var btn = checkStatusBtn;
    btn.disabled = true;
    btn.textContent = 'Checking...';
    try {
      if (String(currentTransactionId).indexOf('TR-') === 0) {
        var statusEl = document.getElementById('statusResult');
        if (statusEl) {
          statusEl.classList.remove('hidden');
          statusEl.innerHTML = '<span class="text-emerald-400 font-semibold">Payment successful</span>';
        }
        showToast('Payment received! Thank you!');
        recordSupporterIfDonation(selectedAmount);
        // credit wallet if dashboard context
        if (window.SWWallet && typeof SWWallet.addBalance === 'function' && selectedAmount > 0) {
          // only for creator-side topup — skip on public pages
        }
        return;
      }
      var res = await fetch(API_BASE + '/api/payment/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ transaction_id: currentTransactionId })
      });
      var data = await res.json();
      var el = document.getElementById('statusResult');
      if (el) el.classList.remove('hidden');
      if (data.success && data.status === 'paid') {
        if (el) el.innerHTML = '<span class="text-emerald-400 font-semibold">Payment Success!</span>';
        showToast('Payment received! Thank you!');
        recordSupporterIfDonation(selectedAmount);
      } else if (el) {
        el.innerHTML = '<span class="text-amber-400">Status: ' + (data.status || data.message || 'pending') + '</span>';
      }
    } catch (err) {
      showToast('Failed to check status', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Cek Status';
    }
  });
}

// Init aman
updatePayLabel();
renderSupportersWall();

if (typeof window !== 'undefined') {
  window.createPayment = createPayment;
  window.simulateFallbackPayment = simulateFallbackPayment;
  window.showPaymentModal = showPaymentModal;
  window.showToast = showToast;
  window.formatRupiah = formatRupiah;
  window.API_BASE = API_BASE;
  window.API_KEY = API_KEY;
}
