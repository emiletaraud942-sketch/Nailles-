'use strict';

let client = null;

/**
 * Client Stripe, créé à la demande.
 * Renvoie null si la clé secrète est absente ou si ce n'est pas une clé secrète
 * (une clé publique pk_... collée par erreur ne fonctionnerait pas côté serveur).
 */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(test|live)_/.test(key)) return null;
  if (!client) {
    const Stripe = require('stripe');
    client = new Stripe(key, { maxNetworkRetries: 2 });
  }
  return client;
}

module.exports = { getStripe };
