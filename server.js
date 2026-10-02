/**
 * TraktiRie — Express server
 * Local / Railway / Render: node server.js
 * Vercel: routes all traffic here via vercel.json (@vercel/node)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/profile', require('./routes/profile'));
app.use('/api/commission', require('./routes/commission'));
app.use('/api/products', require('./routes/products'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/linkbio', require('./routes/linkbio'));
app.use('/api/theme', require('./routes/theme'));
app.use('/api/wa', require('./routes/wa'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'TraktiRie', runtime: 'express' });
});

function sendHtml(name) {
  return (_req, res) => res.sendFile(path.join(publicDir, name));
}

// Redirect legacy *.html → clean URLs
const HTML_REDIRECTS = {
  '/index.html': '/',
  '/login.html': '/login',
  '/signup.html': '/signup',
  '/dashboard.html': '/dashboard',
  '/linkbio.html': '/linkbio',
  '/shop.html': '/shop',
  '/commission.html': '/commission',
  '/support.html': '/support'
};
Object.entries(HTML_REDIRECTS).forEach(([from, to]) => {
  app.get(from, (req, res) => {
    const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, to + q);
  });
});

// Catch-all: any other *.html → strip extension
app.get(/.*\.html$/i, (req, res, next) => {
  const pathOnly = req.path.replace(/\.html$/i, '') || '/';
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  if (pathOnly === req.path) return next();
  res.redirect(301, pathOnly + q);
});

// App pages (clean URLs)
app.get('/login', sendHtml('login.html'));
app.get('/signup', sendHtml('signup.html'));
app.get('/dashboard', sendHtml('dashboard.html'));
app.get('/linkbio', sendHtml('linkbio.html'));
app.get('/shop', sendHtml('shop.html'));
app.get('/commission', sendHtml('commission.html'));
app.get('/support', sendHtml('support.html'));

// Static files (CSS, JS, assets) — extensions:html as fallback
app.use(express.static(publicDir, {
  extensions: ['html'],
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (/\.(html|css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Pretty public URLs: /{username}/{category}
app.get('/:user/(linkbio|bio|links)/?', sendHtml('linkbio.html'));
app.get('/:user/(shop|store|toko)/?', sendHtml('shop.html'));
app.get('/:user/(commission|comm|open)/?', sendHtml('commission.html'));
app.get('/:user/(support|donasi|donate|tip)/?', sendHtml('support.html'));
app.get('/shop/:user/?', sendHtml('shop.html'));
app.get('/u/:user/?', sendHtml('linkbio.html'));

// /username → linkbio
app.get('/:user', (req, res, next) => {
  const reserved = new Set([
    'api', 'css', 'js', 'assets', 'index', 'login', 'signup', 'dashboard',
    'linkbio', 'shop', 'commission', 'support', 'manifest.json',
    'service-worker.js', 'robots.txt', 'favicon.ico', 'admin'
  ]);
  if (reserved.has(req.params.user) || req.params.user.includes('.')) return next();
  res.sendFile(path.join(publicDir, 'linkbio.html'));
});

// Root
app.get('/', sendHtml('index.html'));

app.use((err, _req, res, _next) => {
  console.error('[TraktiRie]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Export for Vercel serverless; listen only outside Vercel
module.exports = app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`TraktiRie running at http://localhost:${PORT}`);
  });
}
