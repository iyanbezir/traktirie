# TraktiRie — Setup (Express + Turso + Supabase + Cloudinary)

Backend runs as a normal **Express** server. Data is stored on Turso; login uses Supabase Auth.

**Stack:**
- **Express** → HTTP server + static files + `/api/*`
- **Turso** (SQLite/libSQL) → profiles, wallet, orders, themes, etc.
- **Supabase** → Auth only (login / signup / session)
- **Cloudinary** → image uploads (optional)

---

## 1. Supabase project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → New Project.
2. **Authentication → Providers → Email** → Enabled.
3. Turn **off** “Confirm email” (this app has its own OTP flow).
4. (Optional) Enable Google / GitHub / X providers.
5. Copy from **Settings → API**:
   - Project URL
   - `anon public` key (for frontend)
   - `service_role` key (⚠️ server only)

## 2. Turso database

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create traktirie
turso db show traktirie --url
turso db tokens create traktirie
turso db shell traktirie < db/schema.sql
```

Optional demo products (after you create the `iyandev` account):

```bash
turso db shell traktirie < db/seed-demo-products.sql
```

## 3. Cloudinary (optional)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Note Cloud name + create an **Unsigned** upload preset

## 4. Frontend config

Edit `js/backend-config.js`:

```js
window.TraktiRieBackend = {
  supabase: {
    url: 'https://xxxxx.supabase.co',
    anonKey: 'eyJhbGciOi...'   // anon public key
  },
  cloudinary: {
    cloudName: 'xxxxx',
    uploadPreset: 'xxxxx'
  }
};
```

These are safe in the browser.

## 5. Server env + run Express

```bash
cd traktirie
cp .env.example .env
# edit .env:
#   TURSO_DATABASE_URL=...
#   TURSO_AUTH_TOKEN=...
#   SUPABASE_URL=...
#   SUPABASE_SERVICE_ROLE_KEY=...

npm install
npm start
# → http://localhost:3000
```

Dev with auto-reload:

```bash
npm run dev
```

## 6. Make your account admin

1. Sign up at `/signup.html` (e.g. username `iyandev`)
2. Run:

```bash
turso db shell traktirie "UPDATE profiles SET role='admin' WHERE username='iyandev';"
```

## 7. Deploy

Any Node host works (Railway, Render, Fly.io, VPS, etc.):

```bash
npm start
```

Set the same env vars on the host.  
`PORT` is usually provided by the platform.

### Vercel (optional)

`vercel.json` points at `server.js`. Set the same environment variables in the Vercel project settings, then deploy.

---

### Still local per browser (intentional)

- Support board on the support page
- External WA bot URL/API key & send logs
- Buyer “already purchased” cache

### Known limits

- Top-up is still trusted from the client until you wire real payment webhooks to `/api/wallet`.
- No full dashboard UI yet for adding shop products (API is ready).
- TikTok login is not available via Supabase Auth.
