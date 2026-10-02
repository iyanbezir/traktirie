# TraktiRie — Creator Platform

A simple all-in-one page for content creators to:

- Share links (link-in-bio)
- Sell digital products
- Open commissions / custom work
- Accept tips & donations
- Manage a wallet & withdrawals

Inspired by Linktree, Lynk.id, and Sociabuzz — but built so creators can actually get paid from one place.

## Admin account (demo)

| Field    | Value               |
|----------|---------------------|
| Username | `IyanDev`           |
| Email    | `riiresc@gmail.com` |
| Password | `iyanjirr`          |

Log in at `login.html` with username **or** email + the password above.

## Public URLs

Every creator page follows this pattern:

```
{baseurl}/{username}/{category}
```

| Category    | Example                              |
|-------------|--------------------------------------|
| linkbio     | `https://domain.com/IyanDev/linkbio` |
| shop        | `https://domain.com/IyanDev/shop`    |
| commission  | `https://domain.com/IyanDev/commission` |
| support     | `https://domain.com/IyanDev/support` |

Aliases that also work:

- linkbio → `bio`, `links`
- shop → `store`
- commission → `comm`, `open`
- support → `donate`, `tip`

Just `/{username}` (no category) defaults to **LinkBio**.

Older formats still work: `/u/IyanDev`, `/shop/iyandev`, `?u=`, `?store=`.

## Main features

### 1. LinkBio
One page for all your links, social icons, shop, support and commission buttons.  
Creators can customize colors, button styles, and background in Theme Studio.

### 2. Open Commission
Toggle open/closed. Offer different service types. Buyers can order and pay via QR.  
WhatsApp notification simulation is included on the frontend.

### 3. Digital Shop
Sell digital files, templates, presets, e-books, etc. Buyers get instant access after payment.

### 4. Support / Tips
Fans can send a tip with an optional message. Support board shows recent supporters.

### 5. Wallet & Withdrawals
Balance, top-up, and withdraw to e-wallet or bank. Admin fee and store subscription settings are available (demo uses localStorage when backend is not configured).

### 6. WA Assistant
Generate a pairing code from the dashboard. Order notifications are simulated in the frontend (production would need a real Baileys backend).

### 7. PWA
`manifest.json` + `service-worker.js` so the site can be installed on Android/Chrome.

## Auth

- Multi-user accounts (stored in localStorage when running without backend)
- Admin is pre-seeded
- New creators sign up via `signup.html` with optional email OTP verification
- Login can be protected with Cloudflare Turnstile (optional — only active if you add a site key)
- Session lasts 30 days

**Important:** Auth and balances are still client-side by default. For real production use, move everything to a proper backend (Supabase / Appwrite / custom API) and hash passwords.

---

## Security: Cloudflare Turnstile + Email OTP

Config lives in **`js/security-config.js`**.

### Cloudflare Turnstile (bot protection)

1. Go to [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Add a site → enter your domain (or `*` for testing)
3. Widget mode: **Managed**
4. Copy the **Site Key**
5. Paste it into `js/security-config.js`:

```js
turnstile: {
  enabled: true,
  siteKey: '0x4AAAAAAA...',   // your Site Key
  theme: 'dark',
  size: 'normal'
}
```

Never put the Secret Key in the frontend. In production, verify the token on the server.

If `siteKey` is empty, the widget stays hidden and forms still work (demo mode).

### Email OTP verification

Signup flow:

1. User fills username + email + password (+ Turnstile if enabled)
2. Clicks **Send verification code** → 6-digit code is generated
3. User enters the code → account is created with `emailVerified: true`

#### Demo mode (default, no real email)

```js
emailOtp: {
  enabled: true,
  provider: 'demo',
  codeLength: 6,
  expiryMinutes: 10,
  maxAttempts: 5
}
```

The code appears in the UI and in the browser console. Good for local development.

#### Real emails with EmailJS

1. Sign up at [emailjs.com](https://www.emailjs.com/)
2. Connect an email service and create a template
3. Put your Public Key, Service ID and Template ID into `js/security-config.js`

You can customize the subject and message text there too.

To disable OTP completely:

```js
emailOtp: { enabled: false, ... }
```

---

## Deploy on Vercel

```bash
cd traktirie
vercel
# or just drag the folder onto vercel.com
```

## Payment

Change the API key in `js/payment.js`:

```js
const API_KEY = 'artan_xxxxxxxxx';
```

Base URL: `https://tokoshopp.web.id`

If the key is invalid, the system falls back to a simulated QR (without an obvious "demo" label).

## Project structure

```
traktirie/
├── server.js           # Express entry (API + static)
├── package.json
├── .env.example
├── index.html          # Landing page
├── login.html / signup.html
├── dashboard.html
├── linkbio.html / support.html / shop.html / commission.html
├── routes/             # Express API routers
│   ├── profile.js
│   ├── commission.js
│   ├── products.js
│   ├── wallet.js
│   ├── linkbio.js
│   ├── theme.js
│   └── wa.js
├── lib/
│   ├── db.js           # Turso client
│   └── auth.js         # Supabase auth middleware
├── js/                 # Frontend
├── css/
├── db/schema.sql
└── assets/icons/
```

Run:

```bash
npm install && npm start
```

## Theme Studio

Inside **Dashboard → Theme Studio** you can:

### LinkBio
- Edit every link (title, URL, emoji, primary/secondary)
- Button style: Rounded / Pill / Soft
- Colors and background (solid, gradient, or image)

### Shop
- Product card layout: 1 column or 2 columns
- Theme colors, card radius, etc.

### Default themes
1. **Neon Purple** — dark modern purple (default)
2. **Purple Cream** — light cream with purple accents
3. **Midnight Glass** — dark elegant glassmorphism

Export / Import as `.traktirie-theme.json` so creators can share themes.

Themes are saved per user in localStorage (`sw_theme_linkbio_<user>`, `sw_theme_shop_<user>`).

## Before you share publicly

1. Put a real payment API key in `js/payment.js`
2. Log in with the admin account and try the full flow
3. Open Theme Studio, pick a theme, save LinkBio & Shop
4. Deploy to Vercel
5. Share your links:
   - Landing: `/`
   - LinkBio: `/linkbio.html` or `/u/IyanDev`
   - Shop: `/shop/iyandev`
   - Commission: `/commission.html`
   - Support: `/support.html`

**Note:** Auth, balances, orders and WA pairing still run client-side when no backend is connected. For real scale, run the Express server with Turso + Supabase (see SETUP.md) and a proper WhatsApp bot.
