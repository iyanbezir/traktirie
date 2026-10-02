/**
 * TraktiRie Store Data — produk & info toko sekarang di Turso lewat /api/products.
 * Semua fungsi baca/tulis data ASYNC.
 */

function getStoreSlugFromUrl() {
  if (window.TraktiRieRouter) {
    return TraktiRieRouter.getUsernameFromUrl('').toLowerCase();
  }
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && ['shop', 'store', 'toko'].includes(parts[1].toLowerCase())) {
    return decodeURIComponent(parts[0]).toLowerCase();
  }
  const shopIdx = parts.indexOf('shop');
  if (shopIdx !== -1 && parts[shopIdx + 1]) {
    return decodeURIComponent(parts[shopIdx + 1]).toLowerCase();
  }
  const q = new URLSearchParams(location.search).get('store');
  if (q) return q.toLowerCase();
  return '';
}

/** Ambil data toko publik (nama, tagline, daftar produk) by slug/username. */
async function getStoreBySlug(slug) {
  try {
    const { store } = await window.TraktiRieBackend.apiFetch('/api/products?slug=' + encodeURIComponent(slug));
    return store;
  } catch (e) {
    return { name: '@' + slug, avatarSeed: slug, tagline: 'Digital store on TraktiRie', products: [] };
  }
}

/** Product milik toko sendiri (dashboard, butuh login). */
async function getMyProducts() {
  const { products } = await window.TraktiRieBackend.apiFetch('/api/products');
  return products;
}

/** Add / update produk di toko sendiri. */
async function upsertProduct(product) {
  const { product: saved } = await window.TraktiRieBackend.apiFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
  return saved;
}

async function removeProduct(code) {
  await window.TraktiRieBackend.apiFetch('/api/products?code=' + encodeURIComponent(code), { method: 'DELETE' });
  return true;
}

async function saveStoreSettings(settings) {
  await window.TraktiRieBackend.apiFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify({ action: 'save-store', ...settings })
  });
  return true;
}

function findProduct(store, code) {
  if (!store || !store.products) return null;
  return store.products.find((p) => String(p.code).toLowerCase() === String(code).toLowerCase()) || null;
}

/** Save order shop yang sudah bayar (untuk unlock link di device pembeli — tetap lokal, ini cache tampilan saja). */
function savePurchase(order) {
  try {
    const key = 'sw_shop_purchases';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ ...order, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

function getPurchases() {
  try {
    return JSON.parse(localStorage.getItem('sw_shop_purchases') || '[]');
  } catch {
    return [];
  }
}

if (typeof window !== 'undefined') {
  window.TraktiRieStore = {
    getStoreSlugFromUrl, getStoreBySlug, getMyProducts,
    upsertProduct, removeProduct, saveStoreSettings, findProduct,
    savePurchase, getPurchases
  };
}
