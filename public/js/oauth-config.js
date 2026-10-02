/**
 * CARA DAPAT CLIENT ID:
 *
 * 1) GOOGLE
 *    - https://console.cloud.google.com/apis/credentials
 *    - Create Credentials → OAuth client ID → Web application
 *    - Authorized JavaScript origins: https://domain-kamu.vercel.app
 *    - Authorized redirect URIs: https://domain-kamu.vercel.app/login
 *    - Copy "Client ID" (bentuk: xxxxx.apps.googleusercontent.com)
 *
 * 2) GITHUB
 *    - https://github.com/settings/developers → OAuth Apps → New
 *    - Homepage URL: https://domain-kamu.vercel.app
 *    - Authorization callback URL: https://domain-kamu.vercel.app/login
 *    - Copy Client ID (Client Secret hanya di backend!)
 *
 * 3) X (Twitter)
 *    - https://developer.x.com/en/portal/dashboard
 *    - Project → App → User authentication settings → OAuth 2.0
 *    - Type: Web App | Callback: https://domain-kamu.vercel.app/login
 *    - Copy Client ID
 *
 * 4) TIKTOK
 *    - https://developers.tiktok.com/
 *    - Create app → Login Kit → Redirect URI sama
 *    - Copy Client Key (dipakai seperti Client ID)
 *
 * CATATAN:
 * - Client SECRET jangan pernah ditaruh di frontend.
 * - OAuth real butuh backend (atau Supabase/Firebase) untuk tukar code → token.
 * - Kalau clientId masih kosong, tombol tetap jalan mode uji (isi nama).
 */

const OAUTH_CONFIG = {
  google: {
    enabled: true,
    label: 'Google',
    clientId: '1036269350456-c6fun9tq8d6p4mvq7hvokl54jfa4kmtd.apps.googleusercontent.com', // example: '123456789-abc.apps.googleusercontent.com'
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
    // response_type=token = implicit (frontend-only, limited); production pakai code + backend
  },
  github: {
    enabled: true,
    label: 'GitHub',
    clientId: 'Ov23liK258pEx37EUaX4', // example: 'Ov23liXXXXXXXX'
    authUrl: 'https://github.com/login/oauth/authorize',
    scope: 'read:user user:email'
  },
  x: {
    enabled: true,
    label: 'X',
    clientId: 'NXhwcVRSNjdzaTU5aENJc1dlT0w6MTpjaQ', // example: 'xxxxxxxx from developer.x.com'
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scope: 'tweet.read users.read offline.access'
  },
  tiktok: {
    enabled: false,
    label: 'TikTok',
    clientId: 'awlu5afzb009ljbx', // Client Key dari developers.tiktok.com
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scope: 'user.info.basic'
  }
};

function getOAuthRedirectUri() {
  try {
    return location.origin + '/login';
  } catch (e) {
    return 'https://localhost/login';
  }
}

/**
 * Bangun URL authorize. Return null jika clientId belum diisi.
 */
function buildOAuthUrl(provider) {
  const cfg = OAUTH_CONFIG[provider];
  if (!cfg || !cfg.clientId || !String(cfg.clientId).trim()) return null;

  const redirect = encodeURIComponent(getOAuthRedirectUri());
  const state = encodeURIComponent(JSON.stringify({ provider: provider, t: Date.now() }));
  const scope = encodeURIComponent(cfg.scope || '');

  if (provider === 'google') {
    return cfg.authUrl +
      '?client_id=' + encodeURIComponent(cfg.clientId) +
      '&redirect_uri=' + redirect +
      '&response_type=token' +
      '&scope=' + scope +
      '&state=' + state +
      '&prompt=select_account';
  }
  if (provider === 'github') {
    return cfg.authUrl +
      '?client_id=' + encodeURIComponent(cfg.clientId) +
      '&redirect_uri=' + redirect +
      '&scope=' + scope +
      '&state=' + state;
  }
  if (provider === 'x') {
    // PKCE idealnya wajib; ini skeleton — production pakai backend
    return cfg.authUrl +
      '?response_type=code' +
      '&client_id=' + encodeURIComponent(cfg.clientId) +
      '&redirect_uri=' + redirect +
      '&scope=' + scope +
      '&state=' + state +
      '&code_challenge=challenge' +
      '&code_challenge_method=plain';
  }
  if (provider === 'tiktok') {
    return cfg.authUrl +
      '?client_key=' + encodeURIComponent(cfg.clientId) +
      '&redirect_uri=' + redirect +
      '&response_type=code' +
      '&scope=' + scope +
      '&state=' + state;
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.TraktiRieOAuth = { OAUTH_CONFIG, getOAuthRedirectUri, buildOAuthUrl };
}
