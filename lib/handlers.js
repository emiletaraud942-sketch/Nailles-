'use strict';

const { catalog, getKit, isOpen } = require('./catalog');
const { buildSessionParams } = require('./checkout');
const { sendJson, readJson, getOrigin } = require('./http');

/**
 * Fabrique les deux routes de l'API. `getStripe` est injectable pour les tests.
 */
function createHandlers({ getStripe }) {
  /** POST /api/checkout  { kit, quantity }  ->  { url } (page de paiement Stripe) */
  async function checkout(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Méthode non autorisée.' });
    }

    let body;
    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 400, { error: 'Requête invalide.' });
    }

    const kit = getKit(body && body.kit);
    const quantity = Number(body && body.quantity);
    if (!kit || !kit.available) {
      return sendJson(res, 400, { error: 'Ce kit n’est pas disponible.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > catalog.maxQuantity) {
      return sendJson(res, 400, { error: `La quantité doit être comprise entre 1 et ${catalog.maxQuantity}.` });
    }
    if (!isOpen()) {
      return sendJson(res, 410, { error: 'Les précommandes sont closes.' });
    }

    const stripe = getStripe();
    if (!stripe) {
      console.error('[checkout] STRIPE_SECRET_KEY absente ou invalide (attendu : sk_test_... ou sk_live_...).');
      return sendJson(res, 503, { error: 'Le paiement n’est pas disponible pour le moment.' });
    }

    try {
      const session = await stripe.checkout.sessions.create(
        buildSessionParams({ kit, quantity, origin: getOrigin(req) })
      );
      return sendJson(res, 200, { url: session.url });
    } catch (err) {
      console.error('[checkout] Stripe a refusé la création de session :', err && err.message);
      return sendJson(res, 502, { error: 'Impossible d’ouvrir le paiement. Réessayez dans un instant.' });
    }
  }

  /** GET /api/session?id=cs_...  ->  récapitulatif minimal pour la page de confirmation */
  async function session(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: 'Méthode non autorisée.' });
    }

    const id = new URL(req.url, 'http://localhost').searchParams.get('id') || '';
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) {
      return sendJson(res, 400, { error: 'Identifiant invalide.' });
    }

    const stripe = getStripe();
    if (!stripe) return sendJson(res, 503, { error: 'Indisponible.' });

    try {
      const s = await stripe.checkout.sessions.retrieve(id);
      const kit = getKit(s.metadata && s.metadata.kit);
      // Aucune donnée personnelle n'est renvoyée : ni nom, ni e-mail, ni adresse.
      return sendJson(res, 200, {
        paid: s.payment_status === 'paid',
        kitName: kit ? kit.name : null,
        quantity: Number(s.metadata && s.metadata.quantity) || null,
        amountTotal: s.amount_total,
        currency: s.currency,
      });
    } catch (err) {
      console.error('[session] lecture impossible :', err && err.message);
      return sendJson(res, 404, { error: 'Commande introuvable.' });
    }
  }

  return { checkout, session };
}

module.exports = { createHandlers };
