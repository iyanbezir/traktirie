/**
 * TraktiRie public URL router
 * Pola: /{username}/{category}
 * category: linkbio | shop | commission | support
 */

const CATEGORY_ALIASES = {
  linkbio: 'linkbio',
  bio: 'linkbio',
  links: 'linkbio',
  shop: 'shop',
  store: 'shop',
  toko: 'shop',
  commission: 'commission',
  comm: 'commission',
  open: 'commission',
  support: 'support',
  donasi: 'support',
  donate: 'support',
  tip: 'support'
};

const RESERVED = new Set([
  'css', 'js', 'assets', 'api', 'login', 'signup', 'dashboard', 'index',
  'manifest', 'service-worker', 'robots', 'favicon', 'u', 'shop', 'linkbio',
  'commission', 'support', 'admin'
]);

function pathParts() {
  return location.pathname.split('/').filter(Boolean).map(function (p) {
    try { return decodeURIComponent(p); } catch (e) { return p; }
  });
}

/**
 * Ambil username dari URL publik.
 * Prioritas: /{user}/{cat} → /u/{user} → ?u= / ?user= / ?store=
 */
function getUsernameFromUrl(fallback) {
  const parts = pathParts();
  const q = new URLSearchParams(location.search);

  // /{username}/{category}
  if (parts.length >= 2) {
    const maybeUser = parts[0];
    const maybeCat = (parts[1] || '').toLowerCase();
    if (!RESERVED.has(maybeUser.toLowerCase()) && CATEGORY_ALIASES[maybeCat]) {
      return maybeUser;
    }
  }

  // /{username} saja (anggap linkbio)
  if (parts.length === 1) {
    const only = parts[0];
    const lower = only.toLowerCase();
    if (!RESERVED.has(lower) && !CATEGORY_ALIASES[lower] && !/\.(html|js|css|png|json|txt|ico|webmanifest)$/i.test(only)) {
      return only;
    }
  }

  // legacy /u/username atau /shop/username
  if (parts[0] === 'u' && parts[1]) return parts[1];
  if (parts[0] === 'shop' && parts[1]) return parts[1];
  if (parts[0] === 'linkbio' && parts[1]) return parts[1];

  const fromQ = q.get('u') || q.get('user') || q.get('store') || q.get('nama');
  if (fromQ) return fromQ;

  // Catatan: dulu ada fallback "pakai username sendiri kalau lagi login",
  // tapi SWAuth.getUser() sekarang async sedangkan fungsi ini dipakai secara
  // sinkron di banyak halaman publik — jadi fallback itu dihapus. Kalau perlu,
  // panggil `await SWAuth.getUser()` langsung di halaman yang bersangkutan.

  return fallback || '';
}

function getCategoryFromUrl(fallback) {
  const parts = pathParts();
  if (parts.length >= 2) {
    const cat = (parts[1] || '').toLowerCase();
    if (CATEGORY_ALIASES[cat]) return CATEGORY_ALIASES[cat];
  }
  // legacy path filename
  const file = (parts[parts.length - 1] || '').toLowerCase();
  if (file.indexOf('shop') === 0) return 'shop';
  if (file.indexOf('commission') === 0) return 'commission';
  if (file.indexOf('support') === 0) return 'support';
  if (file.indexOf('linkbio') === 0) return 'linkbio';
  if (parts.length === 1 && !RESERVED.has(parts[0].toLowerCase()) && !CATEGORY_ALIASES[parts[0].toLowerCase()]) {
    return 'linkbio';
  }
  return fallback || 'linkbio';
}

/**
 * Build public URL untuk creator page
 * @param {string} username
 * @param {'linkbio'|'shop'|'commission'|'support'} category
 */
function publicUrl(username, category) {
  const u = encodeURIComponent(String(username || '').replace(/^@/, ''));
  const c = category || 'linkbio';
  // relative dari root site
  return '/' + u + '/' + c;
}

function defaultPublicLinks(username) {
  const u = String(username || '').replace(/^@/, '');
  return [
    { title: 'Support / Donation', url: publicUrl(u, 'support'), style: 'primary', icon: 'heart' },
    { title: 'Open Commission', url: publicUrl(u, 'commission'), style: 'secondary', icon: 'film' },
    { title: 'Digital Shop', url: publicUrl(u, 'shop'), style: 'secondary', icon: 'cart' },
    { title: 'Portfolio & Karya', url: '#', style: 'secondary', icon: 'spark' },
    { title: 'Join Community', url: '#', style: 'secondary', icon: 'chat' }
  ];
}


/**
 * Halaman publik yang diaktifkan creator.
 * config.pages = { shop: true, commission: true, support: true }
 * Default: semua aktif (backward compatible).
 * LinkBio selalu tampil.
 */
function enabledPages(config) {
  const pages = (config && config.pages) || {};
  const all = [
    { id: 'linkbio', label: 'LinkBio' },
    { id: 'shop', label: 'Shop' },
    { id: 'commission', label: 'Commission' },
    { id: 'support', label: 'Support' }
  ];
  return all.filter(function (p) {
    if (p.id === 'linkbio') return true;
    // undefined / null = aktif (default); hanya false yang disembunyikan
    return pages[p.id] !== false;
  });
}

/** Render catNav pills. activeId = halaman saat ini. */
function renderCatNav(el, username, activeId, config) {
  if (!el) return;
  const list = enabledPages(config);
  el.innerHTML = list.map(function (p) {
    const active = p.id === activeId;
    const cls = active
      ? 'border-violet-500 bg-violet-500/20 text-white'
      : 'border-white/10 text-slate-400 hover:text-white';
    return '<a href="' + publicUrl(username, p.id) + '" class="px-3 py-1.5 rounded-full border ' + cls + '" style="color:var(--tr-text)">' + p.label + '</a>';
  }).join('');
}

if (typeof window !== 'undefined') {
  window.TraktiRieRouter = {
    getUsernameFromUrl,
    getCategoryFromUrl,
    publicUrl,
    defaultPublicLinks,
    enabledPages,
    renderCatNav,
    CATEGORY_ALIASES,
    RESERVED
  };
}
