/**
 * TraktiRie Theme Engine
 * Warna/layout tema & susunan link sekarang disimpan di Turso lewat
 * /api/theme dan /api/linkbio (dulu localStorage). Fungsi baca/tulis ASYNC.
 * Pure functions (apply to DOM, export/import file) stay synchronous as before.
 */

const DEFAULT_THEMES = {
  neon_purple: {
    id: 'neon_purple',
    name: 'Neon Ungu',
    version: 1,
    description: 'Default modern ungu neon gelap',
    bg: '#05030c',
    bgSecondary: '#0c0818',
    text: '#ffffff',
    textMuted: '#a78bfa',
    primary: '#a855f7',
    primaryEnd: '#7c3aed',
    accent: '#c084fc',
    cardBg: 'rgba(168, 85, 247, 0.08)',
    cardBorder: 'rgba(168, 85, 247, 0.18)',
    buttonText: '#ffffff',
    buttonStyle: 'rounded',
    buttonShadow: true,
    bgType: 'gradient',
    bgValue: 'radial-gradient(ellipse 90% 60% at 50% -15%, #2a1650 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(124,58,237,0.15) 0%, transparent 50%), #05030c',
    productLayout: '1x2',
    cardRadius: '1.25rem',
    cardHover: true
  },
  sociabuzz_purple: {
    id: 'sociabuzz_purple',
    name: 'Sociabuzz Purple Cream',
    version: 1,
    description: 'Inspirasi Sociabuzz — base cream/putih, aksen ungu',
    bg: '#faf7f2',
    bgSecondary: '#ffffff',
    text: '#1a1225',
    textMuted: '#6b5b95',
    primary: '#7c3aed',
    primaryEnd: '#a855f7',
    accent: '#8b5cf6',
    cardBg: '#ffffff',
    cardBorder: 'rgba(124, 58, 237, 0.15)',
    buttonText: '#ffffff',
    buttonStyle: 'soft',
    buttonShadow: true,
    bgType: 'solid',
    bgValue: '#faf7f2',
    productLayout: '1x2',
    cardRadius: '1rem',
    cardHover: true
  },
  midnight_glass: {
    id: 'midnight_glass',
    name: 'Midnight Glass',
    version: 1,
    description: 'Gelap elegan, glassmorphism lembut',
    bg: '#0a0a12',
    bgSecondary: '#12121c',
    text: '#f0eef8',
    textMuted: '#9b8ec4',
    primary: '#8b5cf6',
    primaryEnd: '#6366f1',
    accent: '#a78bfa',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    buttonText: '#ffffff',
    buttonStyle: 'pill',
    buttonShadow: false,
    bgType: 'gradient',
    bgValue: 'linear-gradient(180deg, #0a0a12 0%, #12121c 50%, #0f0a1a 100%)',
    productLayout: '1x1',
    cardRadius: '1.5rem',
    cardHover: true
  }
};

/**
 * Ambil tema.
 * - Dengan `username` → publik, tidak butuh login (halaman linkbio/shop pengunjung).
 * - Tanpa `username` → tema toko sendiri (dashboard, butuh login).
 */
async function getTheme(type, username) {
  try {
    const qs = username
      ? '/api/theme?slug=' + encodeURIComponent(username) + '&scope=' + type
      : '/api/theme?scope=' + type;
    const { theme } = await window.TraktiRieBackend.apiFetch(qs);
    if (theme) {
      const base = DEFAULT_THEMES[theme.id] || DEFAULT_THEMES.neon_purple;
      return { ...base, ...theme };
    }
  } catch (e) {}
  return { ...DEFAULT_THEMES.neon_purple };
}

/** Save tema toko sendiri (selalu butuh login — parameter username diabaikan, server pakai token). */
async function saveTheme(type, theme) {
  await window.TraktiRieBackend.apiFetch('/api/theme?scope=' + type, {
    method: 'PUT',
    body: JSON.stringify({ theme })
  });
  return true;
}

function applyThemeToDocument(theme) {
  const root = document.documentElement;
  root.style.setProperty('--tr-bg', theme.bg);
  root.style.setProperty('--tr-bg-secondary', theme.bgSecondary);
  root.style.setProperty('--tr-text', theme.text);
  root.style.setProperty('--tr-text-muted', theme.textMuted);
  root.style.setProperty('--tr-primary', theme.primary);
  root.style.setProperty('--tr-primary-end', theme.primaryEnd);
  root.style.setProperty('--tr-accent', theme.accent);
  root.style.setProperty('--tr-card-bg', theme.cardBg);
  root.style.setProperty('--tr-card-border', theme.cardBorder);
  root.style.setProperty('--tr-button-text', theme.buttonText);
  root.style.setProperty('--tr-card-radius', theme.cardRadius || '1.25rem');

  if (theme.bgType === 'image' && theme.bgValue) {
    document.body.style.background = `center / cover no-repeat url("${theme.bgValue}")`;
    document.body.style.backgroundColor = theme.bg;
  } else if (theme.bgType === 'gradient') {
    document.body.style.background = theme.bgValue || theme.bg;
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.background = theme.bg;
  }
  document.body.style.color = theme.text;
}

function buttonClassFromTheme(theme, variant) {
  const style = theme.buttonStyle || 'rounded';
  let radius = 'rounded-2xl';
  if (style === 'pill') radius = 'rounded-full';
  if (style === 'soft') radius = 'rounded-xl';
  const shadow = theme.buttonShadow ? 'shadow-lg' : '';
  if (variant === 'primary') {
    return `linkbio-btn relative flex items-center w-full py-4 px-5 ${radius} font-semibold transition ${shadow}`;
  }
  return `linkbio-btn relative flex items-center w-full py-4 px-5 ${radius} font-semibold transition border`;
}

function exportTheme(theme) {
  return JSON.stringify({ ...theme, exportedAt: new Date().toISOString(), app: 'TraktiRie', version: theme.version || 1 }, null, 2);
}

function importTheme(jsonString) {
  try {
    const t = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!t || typeof t !== 'object') throw new Error('Invalid format');
    const allowed = [
      'id', 'name', 'description', 'version',
      'bg', 'bgSecondary', 'text', 'textMuted',
      'primary', 'primaryEnd', 'accent',
      'cardBg', 'cardBorder', 'buttonText',
      'buttonStyle', 'buttonShadow',
      'bgType', 'bgValue',
      'productLayout', 'cardRadius', 'cardHover'
    ];
    const clean = {};
    allowed.forEach(k => { if (t[k] !== undefined) clean[k] = t[k]; });
    if (!clean.name) clean.name = 'Imported Theme';
    if (!clean.id) clean.id = 'custom_' + Date.now();
    return { success: true, theme: clean };
  } catch (e) {
    return { success: false, message: e.message || 'Failed parse JSON tema' };
  }
}

function downloadThemeFile(theme, filename) {
  const blob = new Blob([exportTheme(theme)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || (theme.id || 'theme') + '.traktirie-theme.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** LinkBio: daftar link (terpisah dari warna tema). */
async function getLinkBioConfig(username) {
  try {
    const qs = username ? '/api/linkbio?slug=' + encodeURIComponent(username) : '/api/linkbio';
    const r = await window.TraktiRieBackend.apiFetch(qs);
    return r.config || null;
  } catch (e) {
    return null;
  }
}

async function saveLinkBioConfig(config) {
  await window.TraktiRieBackend.apiFetch('/api/linkbio', {
    method: 'PUT',
    body: JSON.stringify({ config })
  });
  return true;
}

if (typeof window !== 'undefined') {
  window.TraktiRieTheme = {
    DEFAULT_THEMES,
    getTheme, saveTheme,
    applyThemeToDocument, buttonClassFromTheme,
    exportTheme, importTheme, downloadThemeFile,
    getLinkBioConfig, saveLinkBioConfig
  };
}
