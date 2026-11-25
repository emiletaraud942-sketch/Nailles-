'use strict';

// Serveur autonome : sert le site (dossier public/) et l'API Stripe.
// Utilisé en local (npm run dev) et sur tout hébergeur Node (npm start).
// Sur Vercel, ce fichier n'est pas utilisé : les fichiers de api/ deviennent des fonctions.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

try {
  process.loadEnvFile(); // lit .env s'il existe (Node >= 20.12)
} catch {
  /* pas de fichier .env : on utilise les variables d'environnement du système */
}

const { createHandlers } = require('./lib/handlers');
const { getStripe } = require('./lib/stripe');

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Garder synchronisé avec vercel.json
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.includes('\0')) return null;
  const candidates = rel.endsWith('/') ? [rel + 'index.html'] : [rel, rel + '.html', rel + '/index.html'];
  for (const candidate of candidates) {
    const full = path.join(PUBLIC_DIR, candidate);
    if (full !== PUBLIC_DIR && !full.startsWith(PUBLIC_DIR + path.sep)) return null; // anti path traversal
    try {
      if (fs.statSync(full).isFile()) return full;
    } catch {
      /* essai suivant */
    }
  }
  return null;
}

function serveFile(res, file, status = 200) {
  const ext = path.extname(file).toLowerCase();
  const isStatic = ext === '.woff2' || (ext !== '.html' && ext !== '.json' && ext !== '.js' && ext !== '.css');
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isStatic ? 'public, max-age=86400' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

function createServer({ getStripe: stripeGetter = getStripe } = {}) {
  const api = createHandlers({ getStripe: stripeGetter });

  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname === '/api/checkout') return await api.checkout(req, res);
      if (pathname === '/api/session') return await api.session(req, res);

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        return res.end();
      }

      const file = resolveFile(pathname);
      if (file) return serveFile(res, file);

      const notFound = path.join(PUBLIC_DIR, '404.html');
      if (fs.existsSync(notFound)) return serveFile(res, notFound, 404);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Page introuvable');
    } catch (err) {
      console.error('[server]', err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erreur serveur');
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Naillies : http://localhost:${port}`);
    if (!getStripe()) {
      console.warn('⚠ STRIPE_SECRET_KEY absente ou invalide : le site s’affiche mais le paiement est désactivé (voir .env.example).');
    }
  });
}

module.exports = { createServer };
