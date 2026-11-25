'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createServer } = require('../server');
const { catalog } = require('../lib/catalog');
const { buildSessionParams } = require('../lib/checkout');

// Faux client Stripe : enregistre les appels, ne contacte jamais Stripe.
function fakeStripe({ failCreate = false } = {}) {
  const calls = [];
  return {
    calls,
    checkout: {
      sessions: {
        async create(params) {
          calls.push(params);
          if (failCreate) throw new Error('clé secrète sk_live_SECRETE invalide'); // ne doit jamais fuiter
          return { id: 'cs_test_fake123456789', url: 'https://checkout.stripe.com/c/pay/cs_test_fake123456789' };
        },
        async retrieve(id) {
          if (id === 'cs_test_inconnue1234567') throw new Error('No such session');
          return {
            id,
            payment_status: 'paid',
            amount_total: 7480,
            currency: 'eur',
            metadata: { kit: 'avec-capsules', quantity: '1' },
            // Données personnelles : ne doivent PAS ressortir de /api/session
            customer_details: { email: 'cliente@example.com', name: 'Camille Test' },
            shipping_details: { address: { line1: '1 rue de Test' } },
          };
        },
      },
    },
  };
}

async function withServer(stripe, fn) {
  const server = createServer({ getStripe: () => stripe });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (base, body, raw = false) =>
  fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? body : JSON.stringify(body),
  });

test('catalogue : deux kits, prix entiers en centimes, pays valides', () => {
  assert.deepEqual(catalog.kits.map((k) => k.id).sort(), ['avec-capsules', 'sans-capsules']);
  for (const kit of catalog.kits) {
    assert.ok(Number.isInteger(kit.priceCents) && kit.priceCents > 0, `prix de ${kit.id}`);
  }
  assert.ok(Number.isInteger(catalog.shipping.amountCents) && catalog.shipping.amountCents >= 0);
  assert.ok(catalog.shipping.countries.every((c) => /^[A-Z]{2}$/.test(c)));
  assert.ok(catalog.preorder.closesAt === null || !Number.isNaN(Date.parse(catalog.preorder.closesAt)));
});

test('la page propose exactement les kits du catalogue', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const values = [...html.matchAll(/name="kit" value="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(values, catalog.kits.map((k) => k.id).sort());
});

test('buildSessionParams : prix serveur, livraison, redirections', () => {
  const kit = catalog.kits[0];
  const p = buildSessionParams({ kit, quantity: 2, origin: 'https://exemple.fr' });
  assert.equal(p.mode, 'payment');
  assert.equal(p.locale, 'fr');
  assert.equal(p.line_items[0].quantity, 2);
  assert.equal(p.line_items[0].price_data.unit_amount, kit.priceCents);
  assert.equal(p.line_items[0].price_data.currency, 'eur');
  assert.deepEqual(p.shipping_address_collection.allowed_countries, catalog.shipping.countries);
  assert.equal(p.shipping_options[0].shipping_rate_data.fixed_amount.amount, catalog.shipping.amountCents);
  assert.equal(p.success_url, 'https://exemple.fr/merci?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(p.cancel_url, 'https://exemple.fr/#precommande');
  assert.equal(p.metadata.kit, kit.id);
  assert.equal(p.metadata.preorder, 'true');
  assert.deepEqual(p.line_items[0].price_data.product_data.images, ['https://exemple.fr/assets/kit-noel.jpg']);
});

test('buildSessionParams : pas d’image en local (Stripe ne peut pas la télécharger)', () => {
  const p = buildSessionParams({ kit: catalog.kits[0], quantity: 1, origin: 'http://localhost:3000' });
  assert.equal('images' in p.line_items[0].price_data.product_data, false);
});

test('POST /api/checkout : succès, le prix envoyé par le navigateur est ignoré', async () => {
  const stripe = fakeStripe();
  await withServer(stripe, async (base) => {
    const res = await post(base, { kit: 'sans-capsules', quantity: 3, price: 1, unit_amount: 1 });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.url, /^https:\/\/checkout\.stripe\.com\//);
    assert.equal(stripe.calls.length, 1);
    const sans = catalog.kits.find((k) => k.id === 'sans-capsules');
    assert.equal(stripe.calls[0].line_items[0].price_data.unit_amount, sans.priceCents);
    assert.equal(stripe.calls[0].line_items[0].quantity, 3);
  });
});

test('POST /api/checkout : entrées invalides refusées sans appeler Stripe', async () => {
  const stripe = fakeStripe();
  await withServer(stripe, async (base) => {
    const bad = [
      { kit: 'inconnu', quantity: 1 },
      { quantity: 1 },
      { kit: 'avec-capsules', quantity: 0 },
      { kit: 'avec-capsules', quantity: catalog.maxQuantity + 1 },
      { kit: 'avec-capsules', quantity: 1.5 },
      { kit: 'avec-capsules', quantity: 'abc' },
      { kit: 'avec-capsules', quantity: -2 },
    ];
    for (const body of bad) {
      const res = await post(base, body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    assert.equal((await post(base, '{pas du json', true)).status, 400);
    assert.equal(stripe.calls.length, 0);
  });
});

test('/api/checkout : méthode GET refusée', async () => {
  await withServer(fakeStripe(), async (base) => {
    const res = await fetch(`${base}/api/checkout`);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  });
});

test('POST /api/checkout : 503 si Stripe n’est pas configuré', async () => {
  await withServer(null, async (base) => {
    const res = await post(base, { kit: 'avec-capsules', quantity: 1 });
    assert.equal(res.status, 503);
  });
});

test('POST /api/checkout : erreur Stripe -> 502 sans fuite du message interne', async () => {
  await withServer(fakeStripe({ failCreate: true }), async (base) => {
    const res = await post(base, { kit: 'avec-capsules', quantity: 1 });
    assert.equal(res.status, 502);
    const text = await res.text();
    assert.ok(!text.includes('sk_live'), 'le message interne ne doit pas fuiter');
  });
});

test('POST /api/checkout : 410 une fois la date limite passée', async () => {
  const previous = catalog.preorder.closesAt;
  catalog.preorder.closesAt = '2020-01-01T00:00:00+01:00';
  try {
    const stripe = fakeStripe();
    await withServer(stripe, async (base) => {
      const res = await post(base, { kit: 'avec-capsules', quantity: 1 });
      assert.equal(res.status, 410);
      assert.equal(stripe.calls.length, 0);
    });
  } finally {
    catalog.preorder.closesAt = previous;
  }
});

test('GET /api/session : récapitulatif minimal, aucune donnée personnelle', async () => {
  await withServer(fakeStripe(), async (base) => {
    const res = await fetch(`${base}/api/session?id=cs_test_fake123456789`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(Object.keys(data).sort(), ['amountTotal', 'currency', 'kitName', 'paid', 'quantity']);
    assert.equal(data.paid, true);
    assert.equal(data.kitName, catalog.kits[0].name);
    const raw = JSON.stringify(data);
    assert.ok(!raw.includes('cliente@example.com') && !raw.includes('Camille') && !raw.includes('rue de Test'));

    assert.equal((await fetch(`${base}/api/session?id=../../etc/passwd`)).status, 400);
    assert.equal((await fetch(`${base}/api/session`)).status, 400);
    assert.equal((await fetch(`${base}/api/session?id=cs_test_inconnue1234567`)).status, 404);
  });
});

test('site statique : pages, 404, protection contre la traversée de dossiers, en-têtes de sécurité', async () => {
  await withServer(fakeStripe(), async (base) => {
    for (const url of ['/', '/merci', '/cgv', '/mentions-legales', '/products.json', '/favicon.svg', '/assets/kit-noel.webp']) {
      assert.equal((await fetch(base + url)).status, 200, url);
    }
    const missing = await fetch(`${base}/page-inexistante`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /introuvable/i);

    // fetch() normalise les chemins : on passe par un socket brut pour envoyer "/../" tel quel.
    const net = require('node:net');
    const port = new URL(base).port;
    for (const evil of ['/../server.js', '/%2e%2e/server.js', '/..%2fserver.js', '/fonts/../../package.json']) {
      const status = await new Promise((resolve, reject) => {
        const socket = net.connect(port, '127.0.0.1', () => socket.write(`GET ${evil} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
        let data = '';
        socket.on('data', (d) => (data += d));
        socket.on('end', () => resolve(Number(data.split(' ')[1])));
        socket.on('error', reject);
      });
      assert.equal(status, 404, evil);
    }

    const home = await fetch(base + '/');
    assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(home.headers.get('x-frame-options'), 'DENY');
  });
});
