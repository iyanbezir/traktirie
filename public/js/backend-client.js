/**
 * TraktiRie Backend Client
 * Butuh dimuat SETELAH js/backend-config.js dan SDK Supabase (CDN):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="js/backend-config.js"></script>
 *   <script src="js/backend-client.js"></script>
 */
(function () {
  const cfg = window.TraktiRieBackend;
  const supabaseClient = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

  /** Ambil access token sesi aktif (null kalau belum login). */
  async function getAccessToken() {
    const { data } = await supabaseClient.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  }

  /** Fetch ke /api/* dengan Authorization: Bearer <token> otomatis (kalau login). */
  async function apiFetch(path, options = {}) {
    const token = await getAccessToken();
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
      token ? { Authorization: 'Bearer ' + token } : {}
    );
    const res = await fetch(path, { ...options, headers });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed (' + res.status + ')');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /** Upload gambar langsung ke Cloudinary (unsigned preset), return URL publik. */
  async function uploadImage(file) {
    const c = cfg.cloudinary;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', c.uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Image upload failed');
    return data.secure_url;
  }

  window.TraktiRieBackend.client = supabaseClient;
  window.TraktiRieBackend.getAccessToken = getAccessToken;
  window.TraktiRieBackend.apiFetch = apiFetch;
  window.TraktiRieBackend.uploadImage = uploadImage;
})();
