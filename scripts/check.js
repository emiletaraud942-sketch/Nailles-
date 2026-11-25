'use strict';

// Vérification avant mise en ligne : npm run verifier
try {
  process.loadEnvFile(); // lit .env s'il existe
} catch {
  /* pas de .env */
}
const fs = require('node:fs');
const path = require('node:path');
const { catalog, closesAt } = require('../lib/catalog');

const publicDir = path.join(__dirname, '..', 'public');
const euro = (cents) => (cents / 100).toFixed(2).replace('.', ',') + ' €';
let blocking = 0;

console.log('\nPrix (TTC)');
for (const kit of catalog.kits) console.log(`  ${kit.name} : ${euro(kit.priceCents)}`);
console.log(`  Livraison : ${catalog.shipping.amountCents === 0 ? 'offerte' : euro(catalog.shipping.amountCents)} — pays : ${catalog.shipping.countries.join(', ')}`);

console.log('\nDate limite de précommande');
const limit = closesAt();
if (limit) console.log(`  ${limit.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' })}`);
else console.log('  ⚠ aucune (closesAt est null dans public/products.json) : les commandes resteront ouvertes sans limite.');

console.log('\nChamps à renseigner dans les pages');
for (const file of fs.readdirSync(publicDir).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
  const todos = [...html.matchAll(/<span class="todo" data-todo>(.*?)<\/span>/g)].map((m) => m[1]);
  if (todos.length) {
    blocking += todos.length;
    console.log(`  ${file} : ${todos.length}`);
    for (const t of todos) console.log(`      ${t}`);
  }
}
if (!blocking) console.log('  Aucun.');

console.log('\nStripe');
console.log(`  STRIPE_SECRET_KEY : ${/^(sk|rk)_(test|live)_/.test(process.env.STRIPE_SECRET_KEY || '') ? 'présente' : 'absente (normal ici si elle est configurée sur l’hébergeur)'}`);

console.log(blocking ? `\n⚠ ${blocking} champ(s) à compléter avant de publier.\n` : '\n✓ Rien à compléter.\n');
process.exit(blocking ? 1 : 0);
