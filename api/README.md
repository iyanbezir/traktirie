# API routes moved

The backend now uses **Express**.

Handlers live in `/routes`:

- `routes/profile.js` → `/api/profile`
- `routes/commission.js` → `/api/commission`
- `routes/products.js` → `/api/products`
- `routes/wallet.js` → `/api/wallet`
- `routes/linkbio.js` → `/api/linkbio`
- `routes/theme.js` → `/api/theme`
- `routes/wa.js` → `/api/wa`

Entry point: `server.js`
